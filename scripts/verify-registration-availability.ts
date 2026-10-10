import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { getBusyGurujiIds } from '../server/bookingSchedule';
import { openBrowserTest } from './browserTest';
import { io } from 'socket.io-client';

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (process.env.NODE_ENV === 'production' || !base.endsWith('.replit.dev')) throw new Error('Development verification only');
const tag = `RegistrationQA-${randomBytes(5).toString('hex')}`;
const password = randomBytes(18).toString('hex');
const ids: number[] = [], sessions: string[] = [], profiles: number[] = [], bookings: number[] = [];
let cityId: number | undefined, pujaId: number | undefined;
let browser: Awaited<ReturnType<typeof openBrowserTest>> | undefined;
const storage = new DBStorage();
function details(name: string) {
  return {
    firstName: `${tag}-${name}`, lastName: 'Test', email: `${tag.toLowerCase()}-${name}@example.invalid`,
    mobile: `9${randomInt(100000000, 999999999)}`, password, age: 30, gender: 'female',
    dob: '1996-01-15', aadhar: '123456789012', caste: 'Test entry',
    address: '123 Test Lane, Test Building', city: tag, state: 'Maharashtra', pincode: '411001',
    photoUrl: '/images/services/training.webp',
  };
}
async function api(path: string, cookie?: string, method = 'GET', body?: unknown) {
  const response = await fetch(base + path, {
    method, headers: {'Content-Type':'application/json', ...(cookie ? {Cookie:cookie} : {})},
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
  const text = await response.text();
  let data: any;
  try {data = JSON.parse(text);} catch {data = text;}
  const session = response.headers.get('set-cookie')?.split(';')[0];
  if (session) sessions.push(session);
  return {status:response.status, body:data, cookie:session};
}
async function login(user: any, endpoint = '/api/auth/login') {
  const result = await api(endpoint, undefined, 'POST', {email:user.email.toUpperCase(),password});
  assert.equal(result.status,200,`${endpoint}: ${JSON.stringify(result.body)}`);
  assert.ok(result.cookie);
  return result.cookie!;
}
async function verifyProfile(user: any, submitted: any) {
  const cookie = await login(user);
  const profile = await api('/api/auth/me',cookie);
  for (const field of ['firstName','lastName','email','mobile','age','gender','dob','aadhar','caste','address','city','state','pincode','photoUrl']) {
    if (submitted[field] === undefined) continue;
    assert.equal(profile.body[field],submitted[field],`${field} must survive registration and fresh login`);
  }
  assert.equal(profile.body.password,undefined);
  assert.equal((await api('/api/auth/login',undefined,'POST',{email:user.email,password:'incorrect-password'})).status,401);
  return cookie;
}
async function navigate(cookie: string | undefined, path: string, expression: string) {
  await browser!.command('Network.clearBrowserCookies');
  if (cookie) await browser!.command('Network.setCookie',{
    name:'connect.sid',value:decodeURIComponent(cookie.split('=').slice(1).join('=')),url:base,httpOnly:true,
  });
  await browser!.command('Page.navigate',{url:base+path});
  await browser!.wait(expression,path);
}
async function verifySocket(cookie: string | undefined, allowed: boolean) {
  await new Promise<void>((resolve,reject)=>{
    const socket = io(base,{transports:['websocket'],reconnection:false,
      extraHeaders:cookie ? {Cookie:cookie} : {}});
    const timeout = setTimeout(()=>{socket.disconnect();reject(new Error('Socket authorization timed out'));},10_000);
    const finish=(connected:boolean)=>{
      clearTimeout(timeout);socket.disconnect();
      connected===allowed ? resolve() : reject(new Error('Unexpected Socket login result'));
    };
    socket.on('connect',()=>finish(true));
    socket.on('connect_error',()=>finish(false));
  });
}
try {
  const admin = await storage.createUser({...details('admin'),role:'admin'} as any); ids.push(admin.id);
  const sales = await storage.createUser({...details('sales'),role:'sales_rep'} as any); ids.push(sales.id);
  const adminCookie = await login(admin,'/api/admin/login');
  const salesCookie = await login(sales,'/api/sales-rep/login');
  const city = await api('/api/cities',adminCookie,'POST',{name:tag,state:'Maharashtra'});
  assert.equal(city.status,201); cityId=city.body.id;
  const puja = await api('/api/pujas',adminCookie,'POST',{
    name:tag,description:'Isolated registration and schedule verification',basePrice:3000,price:2500,
    type:'offline',duration:120,isActive:true,isPopular:false,
  });
  assert.equal(puja.status,201,JSON.stringify(puja.body)); pujaId=puja.body.id;

  const customerData = {...details('self-customer'),role:'customer'};
  const registered = await api('/api/auth/register',undefined,'POST',customerData);
  assert.equal(registered.status,201,JSON.stringify(registered.body)); ids.push(registered.body.id);
  const customerCookie = await verifyProfile(registered.body,customerData);
  assert.equal((await api('/api/auth/register',undefined,'POST',customerData)).status,409);
  assert.equal((await api('/api/auth/register',undefined,'POST',{...details('invalid-self'),role:'admin'})).status,400);
  assert.equal((await api('/api/guruji/availability',customerCookie)).status,403);
  assert.equal((await api('/api/availability',customerCookie)).status,403);
  assert.equal((await api('/api/admin/register-customer',customerCookie,'POST',details('forbidden'))).status,403);
  console.log('PASS: customer self-registration retains all submitted profile fields; fresh login, duplicate and role checks work');

  const selfGurujiData = {...details('self-guruji'),role:'guruji',experience:12,
    specialization:String(pujaId),location:String(cityId),languages:'Hindi, Marathi',qualification:'Test qualification'};
  const selfGuruji = await api('/api/auth/register',undefined,'POST',selfGurujiData);
  assert.equal(selfGuruji.status,201,JSON.stringify(selfGuruji.body)); ids.push(selfGuruji.body.id);
  const selfGurujiCookie = await verifyProfile(selfGuruji.body,selfGurujiData);
  const selfProfile = await storage.getGurujiProfileByUserId(selfGuruji.body.id);
  assert.ok(selfProfile); profiles.push(selfProfile.id);
  assert.equal((selfProfile as any).status,'pending');
  assert.equal((await pool.query(`SELECT "isVerified" FROM guruji_profiles WHERE id=$1`,[selfProfile.id])).rows[0].isVerified,false);
  assert.equal(selfProfile.isAvailable,false);
  assert.equal((selfProfile as any).address,selfGurujiData.address);
  assert.equal((selfProfile as any).city,tag);
  const specialization = await pool.query(`SELECT * FROM guruji_pujas WHERE "gurujiId"=$1`,[selfProfile.id]);
  assert.equal(specialization.rowCount,1);
  console.log('PASS: Guruji self-registration saves user details, pending profile, service cities and puja links');

  const staffGurujiData = (name: string) => ({
    ...details(name),experience:12,bio:'Test Guruji biography for end-to-end registration verification.',
    location:tag,cities:[String(cityId)],pujas:[String(pujaId)],languages:['Hindi','Marathi'],
    pricePerHour:700,isOnline:true,isOffline:false,isConsultation:true,religion:'Test entry',
    certificates:['/images/services/training.webp'],videoUrl:'https://example.invalid/test-video',
  });
  const gurujiCookies: string[] = [];
  for (const [kind,cookie,creator] of [['sales-rep',salesCookie,sales],['admin',adminCookie,admin]] as const) {
    const customer = details(`${kind}-customer`);
    const created = await api(`/api/${kind}/register-customer`,cookie,'POST',customer);
    assert.equal(created.status,201,JSON.stringify(created.body)); ids.push(created.body.id);
    await verifyProfile(created.body,customer);
    assert.equal(created.body.registeredBy,creator.id);
    assert.equal((await api('/api/auth/me',cookie)).body.id,creator.id,'staff session must remain staff');
    const data = staffGurujiData(`${kind}-guruji`);
    const createdGuruji = await api(`/api/${kind}/register-guruji`,cookie,'POST',data);
    assert.equal(createdGuruji.status,201,JSON.stringify(createdGuruji.body));
    ids.push(createdGuruji.body.user.id); profiles.push(createdGuruji.body.profile.id);
    gurujiCookies.push(await verifyProfile(createdGuruji.body.user,data));
    const gp = await storage.getGurujiProfile(createdGuruji.body.profile.id);
    assert.equal((gp as any).status,'pending'); assert.deepEqual((gp as any).cities,[tag]);
    assert.equal((gp as any).address,data.address);
    assert.equal(gp!.isOnline,true); assert.equal(gp!.isOffline,false); assert.equal(gp!.isConsultation,true);
    assert.deepEqual(gp!.languages,data.languages);
    assert.equal((await api('/api/auth/login',undefined,'POST',{email:data.email,password:data.mobile})).status,401,
      'Guruji password must be the entered password, not mobile');
    assert.equal((await api(`/api/${kind}/register-customer`,cookie,'POST',{...details('bad-phone'),mobile:'abc1234567'})).status,400);
    assert.equal((await api(`/api/${kind}/register-guruji`,cookie,'POST',{...staffGurujiData('bad-service'),pujas:['2147483647']})).status,400);
  }
  assert.equal((await api('/api/admin/register-customer',salesCookie,'POST',details('sales-not-admin'))).status,403);
  console.log('PASS: sales and admin customer/Guruji registration preserve every field and chosen password, pending approval and staff sessions');

  const application = await api('/api/guruji/register',selfGurujiCookie,'POST',{
    ...staffGurujiData('self-guruji'),email:selfGurujiData.email,mobile:selfGurujiData.mobile,
    firstName:selfGurujiData.firstName,lastName:selfGurujiData.lastName,aadharNumber:selfGurujiData.aadhar,
    profilePicture:selfGurujiData.photoUrl,
  });
  assert.equal(application.status,201,JSON.stringify(application.body));
  assert.equal(application.body.profile.id,selfProfile.id,'complete the existing pending profile, do not create another');
  assert.equal((await pool.query(`SELECT COUNT(*)::int AS count FROM guruji_profiles WHERE "userId"=$1`,[selfGuruji.body.id])).rows[0].count,1);
  console.log('PASS: completing a Guruji application updates personal details and the existing pending profile without duplicates');

  // Ten genuinely persisted, eligible fixture Gurujis in the same test city.
  while (profiles.length < 10) {
    const user = await storage.createUser({...details(`calendar-${profiles.length}`),role:'guruji'} as any); ids.push(user.id);
    const gp = await storage.createGurujiProfile({
      userId:user.id,city:tag,cities:[tag],address:'123 Test Lane',experience:12,pricePerHour:500,
      languages:['Hindi'],specialization:tag,status:'approved',isVerified:true,isAvailable:true,
      aadharVerified:true,documentsVerified:true,isOffline:true,
    } as any);
    profiles.push(gp.id);
  }
  await pool.query(`UPDATE guruji_profiles SET status='approved',"isVerified"=true,"isAvailable"=true,
    aadhar_verified=true,documents_verified=true WHERE id=ANY($1::int[])`,[profiles]);
  const date='2027-11-20',month='2027-11';
  const search=`/api/gurujis?city=${encodeURIComponent(tag)}&pujaId=${pujaId}&date=${date}&time=${encodeURIComponent('10:00 AM')}`;
  assert.equal((await api(search,customerCookie)).body.length,10);
  const globalOff=await api('/api/guruji/availability',selfGurujiCookie,'PUT',{isAvailable:false});
  assert.equal(globalOff.status,200);
  const timeOff=await api('/api/guruji/availability/rules',gurujiCookies[0],'POST',{
    date,startTime:'10:00',endTime:'12:00',isAvailable:false,
  });
  assert.equal(timeOff.status,201,JSON.stringify(timeOff.body));
  assert.equal((await api(search,customerCookie)).body.length,8,'2 unavailable Gurujis must not appear in manual selection');
  const nearby=await storage.getNearbyGurujis(tag,pujaId);
  const excluded=await getBusyGurujiIds(nearby.map(g=>g.id),date,'10:00 AM',120);
  assert.equal(nearby.filter(g=>!excluded.has(g.id)).length,8,'same exclusions for auto-search candidates');
  assert.equal((await api(search.replace('10%3A00%20AM','12%3A00%20PM'),customerCookie)).body.length,9);
  assert.equal((await api(`/api/guruji/availability/rules/${timeOff.body.id}`,gurujiCookies[1],'DELETE')).status,404);
  assert.equal((await api('/api/guruji/availability/rules',gurujiCookies[0],'POST',{date,startTime:'11:00',endTime:'13:00',isAvailable:true})).status,409);
  assert.equal((await api('/api/guruji/availability',selfGurujiCookie)).body.isAvailable,false);
  await api('/api/guruji/availability',selfGurujiCookie,'PUT',{isAvailable:true});
  await api(`/api/guruji/availability/rules/${timeOff.body.id}`,gurujiCookies[0],'DELETE');
  assert.equal((await api(search,customerCookie)).body.length,10);
  console.log('PASS: 10 available Gurujis become 8 with global/time off, both manual and auto search agree, and removal/restoration persists');

  const dayOff=await api('/api/guruji/availability/rules',selfGurujiCookie,'POST',{date,startTime:null,endTime:null,isAvailable:false});
  assert.equal(dayOff.status,201);
  const timeOn=await api('/api/guruji/availability/rules',selfGurujiCookie,'POST',{date,startTime:'10:00',endTime:'12:00',isAvailable:true});
  assert.equal(timeOn.status,201);
  assert.equal((await api(search,customerCookie)).body.length,10);
  assert.equal((await api(search.replace('10%3A00%20AM','11%3A00%20AM'),customerCookie)).body.length,9);
  const booked=await storage.createBooking({
    customerId:registered.body.id,pujaId,gurujiId:selfProfile.id,date:new Date(`${date}T00:00:00Z`),
    time:'10:00 AM',duration:120,address:'123 Test Lane',city:tag,pincode:'411001',
    type:'offline',status:'confirmed',amount:2500,paymentStatus:'unpaid',
  } as any); bookings.push(booked.id);
  assert.equal((await api(search,customerCookie)).body.length,9,'available time rule cannot override a confirmed booking');
  const calendar=await api(`/api/guruji/availability?month=${month}`,selfGurujiCookie);
  assert.ok(calendar.body.bookings.some((b:any)=>b.id===booked.id));
  assert.equal(calendar.body.rules.length,2);
  console.log('PASS: date off/time on exceptions apply to the full puja duration; confirmed bookings remain unavailable and appear in own calendar');

  assert.equal((await api('/api/guruji/availability')).status,401);
  const publicGurujis=await api('/api/gurujis');
  assert.equal(publicGurujis.status,200);
  assert.ok(publicGurujis.body.every((g:any)=>!('mobile' in g) && !('email' in g)),
    'public booking browsing must not reveal contact details');
  assert.equal((await api('/api/bookings',undefined,'POST',{})).status,401);
  assert.equal((await api('/api/analytics/overview')).status,401);
  assert.equal((await api('/api/analytics/overview',customerCookie)).status,403);
  assert.equal((await api('/api/demo/login',undefined,'POST',{})).status,410);
  await pool.query(`UPDATE users SET "isBlocked"=true WHERE id=$1`,[registered.body.id]);
  assert.equal((await api('/api/auth/me',customerCookie)).status,401);
  await pool.query(`UPDATE users SET "isBlocked"=false WHERE id=$1`,[registered.body.id]);
  const freshCustomerCookie=await login(registered.body);
  await verifySocket(undefined,false);
  await verifySocket(freshCustomerCookie,true);
  console.log('PASS: private endpoints require real login; customer/admin roles are enforced; blocked accounts lose access and demo APIs are disabled');

  browser=await openBrowserTest();
  await browser.command('Network.enable');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await navigate(freshCustomerCookie,'/profile',`document.body.innerText.includes('Registration') && document.body.innerText.includes('411001')`);
  const profileText=await browser.evaluate('document.body.innerText');
  assert.ok(profileText.includes(customerData.address)); assert.ok(profileText.includes('1996-01-15'));
  assert.ok(!profileText.includes('My Availability'));
  await navigate(freshCustomerCookie,'/availability',`location.pathname==='/dashboard'`);
  await navigate(selfGurujiCookie,`/availability`,`document.body.innerText.includes('My Availability') && !!document.querySelector('button[role="switch"]')`);
  await browser.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')==='Next month');})()`);
  await navigate(adminCookie,'/admin-dashboard',`!!document.querySelector('[role="tab"]')`);
  assert.equal((await api('/api/analytics/users',adminCookie)).status,200);
  assert.equal((await api('/api/admin/queries',adminCookie)).status,200);
  assert.ok(Array.isArray((await api('/api/analytics/users',adminCookie)).body.growth));
  assert.equal((await api('/api/analytics/chatbot',adminCookie)).body.available,false);
  await browser.click('[role="tab"]','Pujas');
  await browser.wait(`document.body.innerText.includes(${JSON.stringify(tag)})`,'fixture puja row');
  assert.equal(await browser.evaluate(`!!Array.from(document.querySelectorAll('tr')).find(r=>r.innerText.includes(${JSON.stringify(tag)}))?.querySelector('.line-through')`),true);
  await browser.click('[role="tab"]','Register accounts');
  await browser.wait(`document.body.innerText.includes('Register customer') && !!document.querySelector('input[name="password"]')`,'admin account registration form');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:1,mobile:true});
  await navigate(selfGurujiCookie,'/availability',`!!document.querySelector('button[role="switch"]')`);
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth > innerWidth + 2'),false);
  await navigate(undefined,'/profile',`!!document.querySelector('[role="dialog"]')`);
  assert.ok((await browser.evaluate('document.body.innerText')).includes('Login'));
  await browser.type('[role="dialog"] input[type="email"]',customerData.email);
  await browser.type('[role="dialog"] input[type="password"]',password);
  await browser.click('[role="dialog"] button[type="submit"]');
  await browser.wait(`location.pathname==='/profile' && document.body.innerText.includes('Registration') && !document.querySelector('[role="dialog"]')`,'customer actual browser login and profile return');
  await navigate(undefined,'/sales-rep/dashboard',`location.pathname==='/sales-rep' && !!document.querySelector('input[type="password"]')`);
  await browser.type('input[name="email"]',sales.email);
  await browser.type('input[name="password"]',password);
  await browser.click('button[type="submit"]');
  await browser.wait(`location.pathname==='/sales-rep/dashboard' && document.body.innerText.includes(${JSON.stringify(sales.firstName)})`,'sales actual browser login');
  await browser.click('button','Logout');
  await browser.wait(`location.pathname==='/sales-rep' && !!document.querySelector('input[name="password"]')`,'sales logout returns to login');
  assert.equal(await browser.evaluate(`(await fetch('/api/auth/me')).status`),401);
  await navigate(undefined,'/admin-dashboard',`location.pathname==='/admin' && !!document.querySelector('input[type="password"]')`);
  await browser.type('input[name="email"]',admin.email);
  await browser.type('input[name="password"]',password);
  await browser.click('button[type="submit"]');
  await browser.wait(`location.pathname==='/admin-dashboard' && !!document.querySelector('[role="tab"]')`,'admin actual browser login');
  const {photoUrl: unusedPhotoUrl, ...browserRegistration}=details('browser-customer');
  await navigate(undefined,'/profile',`!!document.querySelector('[role="dialog"]')`);
  await browser.click('[role="dialog"] button','Register now');
  await browser.wait(`!!document.querySelector('[role="dialog"] input[name="firstName"]')`,'public registration form');
  await browser.evaluate(`(()=>{
    const fields=${JSON.stringify(browserRegistration)};
    const form=document.querySelector('[role="dialog"] input[name="firstName"]').closest('form');
    for(const [name,value] of Object.entries(fields)){
      const input=form.querySelector('[name="'+name+'"]');
      if(!input || name==='gender' || input.type==='file')continue;
      Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,'value').set.call(input,String(value));
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
  })()`);
  await browser.click('[role="dialog"] [role="combobox"]');
  await browser.click('[role="option"]','Female');
  await browser.wait(`!document.querySelector('[role="option"]')`,'gender selection closes before submitting');
  if (await browser.evaluate(`!!document.querySelector('[role="dialog"] button[role="checkbox"][aria-checked="false"]')`)) {
    await browser.click('[role="dialog"] button[role="checkbox"][aria-checked="false"]');
  }
  await browser.wait(`document.querySelector('[role="dialog"] button[role="checkbox"]').getAttribute('aria-checked')==='true'`,'registration terms accepted');
  await browser.evaluate(`document.querySelector('[role="dialog"] input[name="firstName"]').closest('form').requestSubmit()`);
  await browser.wait(`location.pathname==='/profile' && document.body.innerText.includes(${JSON.stringify(browserRegistration.address)}) && !document.querySelector('[role="dialog"]')`,'browser registration saves and returns to profile');
  const browserUser=await storage.getUserByEmail(browserRegistration.email);
  assert.ok(browserUser);ids.push(browserUser.id);
  await verifyProfile(browserUser,browserRegistration);
  console.log('PASS: real browser customer registration saves the submitted address, DOB and personal fields, opens the profile and survives a fresh login');
  console.log('PASS: authenticated profile UI displays saved details; customer cannot access availability; Guruji calendar works on desktop/mobile; admin sale price is struck through and registration forms are visible; guest profile requires login');
} finally {
  await browser?.close();
  const ownUsers=await pool.query(`SELECT id FROM users WHERE email LIKE $1`,[`${tag.toLowerCase()}-%@example.invalid`]);
  ownUsers.rows.forEach(row=>{if(!ids.includes(row.id))ids.push(row.id);});
  if (profiles.length) {
    await pool.query(`DELETE FROM booking_requests WHERE "gurujiId"=ANY($1::int[])`,[profiles]);
    await pool.query(`DELETE FROM guruji_availability_rules WHERE guruji_id=ANY($1::int[])`,[profiles]);
  }
  if (bookings.length) await pool.query(`DELETE FROM bookings WHERE id=ANY($1::int[])`,[bookings]);
  if (profiles.length) {
    await pool.query(`DELETE FROM guruji_pujas WHERE "gurujiId"=ANY($1::int[])`,[profiles]);
    await pool.query(`DELETE FROM guruji_profiles WHERE id=ANY($1::int[])`,[profiles]);
  }
  if (ids.length) {
    await pool.query(`DELETE FROM user_sessions WHERE sess->>'userId'=ANY($1::text[])`,[ids.map(String)]);
    await pool.query(`DELETE FROM notifications WHERE "userId"=ANY($1::int[])`,[ids]);
    await pool.query(`DELETE FROM users WHERE id=ANY($1::int[])`,[ids]);
  }
  await pool.query(`DELETE FROM notifications WHERE message LIKE $1`,[`${tag}-%`]);
  if (pujaId) await pool.query(`DELETE FROM pujas WHERE id=$1`,[pujaId]);
  if (cityId) await pool.query(`DELETE FROM cities WHERE id=$1`,[cityId]);
  await pool.end();
}
