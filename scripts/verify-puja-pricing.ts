import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { openBrowserTest } from './browserTest';

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (process.env.NODE_ENV === 'production' || !base.endsWith('.replit.dev')) throw new Error('Development verification only');
const tag = `PricingQA-${randomBytes(5).toString('hex')}`, password = randomBytes(16).toString('hex');
const users: number[] = [], cookies: string[] = [], rules: number[] = [], bookings: number[] = [];
const fixturePujas: number[] = [], datedAdjustments: number[] = [];
let pujaId: number | undefined, profileId: number | undefined;
let browser: Awaited<ReturnType<typeof openBrowserTest>> | undefined;
async function api(path: string, cookie?: string, method = 'GET', data?: unknown) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? {Cookie:cookie} : {}) },
    ...(data === undefined ? {} : {body:JSON.stringify(data)}) });
  const text = await response.text();
  return {status:response.status,body:text ? JSON.parse(text) : null,headers:response.headers};
}
async function account(role: 'customer' | 'admin' | 'guruji') {
  const user = await new DBStorage().createUser({firstName:'PricingQA',lastName:role,email:`${tag}-${role}@example.invalid`,
    mobile:`9${randomInt(100000000,999999999)}`,password,role} as any);
  users.push(user.id);
  const login = await api(role === 'admin' ? '/api/admin/login' : '/api/auth/login', undefined, 'POST',{email:user.email,password});
  assert.equal(login.status,200);
  const cookie = login.headers.get('set-cookie')!.split(';')[0]; cookies.push(cookie);
  return {id:user.id,cookie};
}
function schedule(hours: number) {
  const india = new Date(Date.now() + (hours * 60 + 330) * 60_000);
  const hour = india.getUTCHours();
  return {calendarDate:india.toISOString().slice(0,10),
    time:`${hour % 12 || 12}:${String(india.getUTCMinutes()).padStart(2,'0')} ${hour >= 12 ? 'PM' : 'AM'}`};
}
async function clickText(selector: string, text: string) {
  const element = `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(el=>el.textContent.trim()===${JSON.stringify(text)})`;
  await browser!.wait(`!!${element}`, text);
  if (selector === '[role="tab"]') {
    await browser!.evaluate(`${element}.focus()`);
    await browser!.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await browser!.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  } else await browser!.evaluate(`${element}.click()`);
}
async function navigate(cookie: string, path: string, ready: string) {
  const eq = cookie.indexOf('=');
  await browser!.command('Network.setCookie',{name:cookie.slice(0,eq),value:cookie.slice(eq+1),url:base});
  await browser!.command('Page.navigate',{url:base+path});
  await browser!.wait(ready,path);
}
async function replaceInput(selector: string, value: string) {
  await browser!.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await browser!.command('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
  await browser!.command('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
  await browser!.command('Input.insertText',{text:value});
}
async function setDate(selector: string, value: string) {
  await browser!.evaluate(`(() => { const input=document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});
    input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
}
try {
  const admin = await account('admin'), customer = await account('customer'), guruji = await account('guruji');
  const created = await api('/api/pujas',admin.cookie,'POST',{name:tag,description:'Isolated pricing verification fixture.',
    basePrice:3000,price:3000,type:'offline',duration:60,isActive:true});
  assert.equal(created.status,201,JSON.stringify(created.body)); pujaId = created.body.id;
  fixturePujas.push(pujaId!);
  for (const [suffix,price] of [['second',4000],['unrelated',3000]] as const) {
    const result = await api('/api/pujas',admin.cookie,'POST',{name:`${tag}-${suffix}`,description:'Isolated pricing fixture.',
      basePrice:price,price,type:'offline',duration:60,isActive:true});
    assert.equal(result.status,201); fixturePujas.push(result.body.id);
  }
  profileId = (await pool.query(`INSERT INTO guruji_profiles
    ("userId",city,specialities,experience,"pricePerHour",status,"isVerified","isAvailable","createdAt","updatedAt")
    VALUES ($1,'Pune',$2,5,1000,'approved',true,true,NOW(),NOW()) RETURNING id`,[guruji.id,[String(pujaId)]])).rows[0].id;
  assert.equal((await api('/api/admin/pricing/rules')).status,401);
  assert.equal((await api('/api/admin/pricing/rules',customer.cookie)).status,403);
  const adjust = (mode: string,value: number,expectedPrice: number) => api(`/api/admin/pujas/${pujaId}/adjust-price`,admin.cookie,'POST',{mode,value,expectedPrice});
  assert.equal((await adjust('percent',10,3000)).body.price,3300);
  assert.equal((await adjust('amount',-300,3000)).status,409);
  assert.equal((await adjust('amount',-300,3300)).body.price,3000);
  assert.equal((await adjust('fixed',3500,3000)).body.price,3500);
  assert.equal((await adjust('percent',-100,3500)).status,400);
  assert.equal((await adjust('amount',-500,3500)).body.price,3000);
  assert.equal((await api(`/api/admin/pujas/${pujaId}/adjust-price`,customer.cookie,'POST',{mode:'fixed',value:1,expectedPrice:3000})).status,403);
  const createRule = async (withinHours: number,mode: string,value: number) => {
    const result = await api('/api/admin/pricing/rules',admin.cookie,'POST',{
      pujaId,name:`${tag}-${withinHours}h`,withinHours,mode,value,customerMessage:'Extra preparation for short-notice requests.',enabled:true});
    assert.equal(result.status,201,JSON.stringify(result.body)); rules.push(result.body.id); return result.body;
  };
  const twentyFour = await createRule(24,'percent',60);
  const twelve = await createRule(12,'fixed',5000);
  const four = await createRule(4,'amount',5000);
  assert.equal((await api('/api/admin/pricing/rules',admin.cookie,'POST',twelve)).status,409);
  const quote = async (hours: number, id = pujaId) => api('/api/pricing/quote',undefined,'POST',{pujaId:id,...schedule(hours),withSamagri:false});
  assert.equal((await quote(30)).body.totalAmount,3000);
  assert.equal((await quote(18)).body.totalAmount,4800);
  const short = await quote(7);
  assert.equal(short.status,200); assert.equal(short.body.totalAmount,5000);
  assert.match(short.body.explanation,/within 12 hours/);
  assert.equal((await quote(2)).body.totalAmount,8000);
  assert.equal((await quote(-1)).status,400);
  assert.equal((await api('/api/admin/pricing/rules',admin.cookie,'POST',{...twelve,withinHours:0})).status,400);
  assert.equal((await api('/api/admin/pricing/rules',admin.cookie,'POST',{...twelve,withinHours:9,mode:'amount',value:-4000})).status,400);
  assert.equal((await api(`/api/admin/pricing/rules/${twelve.id}`,admin.cookie,'PUT',{...twelve,enabled:false})).status,200);
  assert.equal((await quote(7)).body.totalAmount,4800);
  assert.equal((await api(`/api/admin/pricing/rules/${twelve.id}`,admin.cookie,'PUT',twelve)).status,200);
  console.log('PASS: admin-only price increases/decreases, optimistic conflicts, rule CRUD, enable/disable and 24/12/4-hour quote precedence');

  const when = schedule(7);
  const request = {pujaId,type:'offline',amount:1,calendarDate:when.calendarDate,date:`${when.calendarDate}T12:00:00.000Z`,
    time:when.time,city:'Pune',address:tag,pincode:'411001',gurujiId:profileId,withSamagri:false};
  assert.equal((await api('/api/bookings',customer.cookie,'POST',request)).status,409);
  const booking = await api('/api/bookings',customer.cookie,'POST',{...request,amount:5000});
  assert.equal(booking.status,201,JSON.stringify(booking.body));
  bookings.push(booking.body.id);
  assert.equal(booking.body.amount,5000); assert.equal(booking.body.pricingSnapshot.totalAmount,5000);
  assert.equal(booking.body.pricingSnapshot.regularPrice,3000); assert.equal(booking.body.pricingSnapshot.rule.id,twelve.id);
  assert.equal(booking.body.status,'pending_approval');
  assert.equal((await api(`/api/admin/pricing/rules/${twelve.id}`,admin.cookie,'PUT',{...twelve,value:5500})).status,200);
  const preserved = await api(`/api/bookings/${booking.body.id}`,customer.cookie);
  assert.equal(preserved.body.amount,5000); assert.equal(preserved.body.pricingSnapshot.totalAmount,5000);
  console.log('PASS: server rejects tampered/stale prices, snapshots agreed price/reason and preserves existing bookings after rule edits');

  const selectedIds = fixturePujas.slice(0,2);
  const multiRule = await api(`/api/admin/pricing/rules/${twentyFour.id}`,admin.cookie,'PUT',{...twentyFour,pujaIds:selectedIds});
  assert.equal(multiRule.status,200); assert.deepEqual(multiRule.body.pujaIds,selectedIds);
  assert.equal((await quote(18,fixturePujas[1])).body.totalAmount,6400);
  assert.equal((await quote(18,fixturePujas[2])).body.totalAmount,3000);
  assert.equal((await quote(30,fixturePujas[1])).body.totalAmount,4000);
  assert.equal((await api('/api/admin/pricing/rules',admin.cookie,'POST',{...twentyFour,pujaIds:[fixturePujas[1]],name:`${tag}-overlap`})).status,409);
  const datedPayload = {pujaIds:selectedIds,fromDate:schedule(0).calendarDate,toDate:schedule(54).calendarDate,mode:'amount',value:500};
  assert.equal((await api('/api/admin/pricing/regular-adjustments')).status,401);
  assert.equal((await api('/api/admin/pricing/regular-adjustments',customer.cookie,'POST',datedPayload)).status,403);
  const dated = await api('/api/admin/pricing/regular-adjustments',admin.cookie,'POST',datedPayload);
  assert.equal(dated.status,201,JSON.stringify(dated.body)); datedAdjustments.push(dated.body.id);
  const datedShort = (await quote(18)).body;
  assert.equal(datedShort.regularPrice,3000); assert.equal(datedShort.regularAdjustment,500);
  assert.equal(datedShort.timeAdjustment,2100); assert.equal(datedShort.adjustment,2600);
  assert.equal(datedShort.totalAmount,5600);
  assert.equal(datedShort.regularPrice+datedShort.regularAdjustment+datedShort.timeAdjustment+datedShort.samagriPrice,datedShort.totalAmount);
  assert.equal((await quote(18,fixturePujas[1])).body.totalAmount,7200);
  assert.equal((await quote(18,fixturePujas[2])).body.totalAmount,3000);
  assert.equal((await quote(30)).body.totalAmount,3500);
  assert.equal((await quote(90)).body.totalAmount,3000);
  assert.equal((await api('/api/admin/pricing/regular-adjustments',admin.cookie,'POST',datedPayload)).status,409);
  assert.equal((await api('/api/admin/pricing/regular-adjustments',admin.cookie,'POST',{...datedPayload,toDate:'2000-01-01'})).status,400);
  assert.equal((await api('/api/admin/pricing/regular-adjustments',admin.cookie,'POST',{...datedPayload,pujaIds:[],value:10})).status,400);
  assert.equal((await api(`/api/admin/pricing/regular-adjustments/${dated.body.id}`,customer.cookie,'DELETE')).status,403);
  assert.equal((await api(`/api/admin/pricing/regular-adjustments/${dated.body.id}`,admin.cookie,'DELETE')).status,204);
  assert.equal((await quote(30)).body.totalAmount,3000);
  assert.equal((await api(`/api/bookings/${booking.body.id}`,customer.cookie)).body.amount,5000);
  console.log('PASS: multi-puja membership, 24-hour removal, inclusive dated rates, additive totals, overlap prevention and deletion restoring baseline');

  browser = await openBrowserTest(); await browser.command('Network.enable');
  await browser.command('Emulation.setTimezoneOverride',{timezoneId:'Asia/Kolkata'});
  await navigate(admin.cookie,'/admin-dashboard',`Array.from(document.querySelectorAll('[role="tab"]')).some(el=>el.textContent.trim()==='Pujas')`);
  await clickText('[role="tab"]','Pujas');
  await browser.wait(`!!document.querySelector('[aria-label="Search puja catalogue"]')`,'catalogue search');
  await replaceInput('[aria-label="Search puja catalogue"]',tag);
  await browser.wait(`document.querySelectorAll('tbody tr').length===3`,'filtered catalogue fixtures');
  await browser.wait(`Array.from(document.querySelectorAll('[role="tab"]')).some(el=>el.textContent.trim()==='Pricing & Rules')`,'visible pricing navigation');
  await clickText('[role="tab"]','Pricing & Rules');
  await browser.wait(`document.body.innerText.includes(${JSON.stringify(`${tag}-12h`)}) && document.body.innerText.includes('Pricing rules')`,'admin pricing controls');
  await clickText('button','Add rule');
  await browser.wait(`!!document.querySelector('#rule-name')`,'rule creation dialog');
  const uiName = `${tag}-UI`;
  await replaceInput('#rule-name',uiName);
  await browser.evaluate(`document.querySelector('[role="dialog"] fieldset [role="checkbox"]').click()`);
  await replaceInput('[role="dialog"] input[aria-label="Search pujas"]',tag);
  await browser.evaluate(`document.querySelector('#rule-puja-${pujaId}').click()`);
  await browser.evaluate(`document.querySelector('#rule-puja-${fixturePujas[1]}').click()`);
  await replaceInput('#rule-window',String(6.5 + randomInt(1,999)/100000));
  await replaceInput('#rule-value','40');
  await clickText('[role="dialog"] button','Create rule');
  await browser.wait(`!document.querySelector('[role="dialog"]') && document.body.innerText.includes(${JSON.stringify(uiName)})`,'created rule through admin form');
  const uiRule = (await api('/api/admin/pricing/rules',admin.cookie)).body.find((r: any)=>r.name===uiName);
  assert.ok(uiRule); rules.push(uiRule.id); assert.equal(uiRule.enabled,false);
  assert.deepEqual(uiRule.pujaIds,selectedIds);
  await browser.evaluate(`document.querySelector(${JSON.stringify(`button[aria-label="Edit ${uiName}"]`)}).click()`);
  await browser.wait(`!!document.querySelector('#rule-value')`,'rule editing');
  await replaceInput('#rule-value','30');
  await clickText('[role="dialog"] button','Save changes');
  await browser.wait(`!document.querySelector('[role="dialog"]')`,'saved rule edit');
  assert.equal((await api('/api/admin/pricing/rules',admin.cookie)).body.find((r: any)=>r.id===uiRule.id).value,30);
  await replaceInput('input[aria-label="Search pujas"]',tag);
  await browser.evaluate(`document.querySelector('#regular-puja-${pujaId}').click()`);
  await browser.evaluate(`document.querySelector('#regular-puja-${fixturePujas[1]}').click()`);
  await setDate('#adjust-from',datedPayload.fromDate);
  await setDate('#adjust-to',datedPayload.toDate);
  await replaceInput('#adjust-value','250');
  await clickText('button','Save dated adjustment');
  await browser.wait(`!!Array.from(document.querySelectorAll('button')).find(el=>el.getAttribute('aria-label')?.startsWith('Delete dated adjustment for '+${JSON.stringify(tag)}))`,'saved dated adjustment');
  const uiAdjustment = (await api('/api/admin/pricing/regular-adjustments',admin.cookie)).body.find((a: any)=>a.pujaIds.includes(pujaId));
  assert.ok(uiAdjustment); datedAdjustments.push(uiAdjustment.id); assert.deepEqual(uiAdjustment.pujaIds,selectedIds);
  assert.equal((await api(`/api/pujas/${pujaId}`)).body.price,3000);
  assert.equal((await api(`/api/admin/pricing/rules/${uiRule.id}`,customer.cookie,'DELETE')).status,403);
  assert.equal((await api(`/api/admin/pricing/rules/${uiRule.id}`,admin.cookie,'DELETE')).status,204);
  assert.ok(!(await api('/api/admin/pricing/rules',admin.cookie)).body.some((r: any)=>r.id===uiRule.id));
  console.log('PASS: admin searches catalogue and selections, creates/edits a multi-puja rule and saves dated adjustments through real controls');
  await navigate(customer.cookie,`/booking/${booking.body.id}`,`document.body.innerText.includes('Price at booking')`);
  assert.ok(await browser.evaluate(`document.body.innerText.includes('5,000') && document.body.innerText.includes('within 12 hours')`));
  console.log('PASS: signed-in admin Pujas controls load and customer booking detail displays the saved price breakdown and explanation');
  const bookingPath = `/booking?puja=${pujaId}`;
  const draft = {returnTo:bookingPath,activeStep:2,bookingType:'offline',consultationType:'own_guruji',gurujiSelectionMode:'specific',
    selectedPujaId:String(pujaId),selectedDate:when.calendarDate,selectedTime:when.time,selectedCity:'Pune',address:tag,
    pincode:'411001',selectedGurujiId:String(profileId),withSamagri:false};
  await browser.evaluate(`sessionStorage.setItem('guruji-booking-registration-draft',${JSON.stringify(JSON.stringify(draft))})`);
  await navigate(customer.cookie,bookingPath,`document.querySelector('[aria-label="Price breakdown"]')?.innerText.includes('5,500')`);
  assert.ok(await browser.evaluate(`document.querySelector('[aria-label="Price breakdown"]').innerText.includes('within 12 hours')`));
  const additiveRows = await browser.evaluate(`Array.from(document.querySelectorAll('[aria-label="Price breakdown"] dl dd')).map(el=>Number(el.textContent.replace(/[₹,+\\s]/g,'')))`);
  assert.equal(additiveRows.slice(0,-1).reduce((sum: number,value: number)=>sum+value,0),additiveRows.at(-1));
  assert.ok(await browser.evaluate(`!document.querySelector('[aria-label="Price breakdown"]').innerText.includes('Adjusted puja price')`));
  const later = schedule(30), day = Number(later.calendarDate.slice(-2));
  await browser.evaluate(`Array.from(document.querySelectorAll('button[name="day"]')).find(el=>el.textContent.trim()===${JSON.stringify(String(day))} && !el.disabled).click()`);
  const laterHour = Math.max(6,Math.min(20,new Date(Date.now()+(30*60+330)*60_000).getUTCHours()));
  await clickText('button',`${String(laterHour%12||12).padStart(2,'0')}:00 ${laterHour>=12?'PM':'AM'}`);
  await browser.wait(`document.querySelector('[aria-label="Price breakdown"]')?.innerText.includes('3,250') && !document.querySelector('[aria-label="Price breakdown"] dl')?.innerText.includes('Short-notice adjustment')`,'later selected puja date removes urgency fee');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:1,mobile:true});
  await browser.wait(`document.querySelector('[aria-label="Price breakdown"]')?.innerText.includes('3,250')`,'phone booking quote');
  assert.ok(await browser.evaluate(`document.documentElement.scrollWidth <= innerWidth + 2`));
  console.log('PASS: customer sees current regular/final prices and short-notice explanation before booking on desktop and phone');
  await clickText('button','Continue');
  await browser.wait(`!!document.querySelector('input[name="gurujiMode"][value="specific"]') && !!document.querySelector('input[name="gurujiMode"][value="auto_nearby"]')`,'existing manual and automated Guruji choices');
  await browser.wait(`Array.from(document.querySelectorAll('h3')).some(el=>el.textContent.includes('Pandit PricingQA guruji'))`,'available fixture Guruji');
  await browser.evaluate(`Array.from(document.querySelectorAll('h3')).find(el=>el.textContent.includes('Pandit PricingQA guruji')).closest('[class*="cursor-pointer"]').click()`);
  await clickText('button','Review Booking Request');
  await browser.wait(`document.body.innerText.includes('Send your booking request')`,'manual selection reaches existing request review');
  let reviewDraft = await browser.evaluate(`JSON.parse(sessionStorage.getItem('guruji-booking-registration-draft'))`);
  assert.equal(reviewDraft.gurujiSelectionMode,'specific'); assert.equal(Number(reviewDraft.selectedGurujiId),profileId);
  await clickText('button','Back');
  await browser.wait(`!!document.querySelector('input[name="gurujiMode"][value="auto_nearby"]')`,'back to Guruji selection');
  await browser.evaluate(`document.querySelector('input[name="gurujiMode"][value="auto_nearby"]').click()`);
  await clickText('button','Review Booking Request');
  await browser.wait(`document.body.innerText.includes('Send your booking request')`,'automated selection reaches existing request review');
  reviewDraft = await browser.evaluate(`JSON.parse(sessionStorage.getItem('guruji-booking-registration-draft'))`);
  assert.equal(reviewDraft.gurujiSelectionMode,'auto_nearby');
  await clickText('button','Back'); await clickText('button','Back');
  await browser.wait(`document.body.innerText.includes('All puja times are in India Standard Time')`,'date and location step');
  await browser.command('Network.setBlockedURLs',{urls:[`${base}/api/pricing/quote`]});
  await clickText('button',laterHour === 6 ? '07:00 AM' : '06:00 AM');
  await clickText('button','Continue');
  await browser.wait(`!!document.querySelector('input[name="gurujiMode"][value="specific"]') && !!document.querySelector('input[name="gurujiMode"][value="auto_nearby"]')`,'quote outage does not block Guruji selection');
  await clickText('button','Review Booking Request');
  await browser.wait(`document.body.innerText.includes('Confirm current price to continue')`,'price is required only at final confirmation');
  reviewDraft = await browser.evaluate(`JSON.parse(sessionStorage.getItem('guruji-booking-registration-draft'))`);
  assert.equal(reviewDraft.activeStep,4); assert.equal(reviewDraft.gurujiSelectionMode,'auto_nearby');
  await clickText('button','Back');
  await browser.wait(`!!document.querySelector('input[name="gurujiMode"][value="auto_nearby"]')`,'back navigation remains available during a quote outage');
  await browser.command('Network.setBlockedURLs',{urls:[]});
  console.log('PASS: original manual/automated selection and review navigation remain intact, even when pricing is temporarily unavailable');
  await navigate(admin.cookie,'/admin-dashboard',`Array.from(document.querySelectorAll('[role="tab"]')).some(el=>el.textContent.trim()==='Pujas')`);
  await clickText('[role="tab"]','Pujas'); await clickText('[role="tab"]','Pricing & Rules');
  await browser.wait(`!!Array.from(document.querySelectorAll('button')).find(el=>el.getAttribute('aria-label')?.startsWith('Delete dated adjustment for '+${JSON.stringify(tag)}))`,'dated adjustment delete control');
  await browser.evaluate(`(() => { window.confirm=(message)=>{window.__deleteConfirmation=message;return true};
    Array.from(document.querySelectorAll('button')).find(el=>el.getAttribute('aria-label')?.startsWith('Delete dated adjustment for '+${JSON.stringify(tag)})).click(); })()`);
  await browser.wait(`!Array.from(document.querySelectorAll('button')).some(el=>el.getAttribute('aria-label')?.startsWith('Delete dated adjustment for '+${JSON.stringify(tag)}))`,'dated adjustment deleted');
  assert.ok(await browser.evaluate(`window.__deleteConfirmation.includes('Existing bookings will not change')`));
  assert.equal((await quote(30)).body.totalAmount,3000);
  assert.equal((await api(`/api/bookings/${booking.body.id}`,customer.cookie)).body.amount,5000);
  console.log('PASS: customer date selection removes time surcharge; admin delete restores regular price without changing existing booking');
} finally {
  if (browser) await browser.close();
  await Promise.all(cookies.map(cookie=>api('/api/auth/logout',cookie,'POST')));
  await pool.query('DELETE FROM notifications WHERE "userId"=ANY($1::int[])',[users]);
  await pool.query('DELETE FROM booking_requests WHERE "bookingId"=ANY($1::int[])',[bookings]);
  await pool.query('DELETE FROM bookings WHERE id=ANY($1::int[])',[bookings]);
  await pool.query('DELETE FROM puja_pricing_rules WHERE id=ANY($1::int[])',[rules]);
  await pool.query('DELETE FROM puja_pricing_rules WHERE name LIKE $1',[`${tag}%`]);
  await pool.query('DELETE FROM puja_regular_price_adjustments WHERE id=ANY($1::int[]) OR (puja_ids<@$2::int[] AND puja_ids && $2::int[])',[datedAdjustments,fixturePujas]);
  if (profileId) await pool.query('DELETE FROM guruji_profiles WHERE id=$1',[profileId]);
  await pool.query('DELETE FROM pujas WHERE id=ANY($1::int[])',[fixturePujas]);
  await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[users]);
  await pool.end();
  console.log('All isolated pricing verification fixtures removed.');
}
