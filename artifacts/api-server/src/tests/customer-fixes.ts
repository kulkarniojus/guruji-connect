import assert from 'node:assert/strict';
import { randomBytes,randomInt } from 'node:crypto';
import { pool } from '../db';
import { DBStorage } from '../dbStorage';
import { customerBookingBalance } from '../customerBalance';
import { verifyCustomerFixesBrowser } from './customer-fixes-browser';

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
if(!new URL(base).hostname.endsWith('.replit.dev'))throw new Error('Development fixtures only');
const store=new DBStorage(),tag=`verify-fixes-${randomBytes(5).toString('hex')}`;
const password=randomBytes(18).toString('hex'),users:number[]=[],bookings:number[]=[],profiles:number[]=[];
let pujaId:number|undefined;
async function api(path:string,cookie?:string,method='GET',body?:any) {
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await response.text();let data:any;try{data=JSON.parse(text);}catch{data=text;}
  return{status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function account(role:string,suffix:string,mobile?:string) {
  const user=await store.createUser({firstName:tag,lastName:suffix,email:`${tag}-${suffix}@example.invalid`,
    mobile:mobile||`9${randomInt(100000000,999999999)}`,password,role,age:30,gender:'other'}as any);
  users.push(user.id);
  const login=await api(role==='admin'?'/api/admin/login':'/api/auth/login',undefined,'POST',{email:user.email,password});
  assert.equal(login.status,200,JSON.stringify(login.data));return{...user,cookie:login.cookie!};
}
const future=new Date(Date.now()+48*3600000).toISOString().slice(0,10);
async function booking(customerId:number,gurujiId?:number) {
  const record=await store.createBooking({customerId,gurujiId,pujaId,type:'offline',amount:3000,
    date:new Date(`${future}T12:00:00Z`),time:'10:00 AM',duration:60,city:tag,address:'Verification only',
    pincode:'900222',status:'confirmed',withSamagri:false}as any);
  bookings.push(record.id);
  await pool.query(`UPDATE bookings SET status='confirmed' WHERE id=$1`,[record.id]);
  return record.id;
}
try {
  const receipt=(amount:number,voided_at:any=null)=>({amount,voided_at});
  const raw={totalAmount:3000,status:'confirmed'};
  assert.equal(customerBookingBalance(raw,[],[]).additionalPaymentDue,3000);
  assert.equal(customerBookingBalance(raw,[receipt(100),receipt(900,'voided')],[]).recordedPaid,100);
  const cancelled={...raw,status:'cancelled',cancelled_by:'customer',cancellation_charge:600};
  assert.equal(customerBookingBalance(cancelled,[receipt(1000)],[]).refundOwed,400);
  assert.equal(customerBookingBalance(cancelled,[],[]).refundOwed,0);
  assert.equal(customerBookingBalance(cancelled,[],[]).additionalPaymentDue,0);
  assert.equal(customerBookingBalance({...cancelled,cancellation_charge:6000},[receipt(1000)],[]).refundOwed,0);
  assert.equal(customerBookingBalance(cancelled,[receipt(1000)],[{type:'refund',amount:400}]).refundOwed,0);
  assert.equal(customerBookingBalance(raw,[receipt(0.1),receipt(0.2)],[{type:'additional_charge',amount:100},{type:'credit',amount:50}]).additionalPaymentDue,3049.7);
  console.log('PASS: paise arithmetic, actual-payment-only refund liabilities, capped policy retention, credits and voided receipt handling');

  const admin=await account('admin','admin'),customer=await account('customer','customer');
  const digits=`9${randomInt(100000000,999999999)}`;
  const guruji=await account('guruji','guruji',`+91 ${digits.slice(0,5)} ${digits.slice(5)}`);
  const puja=await api('/api/pujas',admin.cookie,'POST',{name:tag,description:tag,type:'offline',duration:60,
    basePrice:3000,price:3000,isActive:true});
  assert.equal(puja.status,201,JSON.stringify(puja.data));pujaId=puja.data.id;
  const rule=await api('/api/admin/cancellation-rules',admin.cookie,'POST',{userType:'customer',name:tag,
    hoursThreshold:120,timeBasis:'within',chargeType:'percentage',chargeValue:20,isActive:true,pujaId});
  assert.equal(rule.status,201,JSON.stringify(rule.data));
  const booked=await booking(customer.id);
  const activity=()=>api(`/api/admin/customers/${customer.id}/activity`,admin.cookie);
  const finance=(bookingId:number,type:string,amount:number,reference:string)=>
    api(`/api/admin/customers/${customer.id}/finance`,admin.cookie,'POST',
      {bookingId,type,amount,reference,reason:'Isolated verification record',paidBy:'portal'});
  assert.equal((await finance(booked,'payment',1000,'payment-one')).status,201);
  const preview=await api(`/api/bookings/${booked}/cancellation-preview`,customer.cookie);
  assert.equal(preview.status,200);assert.equal(preview.data.charge,600);
  assert.equal(preview.data.customerFunds.refundOwed,400);
  assert.equal((await finance(booked,'payment',100,'payment-two')).status,201);
  assert.equal((await api(`/api/bookings/${booked}/cancel`,customer.cookie,'POST',{reason:'Verification cancellation',quoteToken:preview.data.quoteToken})).status,409);
  const fresh=await api(`/api/bookings/${booked}/cancellation-preview`,customer.cookie);
  const cancelledResults=await Promise.all([1,2].map(()=>api(`/api/bookings/${booked}/cancel`,customer.cookie,'POST',
    {reason:'Verification cancellation',quoteToken:fresh.data.quoteToken})));
  assert.deepEqual(cancelledResults.map(r=>r.status).sort(),[200,409]);
  assert.equal((await pool.query('SELECT status FROM bookings WHERE id=$1',[booked])).rows[0].status,'cancelled');
  assert.equal((await pool.query(`SELECT count(*)::int AS n FROM booking_cancellation_events
    WHERE booking_id=$1 AND kind='customer_cancel' AND status='recorded'`,[booked])).rows[0].n,1);
  let report=await activity();assert.equal(report.status,200,JSON.stringify(report.data));
  assert.equal(report.data.summary.cancelledCount,1);assert.equal(report.data.summary.refundOwed,500);
  const refundResults=await Promise.all(['refund-one','refund-two'].map(ref=>finance(booked,'refund',500,ref)));
  assert.deepEqual(refundResults.map(r=>r.status).sort(),[201,409]);
  report=await activity();assert.equal(report.data.summary.refundOwed,0);assert.equal(report.data.summary.refunded,500);
  assert.equal((await finance(booked,'refund',1,'over-refund')).status,409);
  assert.equal((await finance(booked,'payment',1,'closed-payment')).status,409);
  assert.equal((await api(`/api/admin/customers/${customer.id}/activity`,customer.cookie)).status,403);
  assert.equal((await api(`/api/admin/customers/${customer.id}/finance`,customer.cookie,'POST',{})).status,403);
  const active=await booking(customer.id);
  assert.equal((await finance(active,'additional_charge',100,'extra')).status,201);
  assert.equal((await finance(active,'credit',50,'credit')).status,201);
  assert.equal((await finance(active,'payment',200,'advance')).status,201);
  report=await activity();
  assert.equal(report.data.bookings.find((b:any)=>b.id===active).additionalPaymentDue,2850);
  const unpaid=await booking(customer.id);
  const unpaidQuote=await api(`/api/bookings/${unpaid}/cancellation-preview`,customer.cookie);
  assert.equal(unpaidQuote.data.customerFunds.refundOwed,0);
  assert.equal((await api(`/api/bookings/${unpaid}/cancel`,customer.cookie,'POST',
    {reason:'Unpaid verification cancellation',quoteToken:unpaidQuote.data.quoteToken})).status,200);
  console.log('PASS API: direct cancellation, concurrent duplicate cancellation/refund safety, changed-payment quote rejection, manual refunds, extra charges/credits and admin-only reports');

  const ownNotif=(await pool.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
    VALUES($1,$3,$3,'message',false,NOW()),($2,$3,$3,'message',false,NOW()) RETURNING id,"userId"`,
    [customer.id,guruji.id,tag])).rows;
  assert.equal((await api('/api/notifications/read-all',customer.cookie,'PUT')).status,200);
  assert((await api('/api/notifications',customer.cookie)).data.every((n:any)=>n.isRead));
  const otherNotification=ownNotif.find(n=>n.userId===guruji.id).id;
  assert.equal((await api(`/api/notifications/${otherNotification}/read`,customer.cookie,'PUT')).status,404);
  assert.equal((await pool.query('SELECT "isRead" FROM notifications WHERE id=$1',[otherNotification])).rows[0].isRead,false);
  assert.equal((await api('/api/bookings',guruji.cookie,'POST',{})).status,403);
  assert.equal((await api('/api/auth/register',undefined,'POST',{firstName:tag,lastName:'Duplicate',email:`${tag}-duplicate@example.invalid`,
    mobile:digits,password,role:'customer',age:30,gender:'other'})).status,409);
  await pool.query('UPDATE pujas SET "isActive"=false WHERE id=$1',[pujaId]);
  assert(!(await api('/api/pujas')).data.some((p:any)=>p.id===pujaId));
  assert((await api('/api/pujas?includeInactive=true',admin.cookie)).data.some((p:any)=>p.id===pujaId&&!p.isActive));
  assert.equal((await api(`/api/pujas/${pujaId}`)).status,404);
  assert.equal((await api('/api/pujas?includeInactive=true',customer.cookie)).status,403);
  assert.equal((await api('/api/bookings',customer.cookie,'POST',{pujaId,type:'online',amount:3000,time:'10:00 AM',date:future})).status,409);
  await pool.query('UPDATE pujas SET "isActive"=true WHERE id=$1',[pujaId]);
  const adminBookings=await api('/api/admin/bookings',admin.cookie);
  const detailed=adminBookings.data.find((b:any)=>b.id===active);
  assert(detailed.createdAt && detailed.date);assert.equal(detailed.time,'10:00 AM');
  console.log('PASS API: scoped notification read-all, Guruji booking denial, normalized Guruji phone duplicate protection, inactive puja hiding/booking rejection and booking timestamp fields');

  const profile=(await pool.query(`INSERT INTO guruji_profiles("userId",city,pincode,experience,"pricePerHour",
    "isVerified","isAvailable","createdAt","updatedAt",status,specialities,aadhar_verified,documents_verified)
    VALUES($1,$2,'900222',1,100,true,true,NOW(),NOW(),'approved',$3,true,true) RETURNING id`,
    [guruji.id,tag,[tag]])).rows[0];
  profiles.push(profile.id);
  const withdrawalBooking=await booking(customer.id,profile.id);
  await pool.query(`INSERT INTO booking_requests("bookingId","gurujiId",status,"createdAt","updatedAt")
    VALUES($1,$2,'accepted',NOW(),NOW())`,[withdrawalBooking,profile.id]);
  const withdrawalQuote=await api(`/api/bookings/${withdrawalBooking}/cancellation-preview`,guruji.cookie);
  assert.equal(withdrawalQuote.status,200);
  assert.equal((await api(`/api/bookings/${withdrawalBooking}/cancel`,guruji.cookie,'POST',
    {reason:'Verification Guruji withdrawal',quoteToken:withdrawalQuote.data.quoteToken})).status,200);
  const withdrawn=(await pool.query('SELECT status,"gurujiId" FROM bookings WHERE id=$1',[withdrawalBooking])).rows[0];
  assert.equal(withdrawn.gurujiId,null);assert(['pending','pending_approval'].includes(withdrawn.status));
  console.log('PASS regression: Guruji withdrawal still releases assignment and reopens matching without closing the booking');

  const uiCancellationBookingId=await booking(customer.id);
  assert.equal((await finance(uiCancellationBookingId,'payment',1000,'ui-original-payment')).status,201);
  // Leave one active fixture for reminder and admin activity browser verification.
  await pool.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt") VALUES($1,$2,$2,'message',false,NOW())`,
    [customer.id,tag]);
  await verifyCustomerFixesBrowser({base,customerCookie:customer.cookie,adminCookie:admin.cookie,gurujiCookie:guruji.cookie,
    customerId:customer.id,pujaId:pujaId!,tag,uiCancellationBookingId});
} finally {
  if(bookings.length) {
    for(const id of bookings) await pool.query('DELETE FROM notifications WHERE message LIKE $1',[`Booking #${id}: %`]);
    await pool.query('DELETE FROM customer_finance_entries WHERE booking_id=ANY($1)',[bookings]);
    await pool.query('DELETE FROM guruji_finance_receipts WHERE booking_id=ANY($1)',[bookings]);
    await pool.query('DELETE FROM booking_completion_challenges WHERE booking_id=ANY($1)',[bookings]);
    await pool.query('DELETE FROM booking_cancellation_events WHERE booking_id=ANY($1)',[bookings]);
    await pool.query('DELETE FROM booking_requests WHERE "bookingId"=ANY($1)',[bookings]);
    await pool.query('DELETE FROM bookings WHERE id=ANY($1)',[bookings]);
  }
  await pool.query('DELETE FROM cancellation_rules WHERE name=$1',[tag]);
  if(profiles.length) {
    await pool.query('DELETE FROM guruji_finance_recognitions WHERE guruji_id=ANY($1)',[profiles]);
    await pool.query('DELETE FROM guruji_finance_ledger WHERE guruji_id=ANY($1)',[profiles]);
    await pool.query('DELETE FROM guruji_profiles WHERE id=ANY($1)',[profiles]);
  }
  if(pujaId)await pool.query('DELETE FROM pujas WHERE id=$1',[pujaId]);
  if(users.length) {
    await pool.query('DELETE FROM notifications WHERE "userId"=ANY($1)',[users]);
    await pool.query(`DELETE FROM user_sessions WHERE (sess->>'userId')::int=ANY($1)`,[users]);
    await pool.query('DELETE FROM users WHERE id=ANY($1)',[users]);
  }
  await pool.end();
  console.log('Isolated verification fixtures removed.');
}
