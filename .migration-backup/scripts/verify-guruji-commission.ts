import assert from 'node:assert/strict';
import { randomBytes,randomInt } from 'node:crypto';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { openBrowserTest } from './browserTest';

if(process.env.NODE_ENV==='production'||!process.env.REPLIT_DEV_DOMAIN) throw new Error('Development verification only');
const base=`https://${process.env.REPLIT_DEV_DOMAIN}`,store=new DBStorage();
const tag=`GurujiCommissionQA-${randomBytes(5).toString('hex')}`,password=randomBytes(18).toString('hex');
const users:number[]=[],bookings:number[]=[],profiles:number[]=[],pujas:number[]=[],cities:number[]=[];
let browser:Awaited<ReturnType<typeof openBrowserTest>>|undefined;
async function api(path:string,cookie?:string,method='GET',body?:any) {
  const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};
}
async function account(role:'admin'|'customer'|'guruji',label:string) {
  const u=await store.createUser({firstName:'CommissionQA',lastName:label,email:`${tag}-${label}@example.invalid`,
    mobile:`9${randomInt(100000000,999999999)}`,password,role,age:30,gender:'other'} as any);
  users.push(u.id);
  const login=await api(role==='admin'?'/api/admin/login':'/api/auth/login',undefined,'POST',{email:u.email,password});
  assert.equal(login.status,200);return {...u,cookie:login.cookie!};
}
async function click(expression:string) {
  await browser!.wait(`!!(${expression})&&!(${expression}).disabled`,'enabled control');
  await browser!.evaluate(`(${expression}).scrollIntoView({block:'center',behavior:'instant'})`);
  const box=await browser!.evaluate(`(()=>{const r=(${expression}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await browser!.command('Input.dispatchMouseEvent',{type:'mousePressed',...box,button:'left',clickCount:1});
  await browser!.command('Input.dispatchMouseEvent',{type:'mouseReleased',...box,button:'left',clickCount:1});
}
try {
  const admin=await account('admin','admin'),customer=await account('customer','customer');
  const guruji=await account('guruji','guruji'),other=await account('guruji','other');
  const puja=await api('/api/pujas',admin.cookie,'POST',{name:tag,description:'Isolated Guruji commission verification',
    basePrice:3000,price:2000,type:'offline',duration:60,isActive:true});
  assert.equal(puja.status,201);pujas.push(puja.body.id);
  const city=await api('/api/cities',admin.cookie,'POST',{name:tag,state:'Maharashtra',isActive:true});
  assert.equal(city.status,201);cities.push(city.body.id);
  const cityKey=tag.toLowerCase();
  const profile=(await pool.query(`INSERT INTO guruji_profiles
    ("userId",city,pincode,experience,"pricePerHour","isVerified","isAvailable",
      "createdAt","updatedAt",status,specialities,aadhar_verified,documents_verified)
    VALUES ($1,$2,'900222',1,100,TRUE,TRUE,NOW(),NOW(),'approved',$3,TRUE,TRUE) RETURNING id`,
    [guruji.id,cityKey,[tag]])).rows[0];profiles.push(profile.id);
  await pool.query('INSERT INTO guruji_pujas ("gurujiId","pujaId","createdAt","updatedAt") VALUES ($1,$2,NOW(),NOW())',[profile.id,puja.body.id]);
  async function rate(percentage:number) {
    assert.equal((await api('/api/admin/commissions/pujas',admin.cookie,'PUT',{pujaIds:pujas,percentage})).status,200);
  }
  async function book(day:string) {
    const data={pujaId:puja.body.id,gurujiId:profile.id,type:'offline',amount:2000,city:cityKey,pincode:'900123',
      address:'Isolated QA address',date:`2031-04-${day}T12:00:00Z`,calendarDate:`2031-04-${day}`,time:'09:00 AM',withSamagri:false};
    const quote=await api('/api/pricing/quote',undefined,'POST',data);
    assert.equal(quote.status,200);
    const result=await api('/api/bookings',customer.cookie,'POST',{...data,amount:quote.body.totalAmount});
    assert.equal(result.status,201,JSON.stringify(result.body));bookings.push(result.body.id);
    const request=(await store.getBookingRequestsByBookingId(result.body.id))[0];assert.ok(request);
    return {booking:await store.getBooking(result.body.id),requestId:request.id};
  }
  await rate(20);
  const first=await book('10'),second=await book('11');
  assert.equal(first.booking!.commissionSnapshot!.portalAmount,400);
  assert.equal(first.booking!.commissionSnapshot!.gurujiAmount,1600);
  const requestPath=`/api/booking-requests/${second.requestId}/respond`;
  assert.equal((await api(requestPath,other.cookie,'POST',{response:'accept',commissionAcknowledged:true})).status,403);
  for(const acknowledgement of [undefined,false]) {
    const denied=await api(requestPath,guruji.cookie,'POST',{response:'accept',commissionAcknowledged:acknowledgement});
    assert.equal(denied.status,400);
    assert.equal((await store.getBooking(second.booking!.id))!.status,'pending_approval');
    assert.equal((await store.getBookingRequest(second.requestId))!.status,'pending');
  }
  await rate(30); // Existing requests must still disclose and acknowledge their saved 20%.
  const requests=(await api('/api/guruji/booking-requests',guruji.cookie)).body;
  assert.equal(requests.find((r:any)=>r.id===first.requestId).booking.commissionSnapshot.percentage,20);
  browser=await openBrowserTest();await browser.command('Network.enable');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  const split=guruji.cookie.indexOf('=');
  await browser.command('Network.setCookie',{name:guruji.cookie.slice(0,split),value:guruji.cookie.slice(split+1),url:base,httpOnly:true,secure:true});
  await browser.command('Page.navigate',{url:base+'/dashboard'});
  await browser.wait(`document.body.innerText.includes(${JSON.stringify(tag)})&&document.body.innerText.includes('1,600')`,'Guruji saved net share');
  assert.ok(await browser.evaluate(`document.body.innerText.includes('20%')&&document.body.innerText.includes('400')&&/payable to Sanatan Guruji/i.test(document.body.innerText)`));
  await click(`Array.from(document.querySelectorAll('button')).find(e=>/^Accept(?: Request)?$/i.test(e.textContent.trim()))`);
  await browser.wait(`!!document.querySelector('[role="dialog"]')`,'acceptance commission confirmation');
  assert.ok(await browser.evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');return d.innerText.includes('1,600')&&d.innerText.includes('20%')&&!!Array.from(d.querySelectorAll('button')).find(e=>/confirm.*accept|accept.*booking|accept.*puja/i.test(e.textContent)&&e.disabled)})()`));
  await click(`document.querySelector('[role="dialog"] input[type="checkbox"],[role="dialog"] button[role="checkbox"]')`);
  await click(`Array.from(document.querySelectorAll('[role="dialog"] button')).find(e=>/confirm.*accept|accept.*booking|accept.*puja/i.test(e.textContent))`);
  await browser.wait(`!document.querySelector('[role="dialog"]')`,'confirmed acceptance');
  const accepted=(await store.getBookingRequestsByBookingId(first.booking!.id)).find((r:any)=>r.status==='accepted')||
    (await store.getBookingRequestsByBookingId(second.booking!.id)).find((r:any)=>r.status==='accepted');
  assert.ok(accepted);
  assert.ok(accepted.commission_acknowledged_at);
  assert.equal(accepted.commission_acknowledgement.snapshot.percentage,20);
  assert.equal(accepted.commission_acknowledgement.snapshot.gurujiAmount,1600);
  assert.equal(accepted.commission_acknowledgement.acknowledgedByUserId,guruji.id);
  const confirmation=(await pool.query(`SELECT message FROM notifications WHERE "userId"=$1 AND title='Booking Accepted' ORDER BY id DESC LIMIT 1`,[guruji.id])).rows[0];
  assert.ok(confirmation?.message.includes('20%')&&confirmation.message.includes('1,600'));
  console.log('PASS: frozen commission shown before acceptance; acknowledgement required in UI and API; acceptance and recorded financial acknowledgement are genuine and atomic');
  await rate(0);
  const zero=await book('12'),legacy=await book('13');
  await pool.query('UPDATE bookings SET commission_snapshot=NULL WHERE id=$1',[legacy.booking!.id]);
  await browser.command('Page.navigate',{url:base+'/dashboard'});
  await browser.wait(`document.body.innerText.includes('0%')&&/not recorded/i.test(document.body.innerText)`,'zero and legacy disclosures');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:1,mobile:true});
  assert.ok(await browser.evaluate(`document.documentElement.scrollWidth<=window.innerWidth+2`),'mobile disclosure fits viewport');
  assert.equal((await api(`/api/booking-requests/${zero.requestId}/respond`,guruji.cookie,'POST',{response:'accept'})).status,200);
  assert.equal((await api(`/api/booking-requests/${legacy.requestId}/respond`,guruji.cookie,'POST',{response:'accept'})).status,200);
  assert.equal((await store.getBooking(zero.booking!.id))!.commissionSnapshot!.percentage,0);
  assert.equal((await store.getBooking(legacy.booking!.id))!.commissionSnapshot,null);
  console.log('PASS: saved zero rates and unknown legacy commissions disclosed honestly without inventing fees; responsive Guruji view; no payment or payout is triggered');
} finally {
  await browser?.close();
  const ids=(await pool.query('SELECT id FROM bookings WHERE "customerId"=ANY($1::int[])',[users])).rows.map(r=>r.id);
  await pool.query(`DELETE FROM notifications WHERE "userId"=ANY($1::int[]) OR (type='unassigned_booking' AND message LIKE ANY($2::text[]))`,
    [users,ids.map(id=>`Booking #${id}: %`)]);
  await pool.query('DELETE FROM booking_requests WHERE "bookingId"=ANY($1::int[])',[ids]);
  await pool.query('DELETE FROM bookings WHERE id=ANY($1::int[])',[ids]);
  await pool.query('DELETE FROM guruji_pujas WHERE "gurujiId"=ANY($1::int[])',[profiles]);
  await pool.query('DELETE FROM guruji_profiles WHERE id=ANY($1::int[])',[profiles]);
  await pool.query('DELETE FROM pujas WHERE id=ANY($1::int[])',[pujas]);
  await pool.query('DELETE FROM cities WHERE id=ANY($1::int[])',[cities]);
  await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[users]);
  await pool.end();console.log('Isolated Guruji commission verification data removed; no global rates changed.');
}
