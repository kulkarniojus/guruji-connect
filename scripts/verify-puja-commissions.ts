import assert from 'node:assert/strict';
import { randomBytes,randomInt } from 'node:crypto';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { commissionSplit } from '../shared/pujaCommission';
import { openBrowserTest } from './browserTest';

if(process.env.NODE_ENV==='production'||!process.env.REPLIT_DEV_DOMAIN) throw new Error('Development verification only');
const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
const store=new DBStorage(),tag=`CommissionQA-${randomBytes(5).toString('hex')}`,password=randomBytes(18).toString('hex');
const users:number[]=[],pujas:number[]=[],bookings:number[]=[],cities:number[]=[];
let browser:Awaited<ReturnType<typeof openBrowserTest>>|undefined,adminId:number|undefined,baseline:any;
async function api(path:string,cookie?:string,method='GET',body?:any) {
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]||cookie};
}
async function account(role:'admin'|'customer',label:string) {
  const user=await store.createUser({firstName:'CommissionQA',lastName:label,email:`${tag}-${label}@example.invalid`,
    mobile:`9${randomInt(100000000,999999999)}`,password,role,age:30,gender:'other'} as any);
  users.push(user.id);
  const login=await api(role==='admin'?'/api/admin/login':'/api/auth/login',undefined,'POST',{email:user.email,password});
  assert.equal(login.status,200);return {...user,cookie:login.cookie!};
}
async function restoreDefault() {
  if(baseline&&adminId) await pool.query(`UPDATE puja_commission_settings SET percentage=$1,configured=$2,
    updated_by=$3,updated_at=$4 WHERE id=1 AND updated_by=$5`,
    [baseline.percentage,baseline.configured,baseline.updated_by,baseline.updated_at,adminId]);
}
async function click(expression:string) {
  await browser!.wait(`!!(${expression})&&!(${expression}).disabled`,'enabled control');
  await browser!.evaluate(`(${expression}).scrollIntoView({block:'center',behavior:'instant'})`);
  const box=await browser!.evaluate(`(()=>{const r=(${expression}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await browser!.command('Input.dispatchMouseEvent',{type:'mousePressed',...box,button:'left',clickCount:1});
  await browser!.command('Input.dispatchMouseEvent',{type:'mouseReleased',...box,button:'left',clickCount:1});
}
const button=(text:string)=>`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()===${JSON.stringify(text)})`;
async function fill(selector:string,value:string) {
  await browser!.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
try {
  assert.deepEqual(commissionSplit(2000,20),{percentage:20,bookingAmount:2000,portalAmount:400,gurujiAmount:1600});
  assert.equal(commissionSplit(2000,30).portalAmount,600);
  assert.equal(commissionSplit(.05,10).portalAmount,.01);
  assert.equal(commissionSplit(1999.99,100).gurujiAmount,0);
  assert.equal(commissionSplit(2000,0).portalAmount,0);
  assert.throws(()=>commissionSplit(2000,100.01));assert.throws(()=>commissionSplit(2000,20.123));
  const admin=await account('admin','admin');adminId=admin.id;
  const customer=await account('customer','customer');
  baseline=(await pool.query('SELECT * FROM puja_commission_settings WHERE id=1')).rows[0];
  const originalOverrides=(await pool.query('SELECT puja_id FROM puja_commission_overrides')).rows;
  const historical=(await pool.query('SELECT id,commission_snapshot FROM bookings ORDER BY id LIMIT 1')).rows[0];
  assert.equal((await api('/api/admin/commissions')).status,401);
  assert.equal((await api('/api/admin/commissions',customer.cookie)).status,403);
  assert.equal((await api('/api/admin/commissions/default',customer.cookie,'PUT',{percentage:20})).status,403);
  for(const percentage of [-1,100.01,20.123,'20',null]) assert.equal(
    (await api('/api/admin/commissions/default',admin.cookie,'PUT',{percentage})).status,400);
  for(let n=0;n<3;n++) {
    const created=await api('/api/pujas',admin.cookie,'POST',{name:`${tag}-${n}`,description:'Isolated commission verification',
      basePrice:3000,price:2000,type:'offline',duration:60,isActive:true});
    assert.equal(created.status,201);pujas.push(created.body.id);
  }
  const city=await api('/api/cities',admin.cookie,'POST',{name:tag,state:'Maharashtra',isActive:true});
  assert.equal(city.status,201);cities.push(city.body.id);
  const payload={pujaId:pujas[0],type:'offline',amount:2000,city:tag.toLowerCase(),pincode:'900123',
    address:'Isolated verification address',date:'2031-04-10T12:00:00Z',calendarDate:'2031-04-10',time:'09:00 AM',withSamagri:false};
  async function book(pujaId=pujas[0],withSamagri=false) {
    const quote=await api('/api/pricing/quote',undefined,'POST',{pujaId,calendarDate:payload.calendarDate,time:payload.time,withSamagri});
    assert.equal(quote.status,200);
    const result=await api('/api/bookings',customer.cookie,'POST',{...payload,pujaId,withSamagri,amount:quote.body.totalAmount,
      commissionSnapshot:{percentage:100,portalAmount:1,gurujiAmount:1}});
    assert.equal(result.status,201,JSON.stringify(result.body));bookings.push(result.body.id);
    assert.equal(result.body.amount,quote.body.totalAmount);
    assert.equal(result.body.commissionSnapshot,undefined);
    const saved=await store.getBooking(result.body.id);assert.ok(saved?.commissionSnapshot);
    return saved!;
  }
  assert.equal((await api('/api/admin/commissions/default',admin.cookie,'PUT',{percentage:20})).status,200);
  const globalBook=await book();
  assert.equal(globalBook.commissionSnapshot!.source,'default');
  assert.equal(globalBook.commissionSnapshot!.portalAmount,400);
  await restoreDefault(); // Keep global test changes short; scoped tests follow.
  assert.equal((await api('/api/admin/commissions/pujas',admin.cookie,'PUT',{pujaIds:[pujas[0]],percentage:30})).status,200);
  const specific=await book();assert.equal(specific.commissionSnapshot!.portalAmount,600);
  assert.equal(specific.commissionSnapshot!.gurujiAmount,1400);
  assert.equal((await api('/api/bookings/'+specific.id,customer.cookie)).body.commissionSnapshot,undefined);
  const adminBookings=(await api('/api/admin/bookings',admin.cookie)).body;
  assert.equal(adminBookings.find((b:any)=>b.id===specific.id).commissionSnapshot.portalAmount,600);
  const unchanged=(await store.getBooking(globalBook.id))!.commissionSnapshot;
  assert.deepEqual(unchanged,globalBook.commissionSnapshot);
  assert.equal((await api('/api/admin/commissions/pujas',admin.cookie,'PUT',{pujaIds:pujas.slice(1),percentage:0})).status,200);
  assert.equal((await book(pujas[1])).commissionSnapshot!.percentage,0);
  assert.equal((await api('/api/admin/commissions/pujas',admin.cookie,'PUT',{pujaIds:[pujas[1],2147483647],percentage:50})).status,400);
  assert.equal((await api('/api/admin/commissions',admin.cookie)).body.pujas.find((p:any)=>p.id===pujas[1]).overridePercentage,0);
  assert.equal((await api('/api/admin/commissions/default',admin.cookie,'PUT',{percentage:20,replaceOverrides:false})).status,200);
  assert.equal((await api('/api/admin/commissions',admin.cookie)).body.pujas.find((p:any)=>p.id===pujas[0]).effectivePercentage,30);
  if(!originalOverrides.length && !(await pool.query('SELECT puja_id FROM puja_commission_overrides WHERE NOT(puja_id=ANY($1::int[]))',[pujas])).rows.length) {
    assert.equal((await api('/api/admin/commissions/default',admin.cookie,'PUT',{percentage:20,replaceOverrides:true})).status,200);
    assert.equal((await api('/api/admin/commissions',admin.cookie)).body.pujas.find((p:any)=>p.id===pujas[0]).overridePercentage,null);
  }
  await restoreDefault();
  assert.equal((await api('/api/admin/commissions/pujas',admin.cookie,'PUT',{pujaIds:[pujas[0]],percentage:33.33})).status,200);
  const withSamagri=await book(pujas[0],true);
  assert.deepEqual({...withSamagri.commissionSnapshot!}, {...withSamagri.commissionSnapshot!,
    ...commissionSplit(Number(withSamagri.amount),33.33)});
  assert.equal((await api('/api/admin/commissions/pujas/'+pujas[0],admin.cookie,'DELETE')).status,200);
  if(historical) assert.deepEqual((await pool.query('SELECT commission_snapshot FROM bookings WHERE id=$1',[historical.id])).rows[0].commission_snapshot,historical.commission_snapshot);
  console.log('PASS: admin authorization, validated 0–100% rates, default and individual precedence, bulk atomic updates, explicit all-puja reset, customer price unchanged, final-total allocation, privacy and frozen/legacy booking records');

  browser=await openBrowserTest();await browser.command('Network.enable');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  const split=admin.cookie.indexOf('=');
  await browser.command('Network.setCookie',{name:admin.cookie.slice(0,split),value:admin.cookie.slice(split+1),url:base,httpOnly:true,secure:true});
  await browser.command('Page.navigate',{url:base+'/admin-dashboard'});
  await browser.wait(`!!document.querySelector('[role="tab"][id$="-trigger-pujas"]')`,'admin dashboard');
  await click(`document.querySelector('[role="tab"][id$="-trigger-pujas"]')`);
  await click(`document.querySelector('[role="tab"][id$="-trigger-commission"]')`);
  await browser.wait(`!!document.querySelector('#bulk-commission')`,'commission configuration');
  await fill('input[aria-label="Search pujas"]',tag);
  await browser.wait(`document.body.innerText.includes(${JSON.stringify(tag+'-2')})`,'filtered pujas');
  for(const n of [1,2]) await click(`document.querySelector('input[aria-label="Select ${tag}-${n}"]')`);
  await fill('#bulk-commission','25.5');
  await click(button('Apply to 2'));
  await browser.wait(`document.body.innerText.includes('25.5%')`,'saved bulk commission');
  const settings=(await api('/api/admin/commissions',admin.cookie)).body;
  for(const id of pujas.slice(1)) assert.equal(settings.pujas.find((p:any)=>p.id===id).overridePercentage,25.5);
  await click(`document.querySelector('button[aria-label="Reset ${tag}-1 to default"]')`);
  await browser.wait(`!document.querySelector('button[aria-label="Reset ${tag}-1 to default"]')`,'reset override');
  assert.equal((await api('/api/admin/commissions',admin.cookie)).body.pujas.find((p:any)=>p.id===pujas[1]).overridePercentage,null);
  console.log('PASS: signed-in admin Commission tab, catalogue search, native multi-puja selection, save and reset controls');
} finally {
  await browser?.close();await restoreDefault();
  const created=(await pool.query('SELECT id FROM bookings WHERE "customerId"=ANY($1::int[])',[users])).rows.map(r=>r.id);
  await pool.query(`DELETE FROM notifications WHERE "userId"=ANY($1::int[]) OR
    (type='unassigned_booking' AND message LIKE ANY($2::text[]))`,[users,created.map(id=>`Booking #${id}: %`)]);
  await pool.query('DELETE FROM booking_requests WHERE "bookingId"=ANY($1::int[])',[created]);
  await pool.query('DELETE FROM bookings WHERE id=ANY($1::int[])',[created]);
  await pool.query('DELETE FROM pujas WHERE id=ANY($1::int[])',[pujas]);
  await pool.query('DELETE FROM cities WHERE id=ANY($1::int[])',[cities]);
  await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[users]);
  await pool.end();console.log('Isolated commission verification data removed; original global configuration restored.');
}
