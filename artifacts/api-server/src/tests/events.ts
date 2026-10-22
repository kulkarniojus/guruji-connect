import assert from 'node:assert/strict';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { DBStorage } from '../dbStorage';
import { pool } from '../db';
import { ObjectStorageService } from '../lib/objectStorage';
import { getUncachableStripeClient } from '../stripeClient';
import { completeEventPayment } from '../eventPayments';
import { browserClient } from './browser-client';
import { eventSchedule, eventInputSchema } from '../eventsModel';

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (!base.endsWith('.replit.dev')) throw new Error('Development fixtures only');
const tag = `verify-events-${randomBytes(5).toString('hex')}`, password = randomBytes(20).toString('hex');
const store = new DBStorage(), users:number[] = [], eventIds:number[] = [], mediaIds:string[] = [], stripeSessions:string[] = [], stripeProducts:string[] = [], stripePrices:string[] = [];
let browser:Awaited<ReturnType<typeof browserClient>>|undefined;
const day = (offset:number) => new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
async function api(path:string,cookie='',method='GET',body?:unknown,extra:Record<string,string>={}) {
  const r = await fetch(base+path,{ method, headers:{ ...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{}),...extra },
    body:body?JSON.stringify(body):undefined });
  const data:any = await r.json().catch(()=>null);
  return { status:r.status, data,cookie:r.headers.get('set-cookie')?.split(';')[0]??'' };
}
async function account(role:'admin'|'customer'|'guruji') {
  const u = await store.createUser({ firstName:tag,lastName:'Verification',email:`${tag}-${users.length}@example.invalid`,
    mobile:`9${randomInt(100000000,999999999)}`,password,role,age:32,gender:'other' } as any);
  users.push(u.id);
  const login = await api(role==='admin'?'/api/admin/login':'/api/auth/login','','POST',{email:u.email,password});
  assert.equal(login.status,200); assert.ok(login.cookie); return {...u,cookie:login.cookie};
}
const input = () => ({
  name:`${tag} devotional class`,description:'Isolated verification event. This fixture is removed automatically.',
  classType:'Ramraksha classes',ageMin:5,ageMax:14,instructorName:'Verification instructor',instructorDetails:'Religious education instructor',
  mode:'online',location:'Online',meetingUrl:'https://meet.google.com/verification-room',
  startDate:day(8),endDate:day(8),startTime:'10:00',durationMinutes:60,frequency:'once',weekdays:[],
  basePrice:100,discountedPrice:80,registrationDeadline:`${day(7)}T18:00:00+05:30`,capacity:2,paymentMode:'both',media:[],
});
try {
  const admin=await account('admin'),customer=await account('customer'),outsider=await account('customer'),guruji=await account('guruji');
  const originalPujaPayments=(await pool.query('SELECT stripe_payments_enabled,advance_percentage FROM app_settings LIMIT 1')).rows[0];
  const scheduled=eventSchedule(eventInputSchema.parse({...input(),frequency:'daily',endDate:day(10)}));
  assert.equal(scheduled.length,3); assert.equal(scheduled[0].start.toISOString().slice(11,16),'04:30');
  assert.equal((await api('/api/pujas')).status,200,'Existing public puja catalogue remains accessible');
  assert.equal((await api('/api/admin/events')).status,401);
  assert.equal((await api('/api/admin/events',customer.cookie)).status,403);
  assert.equal((await api('/api/admin/events',admin.cookie,'POST',{...input(),ageMax:3})).status,400);
  assert.equal((await api('/api/admin/events',admin.cookie,'POST',{...input(),frequency:'weekly'})).status,400);
  const uploaded=await api('/api/admin/event-media',admin.cookie,'POST',{name:'event.png',size:68,contentType:'image/png'});
  assert.equal(uploaded.status,200,'Real App Storage media upload request');
  const mediaId=uploaded.data.url.split('/').pop(); mediaIds.push(mediaId);
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=','base64');
  assert.ok((await fetch(uploaded.data.uploadURL,{method:'PUT',body:bytes,headers:{'Content-Type':'image/png'}})).ok);
  const media={url:uploaded.data.url,kind:'banner',label:'Verification event banner'};
  assert.equal((await api('/api/admin/event-media/complete',admin.cookie,'POST',media)).status,200);
  assert.equal((await fetch(base+media.url)).status,404,'Draft media is not public');
  const config={...input(),media:[media]};
  const created=await api('/api/admin/events',admin.cookie,'POST',config);
  assert.equal(created.status,201,JSON.stringify(created.data)); const id=created.data.id; eventIds.push(id);
  assert.equal((await api(`/api/events/${id}`)).status,404,'Draft event is private');
  assert.equal((await api(`/api/admin/events/${id}/action`,admin.cookie,'POST',{action:'publish',reason:''})).status,200);
  assert.equal((await fetch(base+media.url)).status,200,'Published banner is available');
  const detail=await api(`/api/events/${id}`);
  assert.equal(detail.data.meetingUrl,'','Joining URL is private');
  assert.equal(detail.data.currentPrice,80);
  assert.ok((await api('/api/events')).data.some((e:any)=>e.id===id));
  const regBody={requestId:randomUUID(),childName:'Verification child',childAge:8,guardianConsent:true,paymentMethod:'manual',eventVersion:detail.data.version};
  assert.equal((await api(`/api/events/${id}/register`,'','POST',regBody)).status,401);
  assert.equal((await api(`/api/events/${id}/register`,guruji.cookie,'POST',regBody)).status,403);
  assert.equal((await api(`/api/events/${id}/register`,customer.cookie,'POST',{...regBody,childAge:4})).status,400);
  assert.equal((await api(`/api/events/${id}/register`,customer.cookie,'POST',{...regBody,eventVersion:1})).status,409);
  const reg=await api(`/api/events/${id}/register`,customer.cookie,'POST',regBody);
  assert.equal(reg.status,201,JSON.stringify(reg.data)); const rid=reg.data.id;
  assert.equal(reg.data.fee,80); assert.equal(reg.data.paid,0); assert.equal(reg.data.balanceDue,80);
  assert.equal((await api(`/api/events/${id}/register`,customer.cookie,'POST',regBody)).data.id,rid,'Registration retries are idempotent');
  assert.equal((await api(`/api/events/${id}/register`,customer.cookie,'POST',{...regBody,requestId:randomUUID()})).status,409,'Duplicate child prevented');
  assert.equal((await api(`/api/event-registrations/${rid}/reconcile`,outsider.cookie,'POST')).status,404);
  assert.equal((await api(`/api/events/${id}`,customer.cookie)).data.meetingUrl,'','Unpaid guardian cannot see joining URL');
  const payPath=`/api/admin/event-registrations/${rid}/payments`;
  const firstPayment={type:'payment',amount:30,reference:'verification-first',note:'Actual manual payment recording test'};
  assert.equal((await api(payPath,customer.cookie,'POST',firstPayment)).status,403);
  const p1=await api(payPath,admin.cookie,'POST',firstPayment);
  assert.equal(p1.status,200,JSON.stringify(p1.data)); assert.equal(p1.data.balanceDue,50);
  assert.equal((await api(payPath,admin.cookie,'POST',firstPayment)).data.paid,30,'Payment reference retry is idempotent');
  assert.equal((await api(payPath,admin.cookie,'POST',{...firstPayment,reference:'overpayment',amount:51})).status,400);
  assert.equal((await api(payPath,admin.cookie,'POST',{...firstPayment,reference:'verification-final',amount:50})).data.paid,80);
  assert.equal((await api(`/api/events/${id}`,customer.cookie)).data.meetingUrl,config.meetingUrl);
  assert.equal((await api(`/api/events/${id}`)).data.meetingUrl,'');
  const attendance={sessionId:detail.data.sessions[0].id,registrationId:rid,status:'present'};
  assert.equal((await api(`/api/admin/events/${id}/attendance`,admin.cookie,'POST',attendance)).status,200);
  assert.equal((await api(`/api/admin/events/${id}/attendance/${attendance.sessionId}`,admin.cookie)).data[0].status,'present');

  // Native browser interactions verify the actual generated hooks, not just API capability.
  browser=await browserClient(); await browser.command('Network.enable');
  const signIn=async(cookie:string)=> {
    const at=cookie.indexOf('=');
    await browser!.command('Network.setCookie',{name:cookie.slice(0,at),value:cookie.slice(at+1),url:base,secure:true,httpOnly:true});
  };
  await signIn(customer.cookie);
  await browser.command('Page.navigate',{url:`${base}/services/events/${id}`});
  await browser.wait(`document.body?.innerText?.includes(${JSON.stringify(config.name)})`,'published event detail');
  await browser.wait(`!!document.querySelector('[data-testid="input-child-name"]')`,'event registration form');
  await browser.fill('[data-testid="input-child-name"]','Browser verified child');
  await browser.fill('[data-testid="input-child-age"]','9');
  await browser.click('[data-testid="checkbox-consent"]');
  await browser.click('[data-testid="button-register"]');
  await browser.wait(`document.body?.innerText?.includes('Registration received')`,'browser registration success');
  const browserReg=(await api('/api/event-registrations',customer.cookie)).data.find((r:any)=>r.childName==='Browser verified child');
  assert.ok(browserReg,'Actual customer browser registration saved');
  assert.equal((await api(`/api/events/${id}`)).data.availableSeats,0);
  await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await browser.command('Page.navigate',{url:`${base}/events/registrations`});
  await browser.wait(`!!document.querySelector('[data-testid="card-registration-${rid}"]')`,'phone registration list');
  assert.equal(await browser.evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,'Phone page has no horizontal overflow');
  await signIn(admin.cookie);
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1365,height:900,deviceScaleFactor:1,mobile:false});
  await browser.command('Page.navigate',{url:`${base}/admin-dashboard`});
  await browser.wait(`!!document.querySelector('[role="tab"][data-state]')`,'admin dashboard');
  await browser.click('[role="tab"]','Services'); await browser.click('[role="tab"]','Events');
  await browser.wait(`document.body?.innerText?.includes(${JSON.stringify(config.name)})`,'admin event management');
  await browser.click(`[data-testid="button-participants-${id}"]`);
  await browser.wait(`!!document.querySelector('[data-testid="row-participant-${rid}"]')`,'admin private participants');
  console.log('PASS: public/admin desktop and phone UI, real banner upload, guardian registration and privacy, manual payment accounting, attendance.');

  const changed={...config,startDate:day(9),endDate:day(9),startTime:'11:00',basePrice:150,discountedPrice:null};
  const edited=await api(`/api/admin/events/${id}`,admin.cookie,'PUT',changed);
  assert.equal(edited.status,200,JSON.stringify(edited.data)); assert.equal(edited.data.currentPrice,150);
  assert.equal(edited.data.sessions.find((s:any)=>s.id===attendance.sessionId).status,'cancelled','Old future schedule cancelled, attendance retained');
  assert.equal((await api(`/api/admin/events/${id}/attendance/${attendance.sessionId}`,admin.cookie)).data[0].status,'present');
  assert.equal((await api('/api/event-registrations',customer.cookie)).data.find((r:any)=>r.id===rid).fee,80,'Agreed fee is frozen');
  const cancelled=await api(`/api/event-registrations/${rid}/cancel`,admin.cookie,'POST',{reason:'Verification admin cancellation'});
  assert.equal(cancelled.status,200); assert.equal(cancelled.data.refundDue,80);
  const refund={type:'refund',amount:30,reference:'refund-partial',note:'Recorded external refund'};
  assert.equal((await api(payPath,admin.cookie,'POST',refund)).data.refundDue,50);
  assert.equal((await api(payPath,admin.cookie,'POST',{...refund,reference:'refund-final',amount:50})).data.refundDue,0);
  const notice=await api(`/api/admin/events/${id}/notify`,admin.cookie,'POST',{message:'Verification schedule reminder'});
  assert.equal(notice.status,200); assert.equal(notice.data.notified,1);
  assert.equal((await api(`/api/admin/events/${id}/notify`,admin.cookie,'POST',{message:'Repeated reminder'})).status,429);
  assert.equal((await api(`/api/admin/events/${id}/action`,admin.cookie,'POST',{action:'cancel',reason:'Verification event cancelled'})).status,200);
  assert.ok((await api('/api/event-registrations',customer.cookie)).data.every((r:any)=>r.eventId!==id||r.status==='cancelled'));

  const race=await api('/api/admin/events',admin.cookie,'POST',{...input(),name:`${tag} capacity`,capacity:1,basePrice:0,discountedPrice:null,paymentMode:'manual'});
  assert.equal(race.status,201); eventIds.push(race.data.id);
  const raceEvent=(await api(`/api/admin/events/${race.data.id}/action`,admin.cookie,'POST',{action:'publish',reason:''})).data;
  const attempts=await Promise.all([customer,outsider].map((owner,i)=>api(`/api/events/${raceEvent.id}/register`,owner.cookie,'POST',
    {...regBody,requestId:randomUUID(),eventVersion:raceEvent.version,childName:`Capacity child ${i}`})));
  assert.deepEqual(attempts.map(r=>r.status).sort(),[201,409],'Concurrent last-seat registration does not oversell');
  const free=attempts.find(r=>r.status===201)!; assert.equal(free.data.fee,0); assert.equal(free.data.paymentMethod,'free');

  const online=await api('/api/admin/events',admin.cookie,'POST',{...input(),name:`${tag} checkout`,capacity:2,paymentMode:'online'});
  assert.equal(online.status,201); eventIds.push(online.data.id);
  const onlineEvent=(await api(`/api/admin/events/${online.data.id}/action`,admin.cookie,'POST',{action:'publish',reason:''})).data;
  assert.equal(onlineEvent.checkoutMode,'test','Never charge live money during tests');
  const onlineReg=await api(`/api/events/${onlineEvent.id}/register`,customer.cookie,'POST',
    {...regBody,requestId:randomUUID(),eventVersion:onlineEvent.version,paymentMethod:'online'});
  assert.equal(onlineReg.status,201); const onlineId=onlineReg.data.id;
  assert.equal((await api(`/api/event-registrations/${onlineId}/checkout`,outsider.cookie,'POST')).status,404);
  const checkout=await api(`/api/event-registrations/${onlineId}/checkout`,customer.cookie,'POST');
  assert.equal(checkout.status,200,JSON.stringify({message:checkout.data?.message}));
  assert.equal(checkout.data.mode,'test'); assert.equal(new URL(checkout.data.url).hostname,'checkout.stripe.com');
  assert.equal((await api(`/api/event-registrations/${onlineId}/checkout`,customer.cookie,'POST')).data.url,checkout.data.url);
  const linked=(await pool.query('SELECT stripe_session_id,stripe_price_id FROM event_registrations WHERE id=$1',[onlineId])).rows[0];
  stripeSessions.push(linked.stripe_session_id); stripePrices.push(linked.stripe_price_id);
  const stripe=await getUncachableStripeClient(),session=await stripe.checkout.sessions.retrieve(linked.stripe_session_id);
  assert.equal(session.livemode,false); assert.equal(session.amount_total,8000);
  const price=await stripe.prices.retrieve(linked.stripe_price_id); stripeProducts.push(String(price.product));
  assert.equal(price.currency,'inr');
  assert.equal((await api(`/api/event-registrations/${onlineId}/reconcile`,customer.cookie,'POST',{paid:true})).data.paid,0,'Client paid flags never confirm money');
  assert.equal((await api(`/api/admin/event-registrations/${onlineId}/payments`,admin.cookie,'POST',firstPayment)).status,409,'Online payment cannot be manually marked paid');
  assert.equal((await api('/api/stripe/webhook','','POST',{type:'checkout.session.completed',data:{object:{...session,payment_status:'paid'}}},
    {'stripe-signature':'invalid-signature'})).status,400,'Forged webhook is rejected');
  // Unit-level handler fixture, not a real card payment: exercise idempotent
  // accounting after the trusted verification boundary without charging money.
  await completeEventPayment({...session,payment_status:'paid'});
  await completeEventPayment({...session,payment_status:'paid'});
  const verified=(await api('/api/event-registrations',customer.cookie)).data.find((r:any)=>r.id===onlineId);
  assert.equal(verified.paid,80); assert.equal(verified.isTest,true); assert.equal(verified.payments.length,1);
  assert.deepEqual((await pool.query('SELECT stripe_payments_enabled,advance_percentage FROM app_settings LIMIT 1')).rows[0],originalPujaPayments);
  console.log('PASS: rescheduling/history, frozen fees, cancellations/refund tracking, notifications/rate limits, concurrent capacity, free registration, real TEST hosted checkout, unpaid reconciliation/signature rejection, idempotent payment-handler fixture. No real charge made; puja payment settings unchanged.');
} finally {
  if(browser) await browser.close();
  if(stripeSessions.length) {
    const stripe=await getUncachableStripeClient();
    for(const id of stripeSessions) try { await stripe.checkout.sessions.expire(id); } catch {}
    for(const id of stripePrices) try { await stripe.prices.update(id,{active:false}); } catch {}
    for(const id of stripeProducts) try { await stripe.products.update(id,{active:false}); } catch {}
  }
  if(eventIds.length) await pool.query('DELETE FROM religious_events WHERE id=ANY($1)',[eventIds]);
  for(const id of mediaIds) {
    const row=(await pool.query('SELECT object_path FROM event_media WHERE id=$1',[id])).rows[0];
    if(row) { try { await (await new ObjectStorageService().getObjectEntityFile(row.object_path)).delete(); } catch {} }
    await pool.query('DELETE FROM event_media WHERE id=$1',[id]);
  }
  await pool.query(`DELETE FROM notifications WHERE "userId"=ANY($1) OR message LIKE $2`,[users,`%${tag}%`]);
  if(users.length) {
    await pool.query(`DELETE FROM user_sessions WHERE (sess->>'userId')::text=ANY($1::text[])`,[users.map(String)]);
    await pool.query('DELETE FROM users WHERE id=ANY($1)',[users]);
  }
  await pool.end();
}
