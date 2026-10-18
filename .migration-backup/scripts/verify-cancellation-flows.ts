import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { calculateCancellationCharge, hoursBeforeBooking, selectCancellationRule } from '../server/cancellationPolicy';
import { openBrowserTest } from './browserTest';

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
if(process.env.NODE_ENV==='production' || !base.endsWith('.replit.dev')) throw new Error('Development verification only');
const tag=`CancellationQA-${randomBytes(5).toString('hex')}`, password=randomBytes(24).toString('hex');
const store=new DBStorage(), users:number[]=[], profiles:number[]=[], bookings:number[]=[], rules:number[]=[];
let pujaId:number, cityId:number, browser:Awaited<ReturnType<typeof openBrowserTest>>;
async function api(path:string,cookie?:string,method='GET',data?:any) {
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
    ...(data===undefined?{}:{body:JSON.stringify(data)})});
  if(!response.headers.get('content-type')?.includes('application/json')) throw new Error(`API route ${method} ${path} did not return JSON`);
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function account(role:string,label:string,blocked=false) {
  const user=await store.createUser({firstName:'CancellationQA',lastName:label,email:`${tag}-${label}@example.invalid`,
    mobile:`9${randomInt(100000000,999999999)}`,password,role,age:30,gender:'other',isBlocked:blocked} as any);
  users.push(user.id);if(blocked)await store.blockUser(user.id);
  const login=blocked?null:await api(role==='admin'?'/api/admin/login':'/api/auth/login',undefined,'POST',{email:user.email,password});
  if(login)assert.equal(login.status,200);
  return {...user,cookie:login?.cookie};
}
function schedule(hours:number) {
  const d=new Date(Date.now()+hours*3600000+330*60000);
  const hour=d.getUTCHours(), minute=Math.floor(d.getUTCMinutes()/5)*5;
  return {calendarDate:d.toISOString().slice(0,10),time:`${String(hour%12||12).padStart(2,'0')}:${String(minute).padStart(2,'0')} ${hour>=12?'PM':'AM'}`};
}
async function click(expression:string) {
  await browser.wait(`!!(${expression})`,'click target');
  await browser.wait(`!(${expression}).disabled`,'enabled control');
  await browser.evaluate(`(${expression}).scrollIntoView({block:innerHeight>700?'center':'end',behavior:'instant'})`);
  await browser.wait(`(()=>{const e=(${expression}),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e || e.contains(hit)})()`,'uncovered control');
  const box=await browser.evaluate(`(()=>{const r=(${expression}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await browser.command('Input.dispatchMouseEvent',{type:'mousePressed',...box,button:'left',clickCount:1});
  await browser.command('Input.dispatchMouseEvent',{type:'mouseReleased',...box,button:'left',clickCount:1});
}
const textButton=(text:string)=>`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()===${JSON.stringify(text)})`;
async function fill(selector:string,value:string) {
  await browser.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
async function navigate(cookie:string,path:string,ready:string) {
  const eq=cookie.indexOf('=');
  await browser.command('Network.setCookie',{name:cookie.slice(0,eq),value:cookie.slice(eq+1),url:base});
  await browser.command('Page.navigate',{url:base+path});await browser.wait(ready,path);
}
try {
  const rule=(hours:number,basis='within')=>({id:hours,hours_threshold:hours,time_basis:basis,is_active:true});
  assert.equal(selectCancellationRule([rule(24),rule(12),rule(4)],10).hours_threshold,12);
  assert.equal(selectCancellationRule([rule(24),rule(12),rule(4)],4).hours_threshold,4);
  assert.equal(selectCancellationRule([rule(24)],24).hours_threshold,24);
  assert.equal(selectCancellationRule([rule(24)],24.00001),null);
  assert.equal(selectCancellationRule([rule(24,'at_least'),rule(0,'at_least')],30).hours_threshold,24);
  assert.equal(hoursBeforeBooking({date:'2031-04-10',time:'09:00 AM'},Date.parse('2031-04-09T08:30:00+05:30')),24.5);
  assert.equal(calculateCancellationCharge(3000,{charge_type:'percentage',charge_value:25.5}),765);
  assert.equal(calculateCancellationCharge(3000,{charge_type:'fixed',charge_value:500.50}),500.5);
  assert.equal(calculateCancellationCharge(3000,{charge_type:'full',charge_value:0}),3000);
  console.log('PASS: exact hourly boundaries, narrower thresholds, legacy meaning, Indian date/time and decimal charges');

  const admin=await account('admin','admin'), customer=await account('customer','customer'), stranger=await account('customer','stranger');
  const city=`Cancellation QA ${tag}`;
  const cityResponse=await api('/api/cities',admin.cookie,'POST',{name:city,state:'Maharashtra',isActive:true});
  assert.equal(cityResponse.status,201);cityId=cityResponse.data.id;
  const p=await api('/api/pujas',admin.cookie,'POST',{name:tag,description:tag,type:'offline',duration:60,basePrice:3000,price:3000,isActive:true});
  assert.equal(p.status,201);pujaId=p.data.id;
  const gurus:any[]=[];
  for(const label of ['original','replacement','wrong-service','wrong-location','busy','unapproved','blocked','off']) {
    const user=await account('guruji',label,label==='blocked');
    const g=(await pool.query(`INSERT INTO guruji_profiles
      ("userId",city,pincode,experience,"pricePerHour","isVerified","isAvailable","createdAt","updatedAt",status,specialities,aadhar_verified,documents_verified)
      VALUES ($1,$2,$3,1,100,true,$4,NOW(),NOW(),$5,$6,true,true) RETURNING id`,
      [user.id,label==='wrong-location'?`Elsewhere ${tag}`:city,label==='wrong-location'?'900124':'900123',label!=='off',
        label==='unapproved'?'pending':'approved',label==='wrong-service'?['Other puja']:[tag]])).rows[0];
    profiles.push(g.id);gurus.push({...user,profileId:g.id,label});
  }
  async function addRule(userType:string,hoursThreshold:number,chargeType:string,chargeValue:number,timeBasis='within') {
    const result=await api('/api/admin/cancellation-rules',admin.cookie,'POST',{userType,name:`${tag}-${userType}-${hoursThreshold}`,
      hoursThreshold,chargeType,chargeValue,timeBasis,pujaId,isActive:true});
    assert.equal(result.status,201,JSON.stringify(result.data));rules.push(result.data.id);return result.data;
  }
  const customerRule=await addRule('customer',24,'percentage',25.5);
  await addRule('customer',4,'full',0);
  const fallback=await addRule('customer',0,'free',0,'at_least');
  await addRule('guruji',24,'fixed',500.50);
  const gurujiRule=await addRule('guruji',12,'percentage',10);
  assert.equal((await api('/api/admin/cancellation-rules',customer.cookie,'POST',{})).status,403);
  assert.equal((await api('/api/admin/cancellation-rules',undefined)).status,401);
  assert.equal((await api('/api/admin/cancellation-rules',admin.cookie,'POST',{userType:'customer',name:'invalid',hoursThreshold:1,chargeType:'percentage',chargeValue:101})).status,400);
  const countBefore=(await api('/api/admin/cancellation-rules',admin.cookie)).data.length;
  assert.equal((await api(`/api/admin/cancellation-rules/${fallback.id}`,admin.cookie,'PUT',{hoursThreshold:0,isActive:false})).status,200);
  assert.equal((await api('/api/admin/cancellation-rules',admin.cookie)).data.length,countBefore);
  assert.equal((await api(`/api/admin/cancellation-rules/${fallback.id}`,admin.cookie,'PUT',{isActive:true})).data.hours_threshold,0);
  assert.equal((await api('/api/admin/cancellation-rules',admin.cookie,'POST',{userType:'customer',name:'duplicate',hoursThreshold:24,chargeType:'fixed',chargeValue:5,pujaId})).status,409);
  console.log('PASS: scoped rule CRUD, exact zero-hour edits, decimal values, activation without duplicates and admin-only controls');

  async function book(hours:number,accept=true) {
    const s=schedule(hours);
    const q=await api('/api/pricing/quote',customer.cookie,'POST',{pujaId,...s,withSamagri:false});
    assert.equal(q.status,200);
    const result=await api('/api/bookings',customer.cookie,'POST',{pujaId,type:'offline',amount:q.data.totalAmount,
      ...s,date:`${s.calendarDate}T12:00:00Z`,city:city.toLowerCase().replace(/\s+/g,'-'),pincode:'900123',
      address:'Isolated cancellation verification address',gurujiId:gurus[0].profileId,withSamagri:false});
    assert.equal(result.status,201,JSON.stringify(result.data));bookings.push(result.data.id);
    const reqs=await store.getBookingRequestsByBookingId(result.data.id);
    if(accept)assert.equal((await api(`/api/booking-requests/${reqs[0].id}/respond`,gurus[0].cookie,'POST',{response:'accept',commissionAcknowledged:true})).status,200);
    return {id:result.data.id,amount:Number(result.data.amount),requestId:reqs[0].id,...s};
  }
  const one=await book(8);
  assert.equal((await api(`/api/bookings/${one.id}/cancellation-preview`,stranger.cookie)).status,403);
  assert.equal((await api(`/api/bookings/${one.id}/cancellation-preview`,gurus[1].cookie)).status,403);
  const quote=await api(`/api/bookings/${one.id}/cancellation-preview`,customer.cookie);
  assert.equal(quote.status,200);assert.equal(quote.data.charge,Math.round(one.amount*25.5)/100);
  assert.equal((await api(`/api/bookings/${one.id}/cancel`,customer.cookie,'POST',{reason:'A valid reason without quote'})).status,409);
  await api(`/api/admin/cancellation-rules/${customerRule.id}`,admin.cookie,'PUT',{chargeValue:26});
  assert.equal((await api(`/api/bookings/${one.id}/cancel`,customer.cookie,'POST',{reason:'Stale quote must not cancel',quoteToken:quote.data.quoteToken})).status,409);
  await api(`/api/admin/cancellation-rules/${customerRule.id}`,admin.cookie,'PUT',{chargeValue:25.5});
  const refreshed=(await api(`/api/bookings/${one.id}/cancellation-preview`,customer.cookie)).data;
  const request=await api(`/api/bookings/${one.id}/cancel`,customer.cookie,'POST',{reason:'Customer requests cancellation',quoteToken:refreshed.quoteToken});
  assert.equal(request.status,200);assert.equal((await store.getBooking(one.id))?.status,'confirmed');
  const privateHistory=(await api(`/api/bookings/${one.id}/cancellation-history`,gurus[0].cookie)).data;
  assert.ok(!privateHistory.some((e:any)=>e.reason==='Customer requests cancellation'));
  assert.equal((await api(`/api/bookings/${one.id}/cancel`,customer.cookie,'POST',{reason:'Duplicate must not charge',quoteToken:refreshed.quoteToken})).status,409);
  assert.equal((await api(`/api/bookings/${one.id}/status`,gurus[0].cookie,'PUT',{status:'in_progress'})).status,409);
  await api(`/api/admin/cancellation-rules/${customerRule.id}`,admin.cookie,'PUT',{chargeValue:50});
  const approved=await api(`/api/admin/bookings/${one.id}/cancellation-action`,admin.cookie,'POST',
    {action:'approve',eventId:request.data.eventId,reason:'Approved after customer discussion'});
  assert.equal(approved.status,200);assert.equal(approved.data.charge,refreshed.charge);
  const closed=await store.getBooking(one.id);
  assert.equal(closed?.status,'cancelled');
  assert.equal((await store.getBookingRequestsByBookingId(one.id)).filter(r=>['pending','accepted'].includes(r.status)).length,0);
  assert.equal((await api(`/api/admin/bookings/${one.id}/cancellation-action`,admin.cookie,'POST',{action:'approve',eventId:request.data.eventId,reason:'Duplicate approval forbidden'})).status,409);
  console.log('PASS: owned previews, stale-quote protection, customer approval, frozen proposed charge, duplicate protection and request cleanup');

  const two=await book(10);
  const q2=(await api(`/api/bookings/${two.id}/cancellation-preview`,customer.cookie)).data;
  const req2=await api(`/api/bookings/${two.id}/cancel`,customer.cookie,'POST',{reason:'Customer asks support to cancel',quoteToken:q2.quoteToken});
  assert.equal((await api(`/api/admin/bookings/${two.id}/cancellation-action`,admin.cookie,'POST',
    {action:'reject',eventId:req2.data.eventId,reason:'Customer agreed to retain booking'})).status,200);
  assert.equal((await store.getBooking(two.id))?.status,'confirmed');
  const notifs=(await api('/api/notifications',customer.cookie)).data;
  assert.ok(!notifs.some((n:any)=>n.type==='cancellation_charge' && n.message.startsWith(`Booking #${two.id}:`)));
  assert.equal((await api(`/api/bookings/${two.id}/cancel`,gurus[0].cookie,'POST',{reason:'Try to close booking',action:'cancel'})).status,403);
  assert.equal((await api(`/api/admin/bookings/${two.id}/cancellation-action`,admin.cookie,'POST',{action:'cancel',reason:'Admin closes verification booking',chargeParty:'none'})).status,200);
  console.log('PASS: admin rejection retains booking without a fee; participants cannot override decisions');

  const three=await book(14);
  const busy=await store.createBooking({customerId:customer.id,pujaId,gurujiId:gurus.find(g=>g.label==='busy').profileId,
    type:'offline',amount:3000,date:new Date(`${three.calendarDate}T12:00:00Z`),time:three.time,city,status:'confirmed',duration:60} as any);
  bookings.push(busy.id);
  browser=await openBrowserTest();await browser.command('Network.enable');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate(gurus[0].cookie,'/dashboard',`!!document.querySelector('[role="tab"][id$="-trigger-upcoming"]')`);
  await click(`document.querySelector('[role="tab"][id$="-trigger-upcoming"]')`);
  await click(textButton('Withdraw from Booking'));
  await browser.wait(`document.body.innerText.includes('Recorded withdrawal charge: ₹500.5')`,'real Guruji withdrawal preview');
  await fill('textarea[placeholder="Briefly explain why you are cancelling this booking..."]','Unable to attend, please arrange another Guruji');
  await click(textButton('Confirm Withdrawal'));
  await browser.wait(`document.body.innerText.includes('Withdrawal recorded')`,'Guruji withdrawal submitted');
  const event=(await pool.query(`SELECT * FROM booking_cancellation_events WHERE booking_id=$1 AND kind='guruji_withdrawal'`,[three.id])).rows[0];
  assert.equal(Number(event.charge),500.5);
  const reopened=await store.getBooking(three.id);
  assert.equal(reopened?.gurujiId,null);assert.equal(reopened?.status,'pending_approval');
  const replacementRequests=await store.getBookingRequestsByBookingId(three.id);
  assert.deepEqual(replacementRequests.filter(r=>r.status==='pending').map(r=>r.gurujiId),[gurus[1].profileId]);
  assert.ok(replacementRequests.some(r=>r.gurujiId===gurus[0].profileId && r.status==='declined'));
  assert.ok((await api('/api/admin/cancellation-requests',admin.cookie)).data.some((e:any)=>e.id===event.id));
  assert.equal((await api(`/api/guruji/bookings/${three.id}/cancel`,gurus[0].cookie,'POST',{reason:'Duplicate withdrawal forbidden',quoteToken:event.quote.quoteToken})).status,403);
  const replacement=replacementRequests.find(r=>r.status==='pending');
  assert.equal((await api(`/api/booking-requests/${replacement!.id}/respond`,gurus[1].cookie,'POST',{response:'accept',commissionAcknowledged:true})).status,200);
  assert.equal((await store.getBooking(three.id))?.gurujiId,gurus[1].profileId);
  assert.equal((await api(`/api/admin/bookings/${three.id}/cancellation-action`,admin.cookie,'POST',
    {action:'review_withdrawal',eventId:event.id,chargeOverride:0,reason:'Admin waives original Guruji fee'})).status,200);
  assert.equal((await store.getBooking(three.id))?.status,'confirmed');
  const reviewed=(await pool.query('SELECT * FROM booking_cancellation_events WHERE id=$1',[event.id])).rows[0];
  assert.equal(Number(reviewed.charge),0);assert.equal(reviewed.quote.charge,500.5);
  assert.equal((await api(`/api/admin/bookings/${three.id}/cancellation-action`,admin.cookie,'POST',
    {action:'reassign',reason:'Admin controls reassignment',searchOthers:false,chargeParty:'none'})).status,200);
  assert.equal((await store.getBooking(three.id))?.status,'pending');
  assert.equal((await api(`/api/admin/bookings/${three.id}/cancellation-action`,admin.cookie,'POST',
    {action:'cancel',reason:'Admin makes final cancellation',chargeParty:'none'})).status,200);
  console.log('PASS: real Guruji dashboard withdrawal never closes booking, only eligible replacement is contacted and genuinely accepts; admin can waive fees, reassign or close');

  const started=await book(16);
  assert.equal((await api(`/api/bookings/${started.id}/status`,gurus[0].cookie,'PUT',{status:'in_progress'})).status,200);
  assert.ok((await pool.query('SELECT started_at FROM booking_completion_challenges WHERE booking_id=$1',[started.id])).rows[0].started_at);
  const startedQuote=(await api(`/api/bookings/${started.id}/cancellation-preview`,gurus[0].cookie)).data;
  assert.equal(startedQuote.canCancel,true);
  assert.equal((await api(`/api/bookings/${started.id}/cancel-by-guruji`,gurus[0].cookie,'POST',
    {reason:'Withdrawal after starting must never close booking',quoteToken:startedQuote.quoteToken})).status,200);
  assert.equal((await store.getBooking(started.id))?.status,'pending_approval');
  const reset=(await pool.query('SELECT started_at,code_cipher,otp_digest FROM booking_completion_challenges WHERE booking_id=$1',[started.id])).rows[0];
  assert.equal(reset.started_at,null);assert.equal(reset.code_cipher,null);assert.equal(reset.otp_digest,null);
  assert.equal((await api(`/api/admin/bookings/${started.id}/cancellation-action`,admin.cookie,'POST',
    {action:'cancel',reason:'Admin finalizes started withdrawal',chargeParty:'none'})).status,200);
  assert.ok((await api('/api/notifications',gurus[1].cookie)).data.some((n:any)=>n.type==='booking_cancelled' && n.message.startsWith(`Booking #${started.id}:`)));

  const paused=await book(18);
  const customerPause=(await api(`/api/bookings/${paused.id}/cancellation-preview`,customer.cookie)).data;
  const pauseRequest=await api(`/api/bookings/${paused.id}/cancel`,customer.cookie,'POST',
    {reason:'Customer cancellation needs review before replacements',quoteToken:customerPause.quoteToken});
  const gurujiPause=(await api(`/api/bookings/${paused.id}/cancellation-preview`,gurus[0].cookie)).data;
  assert.equal((await api(`/api/guruji/bookings/${paused.id}/cancel`,gurus[0].cookie,'POST',
    {reason:'Guruji withdrew during pending review',quoteToken:gurujiPause.quoteToken})).status,200);
  assert.equal((await store.getBooking(paused.id))?.status,'pending');
  assert.equal((await store.getBookingRequestsByBookingId(paused.id)).filter(r=>r.status==='pending').length,0);
  assert.equal((await api(`/api/admin/bookings/${paused.id}/cancellation-action`,admin.cookie,'POST',
    {action:'reject',eventId:pauseRequest.data.eventId,reason:'Customer agrees to continue with replacement'})).status,200);
  assert.equal((await store.getBooking(paused.id))?.status,'pending_approval');
  // The Guruji booked at +14 hours is no longer busy at +18 hours.
  assert.deepEqual((await store.getBookingRequestsByBookingId(paused.id)).filter(r=>r.status==='pending').map(r=>r.gurujiId).sort((a,b)=>a-b),
    [gurus[1].profileId,gurus.find(g=>g.label==='busy').profileId].sort((a,b)=>a-b));
  assert.equal((await api(`/api/admin/bookings/${paused.id}/cancellation-action`,admin.cookie,'POST',
    {action:'cancel',reason:'Admin cancellation remains final',chargeParty:'none'})).status,200);
  console.log('PASS: started withdrawals reopen safely and clear old completion codes; pending customer review pauses replacements, rejection resumes them, and all open-request Gurujis receive closure alerts');

  await navigate(admin.cookie,'/admin-dashboard',`!!document.querySelector('[role="tab"][id$="-trigger-cancellation-rules"]')`);
  await click(`document.querySelector('[role="tab"][id$="-trigger-cancellation-rules"]')`);
  await browser.wait(`document.body.innerText.includes(${JSON.stringify(customerRule.name)})`,'cancellation admin screen');
  await click(`document.querySelector('button[aria-label=${JSON.stringify(`Activate ${customerRule.name}`)}]')`);
  await browser.wait(`document.querySelector('button[aria-label=${JSON.stringify(`Activate ${customerRule.name}`)}]')?.getAttribute('aria-checked')==='false'`,'rule deactivation');
  assert.equal((await api('/api/admin/cancellation-rules',admin.cookie)).data.length,countBefore);
  await click(`document.querySelector('button[aria-label=${JSON.stringify(`Activate ${customerRule.name}`)}]')`);
  await browser.wait(`document.querySelector('button[aria-label=${JSON.stringify(`Activate ${customerRule.name}`)}]')?.getAttribute('aria-checked')==='true'`,'rule reactivation');

  const four=await book(20,false);
  await navigate(customer.cookie,`/booking/${four.id}`,`document.body.innerText.includes('Request Cancellation')`);
  await click(textButton('Request Cancellation'));
  await browser.wait(`!!document.querySelector('textarea[aria-label="Cancellation request reason"]')`,'customer cancellation dialog');
  await fill('textarea[aria-label="Cancellation request reason"]','Please review this customer cancellation');
  await click(textButton('Submit Cancellation Request'));
  await browser.wait(`document.body.innerText.includes('Cancellation request submitted')`,'customer request submitted');
  const pending=(await pool.query(`SELECT id FROM booking_cancellation_events WHERE booking_id=$1 AND status='pending'`,[four.id])).rows[0];
  assert.ok(pending);
  assert.equal((await api(`/api/booking-requests/${four.requestId}/respond`,gurus[0].cookie,'POST',{response:'accept',commissionAcknowledged:true})).status,409);
  await navigate(admin.cookie,'/admin-dashboard',`!!document.querySelector('[role="tab"][id$="-trigger-cancellation-rules"]')`);
  await click(`document.querySelector('[role="tab"][id$="-trigger-cancellation-rules"]')`);
  await browser.wait(`!!document.querySelector('[data-cancellation-event-id="${pending.id}"]')`,'admin request queue');
  await click(`document.querySelector('[data-cancellation-event-id="${pending.id}"] button')`);
  await fill('textarea[aria-label="Admin decision reason"]','Approved through the actual admin screen');
  await click(textButton('Confirm admin decision'));
  await browser.wait(`document.querySelector('[data-cancellation-event-id="${pending.id}"]')?.innerText.includes('approved')`,'admin UI approval');
  assert.equal((await store.getBooking(four.id))?.status,'cancelled');
  console.log('PASS: native admin toggle does not create rules; customer submits through real controls and admin approves in the queue; pending review pauses new acceptance');
  assert.equal((await api(`/api/admin/cancellation-rules/${gurujiRule.id}`,admin.cookie,'DELETE')).status,200);
  assert.ok(!(await api('/api/admin/cancellation-rules',admin.cookie)).data.some((r:any)=>r.id===gurujiRule.id));
  console.log('PASS: deletion does not change saved history; no real payments are collected by any cancellation path');
} catch(error) {
  if(browser!) console.log('Browser control diagnostic',await browser.evaluate(`(()=>{const e=Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()==='Request Cancellation');
    const r=e?.getBoundingClientRect(),hit=r&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return {viewport:[innerWidth,innerHeight],rect:r?.toJSON(),element:e?.outerHTML,hit:hit?.outerHTML.slice(0,700)}})()`));
  throw error;
} finally {
  if(browser!)await browser.close();
  await pool.query('DELETE FROM cancellation_rules WHERE id=ANY($1::int[])',[rules]);
  await pool.query(`DELETE FROM notifications WHERE "userId"=ANY($1::int[]) OR message LIKE ANY($2::text[])`,
    [users,bookings.map(id=>`Booking #${id}: %`)]);
  await pool.query('DELETE FROM booking_requests WHERE "bookingId"=ANY($1::int[])',[bookings]);
  await pool.query('DELETE FROM bookings WHERE id=ANY($1::int[])',[bookings]);
  await pool.query('DELETE FROM guruji_pujas WHERE "gurujiId"=ANY($1::int[])',[profiles]);
  await pool.query('DELETE FROM guruji_profiles WHERE id=ANY($1::int[])',[profiles]);
  if(pujaId!)await pool.query('DELETE FROM pujas WHERE id=$1',[pujaId]);
  if(cityId!)await pool.query('DELETE FROM cities WHERE id=$1',[cityId]);
  await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[users]);
  await pool.end();console.log('Isolated cancellation verification fixtures removed.');
}
