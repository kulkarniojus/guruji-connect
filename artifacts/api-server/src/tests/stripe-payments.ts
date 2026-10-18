import assert from 'node:assert/strict';
import {randomUUID,randomBytes,randomInt} from 'node:crypto';
import {pool} from '../db';
import {DBStorage} from '../dbStorage';
import {getPricingQuote} from '../pujaPricing';
import {getBookingCommission} from '../pujaCommission';
import {getUncachableStripeClient} from '../stripeClient';
import {advancePaise,assertPaidSession,completeCheckout,createCheckoutOrder} from '../stripePayments';
import {initializePaymentStorage} from '../stripePayments';
import {customerBookingBalance} from '../customerBalance';
import {browserClient} from './browser-client';

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
if(!base.endsWith('.replit.dev'))throw new Error('Development fixtures only');
const tag=`verify-stripe-${randomBytes(5).toString('hex')}`,store=new DBStorage();
const users:number[]=[],bookings:number[]=[],orders:string[]=[];
let pujaId:number|undefined,profileId:number|undefined,realSessionId:string|undefined;
const password=randomBytes(16).toString('hex');
async function api(path:string,cookie?:string,method='GET',body?:unknown) {
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,data:await response.json() as any,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function account(role:string,suffix:string) {
  const user=await store.createUser({firstName:tag,lastName:suffix,email:`${tag}-${suffix}@example.invalid`,
    mobile:`9${randomInt(100000000,999999999)}`,password,role,age:30,gender:'other'} as any);
  users.push(user.id);
  const result=await api(role==='admin'?'/api/admin/login':'/api/auth/login',undefined,'POST',{email:user.email,password});
  assert.equal(result.status,200);return {...user,cookie:result.cookie!};
}
try {
  await initializePaymentStorage();
  assert.equal(advancePaise(3000,25),75000);
  assert.equal(advancePaise(1234.57,22.5),27778);
  const stripe=await getUncachableStripeClient();
  assert.equal((await stripe.balance.retrieve()).livemode,false,'Never run sandbox verification with a live key');
  const settings=(await api('/api/settings/payment')).data;
  assert.equal(settings.paymentRequired,false,'Do not run fixtures while customer payments are enabled');
  assert.equal(settings.checkoutAvailable,true);
  assert.equal((await api('/api/payments/checkout',undefined,'POST',{})).status,401);
  assert.equal((await api('/api/admin/payments/checkouts')).status,401);
  const [admin,customer,other,guruji]=await Promise.all([
    account('admin','admin'),account('customer','customer'),account('customer','other'),account('guruji','guruji'),
  ]);
  assert.equal((await api('/api/admin/payments/checkouts',customer.cookie)).status,403);
  const created=await api('/api/pujas',admin.cookie,'POST',{
    name:tag,description:'Isolated payment verification fixture',type:'online',price:3000,basePrice:3000,
    duration:60,isActive:true,requiresSamagri:false,samagriPrice:0,
  });
  assert.equal(created.status,201,JSON.stringify(created.data));pujaId=created.data.id;
  const profile=await store.createGurujiProfile({
    userId:guruji.id,bio:tag,city:tag,address:tag,state:'Maharashtra',pincode:'411001',experience:5,
    pricePerHour:500,languages:['Hindi'],specialization:tag,isVerified:true,isAvailable:true,
    aadharVerified:true,documentsVerified:true,status:'approved',isOnline:true,isOffline:true,
  } as any);profileId=profile.id;
  const date=new Date(Date.now()+72*3600000).toISOString().slice(0,10);
  const quote=await getPricingQuote({pujaId:pujaId!,calendarDate:date,time:'10:00 AM',withSamagri:false});
  const payload={pujaId:pujaId!,type:'online',consultationType:'own_guruji',amount:quote.totalAmount,
    date:new Date(`${date}T12:00:00Z`).toISOString(),calendarDate:date,time:'10:00 AM',duration:60,
    withSamagri:false,gurujiId:profileId};
  assert.equal((await api('/api/payments/checkout',guruji.cookie,'POST',{})).status,403);
  assert.equal((await api('/api/payments/checkout',customer.cookie,'POST',{booking:payload,requestId:randomUUID()})).status,409);
  assert.equal((await api('/api/admin/settings/payment',admin.cookie,'PUT',{...settings,advancePercentage:101})).status,400);
  // Isolated lower-level sandbox checkout: the real customer switch stays OFF.
  const requestId=randomUUID();
  const checkout=await createCheckoutOrder(customer.id,{booking:payload,requestId},base,{...settings,paymentRequired:true});
  assert.ok(checkout.checkoutUrl);orders.push(checkout.orderId);
  const actual=(await pool.query('SELECT * FROM portal_checkout_orders WHERE id=$1',[checkout.orderId])).rows[0];
  realSessionId=actual.stripe_session_id;
  const actualSession=await stripe.checkout.sessions.retrieve(realSessionId!);
  assert.equal(actualSession.amount_total,Math.round(quote.totalAmount*25));
  assert.equal(actualSession.currency,'inr');assert.equal(actualSession.livemode,false);
  const repeated=await createCheckoutOrder(customer.id,{booking:payload,requestId},base,{...settings,paymentRequired:true});
  assert.equal(repeated.orderId,checkout.orderId,'Retry must reuse one Checkout Session');
  assert.equal((await api(`/api/payments/checkout/${realSessionId}`,other.cookie)).status,404);
  assert.equal((await api(`/api/payments/checkout/${realSessionId}`,customer.cookie)).data.state,'unpaid');
  assert.equal((await pool.query('SELECT booking_id FROM portal_checkout_orders WHERE id=$1',orders.slice(0,1))).rows[0].booking_id,null);
  // Test the actual atomic booking/finance operation with isolated synthetic
  // trusted-provider input. This does NOT claim a real/live charge was run.
  const id=randomUUID(),sessionId=`cs_test_${randomUUID()}`,intent=`pi_verify_${randomUUID()}`;
  orders.push(id);
  await pool.query(`INSERT INTO portal_checkout_orders(id,customer_id,request_id,booking_payload,pricing_snapshot,
    commission_snapshot,advance_percentage,advance_paise,livemode,stripe_session_id,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,25,$7,true,$8,NOW()+INTERVAL '35 minutes')`,
    [id,customer.id,randomUUID(),payload,quote,await getBookingCommission(pujaId!,quote.totalAmount),
      advancePaise(quote.totalAmount,25),sessionId]);
  const order=(await pool.query('SELECT * FROM portal_checkout_orders WHERE id=$1',[id])).rows[0];
  const paid:any={id:sessionId,client_reference_id:id,metadata:{sg_order_id:id,sg_customer_id:String(customer.id)},
    currency:'inr',amount_total:order.advance_paise,livemode:true,payment_status:'paid',payment_intent:intent};
  assert.throws(()=>assertPaidSession({...paid,amount_total:1},order));
  assert.throws(()=>assertPaidSession({...paid,payment_status:'unpaid'},order));
  assert.throws(()=>assertPaidSession({...paid,metadata:{...paid.metadata,sg_customer_id:String(other.id)}},order));
  const completed=await completeCheckout(paid,async()=>[],()=>{});
  assert.ok(completed);bookings.push(completed.id);
  assert.equal(completed.status,'pending_approval','Payment never means Guruji acceptance');
  assert.equal(completed.gurujiId,profileId);
  const again=await completeCheckout(paid,async()=>[],()=>{});
  assert.equal(again.id,completed.id);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM guruji_finance_receipts WHERE booking_id=$1',[completed.id])).rows[0].n,1);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM payments WHERE "bookingId"=$1',[completed.id])).rows[0].n,1);
  assert.equal((await store.getBookingRequestsByBookingId(completed.id)).length,1);
  const receipts=(await pool.query('SELECT * FROM guruji_finance_receipts WHERE booking_id=$1',[completed.id])).rows;
  const balance=customerBookingBalance(completed,receipts,[]);
  assert.equal(balance.additionalPaymentDue,quote.totalAmount*0.75);
  const badWebhook=await fetch(base+'/api/stripe/webhook',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':'t=1,v1=invalid'},body:'{}'});
  assert.equal(badWebhook.status,400);
  // Verify signed-in admin and customer UI at both desktop and phone sizes.
  const browser=await browserClient();
  try {
    await browser.command('Network.enable');
    const [name,value]=admin.cookie.split('=');
    await browser.command('Network.setCookie',{name,value,url:base,httpOnly:true,secure:true});
    await browser.command('Page.navigate',{url:base+'/admin-dashboard'});
    await browser.wait(`document.body?.innerText.includes('Payment')`,'admin dashboard');
    await browser.click('[role="tab"]','Payment');
    await browser.wait(`document.body?.innerText.includes('Customer advance')`,'Stripe admin configuration');
    assert.ok(await browser.evaluate(`document.body.innerText.includes('Stripe checkout attempts')`));
    assert.ok(await browser.evaluate(`document.body.innerText.includes('TEST mode only')`));
    await browser.command('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:1,mobile:true});
    assert.ok(await browser.evaluate(`document.body.innerText.includes('Stripe checkout attempts')`));
    // Checkout itself must render as the real hosted provider, not a fake UI.
    const [customerCookieName,customerCookieValue]=customer.cookie.split('=');
    await browser.command('Network.setCookie',{name:customerCookieName,value:customerCookieValue,url:base,httpOnly:true,secure:true});
    await browser.command('Page.navigate',{url:checkout.checkoutUrl});
    await browser.wait(`document.body?.innerText.includes('Test mode')||document.body?.innerText.includes('test mode')||!!document.querySelector('input')`,'hosted Stripe checkout');
    assert.ok(await browser.evaluate(`document.body.innerText.includes('₹750.00')`));
    console.log('Real hosted Stripe sandbox checkout rendered the configured ₹750 advance.');
    if(process.env.SG_TEST_CARD_COMPLETE==='1') {
      await browser.fill('#email','portal-verification@example.com');
      await browser.fill('#cardNumber','4242424242424242');
      await browser.fill('#cardExpiry','1230');
      await browser.fill('#cardCvc','123');
      await browser.fill('#billingName','Portal Verification');
      await browser.evaluate(`(()=>{const select=document.querySelector('select[name="billingCountry"]');if(select){select.value='IN';select.dispatchEvent(new Event('change',{bubbles:true}));}return true;})()`);
      if(await browser.evaluate(`!!document.querySelector('#billingPostalCode')?.getClientRects().length`))
        await browser.fill('#billingPostalCode','411001');
      await browser.click('button[type="submit"]');
      await browser.wait(`location.pathname==='/payment-return'`,'Stripe payment return');
      await browser.wait(`document.body?.innerText.includes('Test checkout completed')`,'verified sandbox booking');
      const verified=await stripe.checkout.sessions.retrieve(realSessionId!);
      assert.equal(verified.payment_status,'paid');
      const saved=(await pool.query('SELECT * FROM portal_checkout_orders WHERE id=$1',[checkout.orderId])).rows[0];
      assert.ok(saved.booking_id);bookings.push(saved.booking_id);
      assert.equal((await store.getBooking(saved.booking_id))!.status,'pending_approval');
      assert.equal((await pool.query('SELECT COUNT(*)::int n FROM guruji_finance_receipts WHERE booking_id=$1',[saved.booking_id])).rows[0].n,0);
      assert.equal((await api(`/api/payments/checkout/${realSessionId}`,customer.cookie)).data.bookingId,saved.booking_id);
      assert.equal((await store.getBookingRequestsByBookingId(saved.booking_id)).length,1);
      console.log('PASS: actual Stripe sandbox card checkout → verified portal return → one pending Guruji request; no real-money receipt posted.');
    }
  } finally { await browser.close(); }
  console.log('PASS: Stripe test Checkout creation/retry, ownership/auth, off-switch protection, invalid signature, amount verification, one booking/receipt/request on replay, pending acceptance, actual advance/balance accounting, admin desktop/phone UI.');
} catch(error) { console.error('Stripe verification failure:',error);throw error; } finally {
  // Expire only this test's open Stripe Session; never cancel customer payments.
  if(realSessionId) {
    const stripe=await getUncachableStripeClient();
    const session=await stripe.checkout.sessions.retrieve(realSessionId);
    if(session.status==='open')await stripe.checkout.sessions.expire(realSessionId);
  }
  const ownedBookings=(await pool.query('SELECT booking_id FROM portal_checkout_orders WHERE id=ANY($1::uuid[]) AND booking_id IS NOT NULL',[orders])).rows.map(r=>r.booking_id);
  const allBookings=[...new Set([...bookings,...ownedBookings])];
  await pool.query('DELETE FROM portal_checkout_orders WHERE id=ANY($1::uuid[])',[orders]);
  await pool.query('DELETE FROM payments WHERE "bookingId"=ANY($1::int[])',[allBookings]);
  for(const table of ['guruji_finance_receipts','customer_finance_entries'])
    await pool.query(`DELETE FROM ${table} WHERE booking_id=ANY($1::int[])`,[allBookings]);
  await pool.query('DELETE FROM booking_requests WHERE "bookingId"=ANY($1::int[])',[allBookings]);
  await pool.query('DELETE FROM notifications WHERE "userId"=ANY($1::int[])',[users]);
  await pool.query('DELETE FROM bookings WHERE id=ANY($1::int[])',[allBookings]);
  if(profileId)await pool.query('DELETE FROM guruji_profiles WHERE id=$1',[profileId]);
  if(pujaId) {
    const stripe=await getUncachableStripeClient();
    for await(const product of stripe.products.list({active:true,limit:100})) {
      if(product.metadata.sg_puja_id===String(pujaId))await stripe.products.update(product.id,{active:false});
    }
    await pool.query('DELETE FROM pujas WHERE id=$1',[pujaId]);
  }
  await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[users]);
  await pool.end();
}
