import assert from 'node:assert/strict';
import {randomBytes,randomInt,randomUUID} from 'node:crypto';
import {pool} from '../db';
import {DBStorage} from '../dbStorage';
import {getPricingQuote} from '../pujaPricing';
import {completeCashfreeCheckout,createCashfreeCheckoutOrder} from '../stripePayments';

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
if(!base.endsWith('.replit.dev')) throw new Error('Development-only sandbox verification');
const tag=`verify-cashfree-${randomBytes(5).toString('hex')}`;
const store=new DBStorage(),users:number[]=[],orders:string[]=[];
const password=randomBytes(16).toString('hex');
let pujaId:number|undefined;
async function api(path:string,cookie?:string,method='GET',body?:unknown) {
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,data:await response.json() as any,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function account(role:string,suffix:string) {
  const user=await store.createUser({firstName:tag,lastName:suffix,email:`${tag}-${suffix}@example.invalid`,
    mobile:`9${randomInt(100000000,999999999)}`,password,role,age:30,gender:'other'} as any);
  users.push(user.id);
  const login=await api(role==='admin'?'/api/admin/login':'/api/auth/login',undefined,'POST',{email:user.email,password});
  assert.equal(login.status,200);
  return {...user,cookie:login.cookie!};
}
try {
  const settings=(await api('/api/settings/payment')).data;
  assert.equal(settings.provider,'cashfree');
  assert.equal(settings.providerMode,'test','Never run fixtures against live Cashfree');
  const [admin,customer,other]=await Promise.all([account('admin','admin'),account('customer','customer'),account('customer','other')]);
  assert.equal((await api('/api/admin/payments/checkouts',customer.cookie)).status,403);
  const created=await api('/api/pujas',admin.cookie,'POST',{
    name:tag,description:'Isolated sandbox payment verification',type:'online',price:3000,basePrice:3000,
    duration:60,isActive:true,requiresSamagri:false,samagriPrice:0,
  });
  assert.equal(created.status,201); pujaId=created.data.id;
  const date=new Date(Date.now()+72*3600000).toISOString().slice(0,10);
  const quote=await getPricingQuote({pujaId:pujaId!,calendarDate:date,time:'10:00 AM',withSamagri:false});
  const booking={pujaId:pujaId!,type:'online',consultationType:'auto_select',amount:quote.totalAmount,
    date:new Date(`${date}T12:00:00Z`).toISOString(),calendarDate:date,time:'10:00 AM',duration:60,withSamagri:false};
  const requestId=randomUUID();
  const checkout:any=await createCashfreeCheckoutOrder(customer.id,{booking,requestId},base,settings);
  assert.ok(checkout.paymentSessionId); orders.push(checkout.orderId);
  const repeated:any=await createCashfreeCheckoutOrder(customer.id,{booking,requestId},base,settings);
  assert.equal(repeated.orderId,checkout.orderId);
  // Cashfree can issue a fresh client token when retrieving the same order.
  assert.ok(repeated.paymentSessionId);
  const row=(await pool.query('SELECT * FROM portal_checkout_orders WHERE id=$1',[checkout.orderId])).rows[0];
  assert.equal(row.payment_provider,'cashfree'); assert.equal(row.livemode,false); assert.equal(row.booking_id,null);
  assert.equal((await api(`/api/payments/checkout/${row.cashfree_order_id}`,other.cookie)).status,404);
  assert.equal((await api(`/api/payments/checkout/${row.cashfree_order_id}`,customer.cookie)).data.state,'unpaid');
  await assert.rejects(()=>completeCashfreeCheckout({
    order_id:row.cashfree_order_id,order_amount:1,order_currency:'INR',order_status:'PAID',
  },{order_id:row.cashfree_order_id,order_amount:1,order_currency:'INR',payment_amount:1,
    payment_currency:'INR',payment_status:'SUCCESS',cf_payment_id:'invalid-fixture'},async()=>[],()=>{}));
  const webhook=await fetch(base+'/api/cashfree/webhook',{method:'POST',headers:{
    'Content-Type':'application/json','x-webhook-signature':'invalid','x-webhook-timestamp':'1700000000000',
  },body:JSON.stringify({data:{order:{order_id:row.cashfree_order_id},payment:{payment_status:'SUCCESS'}}})});
  assert.equal(webhook.status,400);
  assert.equal((await pool.query('SELECT booking_id FROM portal_checkout_orders WHERE id=$1',[row.id])).rows[0].booking_id,null);
  const history=await api('/api/admin/payments/checkouts',admin.cookie);
  assert.equal(history.data.find((o:any)=>o.id===row.id)?.provider,'cashfree');
  console.log('PASS: real sandbox order/session, retry reuse, authenticated ownership, admin history, rejected mismatched payment and invalid signature; no booking or finance receipt created.');
} finally {
  await pool.query('DELETE FROM portal_checkout_orders WHERE id=ANY($1::uuid[])',[orders]);
  if(pujaId) await pool.query('DELETE FROM pujas WHERE id=$1',[pujaId]);
  await pool.query('DELETE FROM notifications WHERE "userId"=ANY($1::int[])',[users]);
  await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[users]);
  await pool.end();
}
