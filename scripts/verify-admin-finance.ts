import assert from 'node:assert/strict';
import { randomBytes,randomInt } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { indiaToday,receiptSettlement } from '../server/gurujiFinanceStore';
import { duePeriods,recurringDueDate } from '../server/gurujiFinanceScheduler';
import { financeCsv } from '../server/gurujiFinanceReports';
import { openBrowserTest } from './browserTest';

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`,root='/api/admin/guruji-finance';
if(process.env.NODE_ENV==='production'||!base.endsWith('.replit.dev'))throw new Error('Development verification only');
const tag=`FinanceQA-${randomBytes(5).toString('hex')}`,password=randomBytes(24).toString('hex');
const store=new DBStorage(),users:number[]=[],profiles:number[]=[],bookingIds:number[]=[],ruleIds:number[]=[],eventIds:number[]=[];
const today=indiaToday(),month=today.slice(0,7);
let pujaId:number,browser:Awaited<ReturnType<typeof openBrowserTest>>|undefined;
async function api(path:string,cookie?:string,method='GET',body?:any) {
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await response.text();
  let data:any;try{data=JSON.parse(text);}catch{data=text;}
  return{status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function account(role:string,label:string) {
  const user=await store.createUser({firstName:tag,lastName:label,email:`${tag}-${label}@example.invalid`,mobile:`9${randomInt(100000000,999999999)}`,
    password,role,age:30,gender:'other'}as any);
  users.push(user.id);
  const login=await api(role==='admin'?'/api/admin/login':'/api/auth/login',undefined,'POST',{email:user.email,password});
  assert.equal(login.status,200);return{...user,cookie:login.cookie!};
}
async function click(expression:string) {
  await browser!.wait(`!!(${expression})`,'control');
  await browser!.evaluate(`(${expression}).scrollIntoView({block:'center',behavior:'instant'})`);
  try {
    await browser!.wait(`(()=>{const e=(${expression}),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit)})()`,'uncovered control');
  }catch(error){
    console.log(await browser!.evaluate(`(()=>{const e=(${expression}),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{bodyPointerEvents:getComputedStyle(document.body).pointerEvents,target:e.textContent,targetRect:{x:r.x,y:r.y,width:r.width,height:r.height},hit:hit?.tagName,overlayError:document.querySelector('vite-error-overlay')?.shadowRoot?.textContent?.slice(-5000),openLayers:Array.from(document.querySelectorAll('[role="dialog"],[role="listbox"]')).map(e=>({role:e.getAttribute('role'),state:e.getAttribute('data-state')}))}})()`));
    throw error;
  }
  const rect=await browser!.evaluate(`(()=>{const r=(${expression}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await browser!.command('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'left',clickCount:1});
  await browser!.command('Input.dispatchMouseEvent',{type:'mouseReleased',...rect,button:'left',clickCount:1});
}
const btn=(text:string)=>`Array.from(document.querySelectorAll('button')).find(el=>el.textContent.trim()===${JSON.stringify(text)})`;
async function fill(selector:string,value:string) {
  await browser!.wait(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`,'editable field');
  await browser!.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});
    e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
}
async function choose(selector:string,value:string) {
  await click(`document.querySelector(${JSON.stringify(selector)})`);
  const index=await browser!.evaluate(`Array.from(document.querySelectorAll('[role="option"]')).findIndex(e=>e.textContent.trim()===${JSON.stringify(value)})`);
  assert.ok(index>=0,`Option exists: ${value}`);
  for(let i=0;i<=index;i++){
    const key=i===0?'Home':'ArrowDown';
    await browser!.command('Input.dispatchKeyEvent',{type:'keyDown',key});
    await browser!.command('Input.dispatchKeyEvent',{type:'keyUp',key});
    await browser!.wait(`document.activeElement===document.querySelectorAll('[role="option"]')[${i}]`,'native option focus');
  }
  await browser!.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter'});
  await browser!.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter'});
  await browser!.wait(`!document.querySelector('[role="listbox"]')`,'selection popover fully closed');
}
try {
  assert.equal(recurringDueDate('2028-02',31),'2028-02-29');
  assert.equal(recurringDueDate('2027-02',31),'2027-02-28');
  assert.deepEqual(duePeriods('2026-11',null,1,'2026-10-31'),[]);
  assert.deepEqual(duePeriods('2026-01','2026-02',31,'2026-03-15').map(p=>p.date),['2026-01-31','2026-02-28']);
  assert.match(financeCsv([{name:'=HYPERLINK("bad")',balance:-25}]),/'=HYPERLINK/);
  const allocation={portalAmount:200,gurujiAmount:800,percentage:20};
  const fixture={status:'completed',gurujiId:1,totalAmount:1000,commission_snapshot:allocation};
  assert.equal(receiptSettlement(fixture,[]).signedTarget,0);
  assert.equal(receiptSettlement(fixture,[{received_by:'portal',amount:250}]).status,'partial');
  assert.equal(receiptSettlement(fixture,[{received_by:'portal',amount:250},{received_by:'guruji',guruji_id:1,amount:750}]).signedTarget,-50*100);
  assert.equal(receiptSettlement(fixture,[{received_by:'portal',amount:200},{received_by:'guruji',guruji_id:2,amount:800}]).status,'manual_review_required');
  console.log('PASS: cash settlement arithmetic, unknown/partial/previous-Guruji safeguards, month-end/leap/catch-up scheduling and CSV injection protection');
  const admin=await account('admin','admin'),customer=await account('customer','customer');
  const a=await account('guruji','A'),b=await account('guruji','B');
  for(const user of [a,b]) {
    const g=(await pool.query(`INSERT INTO guruji_profiles("userId",city,pincode,experience,"pricePerHour","isVerified","isAvailable","createdAt","updatedAt",status,specialities,aadhar_verified,documents_verified)
      VALUES($1,$2,'900222',1,100,true,true,NOW(),NOW(),'approved',$3,true,true) RETURNING id`,[user.id,tag,[tag]])).rows[0];
    profiles.push(g.id);
  }
  const puja=await api('/api/pujas',admin.cookie,'POST',{name:tag,description:tag,type:'offline',duration:60,basePrice:1000,price:1000,isActive:true});
  assert.equal(puja.status,201);pujaId=puja.data.id;
  async function book(gurujiId:number,amount=1000,legacy=false) {
    const record=await store.createBooking({customerId:customer.id,gurujiId,pujaId,type:'offline',date:new Date(`${today}T12:00:00Z`),time:'10:00 AM',
      city:tag,address:'Isolated finance verification address',pincode:'900222',amount,status:'completed',withSamagri:false}as any);
    bookingIds.push(record.id);
    await pool.query(`UPDATE bookings SET status='completed',commission_snapshot=$2 WHERE id=$1`,
      [record.id,legacy?null:JSON.stringify({portalAmount:amount*.2,gurujiAmount:amount*.8,bookingAmount:amount,percentage:20})]);
    return record.id;
  }
  const first=await book(profiles[0]),second=await book(profiles[1]),legacy=await book(profiles[0],1000,true);
  const filter=`?from=${month}-01&to=${today}&search=${encodeURIComponent(tag)}`;
  const report=async()=>{
    const r=await api(root+filter,admin.cookie);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;
  };
  assert.equal((await api(root)).status,401);
  for(const user of [customer,a])for(const [path,method]of [[root,'GET'],[root+'/entries','POST'],[root+'/recurring','POST'],[root+'/cases','POST'],[root+'/run','POST'],[root+'/export','GET']])
    assert.equal((await api(path,user.cookie,method,method==='POST'?{}:undefined)).status,403);
  console.log('PASS: every finance capability is restricted to genuine, current, unblocked admin accounts');
  let data=await report();
  assert.equal(data.gurujis.length,2);assert.equal(data.summary.completedCount,3);assert.equal(data.summary.unallocatedCount,1);
  assert.equal(data.summary.netBalance,0);assert.equal(data.bookings.find((v:any)=>v.id===legacy).gurujiAllocation,null);
  const entry={gurujiId:profiles[0],category:'fine',direction:'guruji_owes_portal',amount:500.5,occurredOn:today,description:`${tag} reviewed fine`,reference:tag};
  const fine=await api(root+'/entries',admin.cookie,'POST',entry);assert.equal(fine.status,201,JSON.stringify(fine.data));
  const paid=await api(root+'/entries',admin.cookie,'POST',{...entry,category:'settlement',direction:'portal_owes_guruji',amount:200,description:`${tag} actual transfer`,reference:`${tag}-transfer`});
  assert.equal(paid.status,201);
  assert.equal((await report()).summary.netBalance,300.5);
  assert.equal((await api(root+'/entries',admin.cookie,'POST',{...entry,amount:1.001})).status,400);
  const rev=await api(`${root}/entries/${fine.data.id}/reverse`,admin.cookie,'POST',{reason:'Correcting the fixture fine'});
  assert.equal(rev.status,201);
  assert.equal((await api(`${root}/entries/${fine.data.id}/reverse`,admin.cookie,'POST',{reason:'Duplicate correction prevented'})).status,409);
  assert.equal((await report()).summary.netBalance,-200);
  assert.equal((await api(root+'/receipts',admin.cookie,'POST',{bookingId:first,receivedBy:'portal',amount:250,receivedOn:today,reference:tag+'-advance'})).status,201);
  assert.equal((await report()).bookings.find((r:any)=>r.id===first).settlementStatus,'partial');
  const balance=await api(root+'/receipts',admin.cookie,'POST',{bookingId:first,receivedBy:'guruji',amount:750,receivedOn:today,reference:tag+'-balance'});
  assert.equal(balance.status,201);
  data=await report();assert.equal(data.bookings.find((r:any)=>r.id===first).postedSettlementSignedAmount,-50);
  assert.equal(data.summary.netBalance,-250);
  assert.equal((await api(root+'/receipts',admin.cookie,'POST',{bookingId:first,receivedBy:'portal',amount:1,receivedOn:today,reference:tag+'-too-much'})).status,400);
  const systemEntry=data.ledger.find((l:any)=>l.sourceType==='booking_settlement');
  assert.equal((await api(`${root}/entries/${systemEntry.id}/reverse`,admin.cookie,'POST',{reason:'Invalid direct system reversal'})).status,400);
  assert.equal((await api(`${root}/receipts/${balance.data.id}/void`,admin.cookie,'POST',{reason:'Fixture receipt entered incorrectly'})).status,200);
  assert.equal((await report()).summary.netBalance,-200);
  for(const [by,amount]of [['portal',100],['guruji',900]] as const)
    assert.equal((await api(root+'/receipts',admin.cookie,'POST',{bookingId:second,receivedBy:by,amount,receivedOn:today,reference:tag+'-'+by})).status,201);
  assert.equal((await report()).gurujis.find((g:any)=>g.id===profiles[1]).netBalance,100);
  console.log('PASS: immutable signed balances, genuine receipt reconciliation in both directions, no inferred payments, overpayment rejection and audited corrections');
  const recurring={name:tag+' monthly',amount:25.25,dayOfMonth:1,startMonth:month,endMonth:null,gurujiIds:[profiles[0]],isActive:true};
  const schedule=await api(root+'/recurring',admin.cookie,'POST',recurring);assert.equal(schedule.status,201,JSON.stringify(schedule.data));ruleIds.push(schedule.data.id);
  data=await report();assert.equal(data.recurringRules.find((r:any)=>r.id===schedule.data.id).postedCount,1);
  await Promise.all([api(root+'/run',admin.cookie,'POST',{}),api(root+'/run',admin.cookie,'POST',{})]);
  assert.equal((await report()).recurringRules.find((r:any)=>r.id===schedule.data.id).postedCount,1);
  assert.equal((await api(`${root}/recurring/${schedule.data.id}`,admin.cookie,'PUT',{...recurring,amount:99})).status,200);
  assert.equal((await report()).ledger.find((l:any)=>l.sourceType==='recurring').amount,25.25);
  assert.equal((await api(`${root}/recurring/${schedule.data.id}`,admin.cookie,'DELETE')).status,200);
  data=await report();assert.ok(data.recurringRules.find((r:any)=>r.id===schedule.data.id).archivedAt);
  assert.equal(data.ledger.filter((l:any)=>l.sourceType==='recurring').length,1);
  // Proposed vs approved withdrawal fees and repeated-withdrawal analysis.
  for(const reviewed of [false,true]) {
    const e=(await pool.query(`INSERT INTO booking_cancellation_events(booking_id,requested_by,user_type,kind,status,reason,charge,quote,previous_guruji_id,reviewed_by,reviewed_at)
      VALUES($1,$2,'guruji','guruji_withdrawal',$3,$4,100,'{}',$5,$6,$7) RETURNING id`,
      [first,a.id,reviewed?'reviewed':'recorded',tag,profiles[0],reviewed?admin.id:null,reviewed?new Date():null])).rows[0];
    eventIds.push(e.id);
  }
  data=await report();
  const ga=data.gurujis.find((g:any)=>g.id===profiles[0]);
  assert.equal(ga.withdrawalCount,2);assert.equal(ga.proposedCancellationCharges,100);assert.equal(ga.reviewedCancellationCharges,100);
  assert.equal(ga.netBalance,-74.75);
  assert.equal(ga.confirmedFraudCases,0);
  const caseBody={gurujiId:profiles[0],title:tag+' reported issue',kind:'fraud',severity:'high',status:'investigating',notes:'Evidence requires administrator verification',evidenceReference:'Internal document reference'};
  const issue=await api(root+'/cases',admin.cookie,'POST',caseBody);assert.equal(issue.status,201);
  assert.equal((await api(`${root}/cases/${issue.data.id}`,admin.cookie,'PUT',{...caseBody,status:'confirmed',notes:'Administrator verified fixture evidence'})).status,200);
  data=await report();assert.equal(data.cases[0].history.length,2);assert.equal(data.summary.confirmedFraudCases,1);
  assert.ok(data.weekly.length&&data.monthly.length);assert.equal(data.monthly[0].completedCount,3);
  assert.equal(data.monthly[0].settlementsReceived,200);
  assert.equal((await api(`${root}/entries/${paid.data.id}/reverse`,admin.cookie,'POST',{reason:'Correcting the fixture settlement record'})).status,201);
  assert.equal((await report()).monthly[0].settlementsReceived,0);
  const csv=await api(root+'/export'+filter.replace('?','?section=ledger&'),admin.cookie);
  assert.equal(csv.status,200);assert.match(csv.data,/gurujiId/);
  await store.blockUser(admin.id);
  assert.equal((await api(root,admin.cookie)).status,403);
  await pool.query('UPDATE users SET "isBlocked"=false WHERE id=$1',[admin.id]);
  console.log('PASS: automatic monthly idempotency, immutable posted months, archive preservation, reviewed-only cancellation charges, separate fraud cases, reports and CSV');
  // Real admin controls: finance data, filter, entry form, recurrence and review
  // dialog; then create/edit cancellation rules on a short viewport.
  browser=await openBrowserTest();
  await browser.command('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__qaErrors=[];
    window.addEventListener('error',event=>{
      window.__qaErrors.push(event.message);
      // Chromium can emit this layout notification while automated scrolls
      // reposition a Radix popup. It is not a JS exception; keep all real
      // exceptions observable and do not change the application's handlers.
      if(/^ResizeObserver loop (completed with undelivered notifications|limit exceeded)/.test(event.message)){
        event.preventDefault();event.stopImmediatePropagation();
      }
    },true);
  `});
  const eq=admin.cookie.indexOf('=');
  await browser.command('Network.setCookie',{name:admin.cookie.slice(0,eq),value:admin.cookie.slice(eq+1),url:base});
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await browser.command('Page.navigate',{url:base+'/admin-dashboard'});
  await browser.wait(`!!document.querySelector('[role="tab"][id$="-trigger-guruji-finance"]')`,'finance navigation');
  await click(`document.querySelector('[role="tab"][id$="-trigger-guruji-finance"]')`);
  await browser.wait(`document.body.innerText.includes('Guruji Finance') && document.body.innerText.includes(${JSON.stringify(tag)})`,'live finance records');
  await writeFile('/tmp/admin-guruji-finance-check.png',Buffer.from((await browser.command('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await click(btn('Add ledger entry'));
  await browser.wait(`!!document.querySelector('[role="dialog"]')`,'finance entry form');
  assert.ok(await browser.evaluate(`document.querySelector('[role="dialog"]').scrollHeight>0 && !!document.querySelector('[role="dialog"] label')`));
  await choose('[role="dialog"] [role="combobox"]',`${tag} A`);
  for(const [label,value]of [['Amount (INR)','10.01'],['Description',`${tag} native finance entry`]]) {
    const selector=await browser.evaluate(`(()=>{const label=Array.from(document.querySelectorAll('[role="dialog"] label')).find(l=>l.textContent.trim()===${JSON.stringify(label)});return '#'+CSS.escape(label.htmlFor)})()`);
    await fill(selector,value);
  }
  await click(btn('Post entry'));
  await browser.wait(`!document.querySelector('[role="dialog"]')`,'actual admin finance form saved');
  assert.equal(Number((await pool.query('SELECT amount FROM guruji_finance_ledger WHERE description=$1',[`${tag} native finance entry`])).rows[0].amount),10.01);
  await click(`document.querySelector('[role="tab"][id$="-trigger-cancellation-rules"]')`);
  await browser.wait(`document.body.innerText.includes('Cancellation Rules')`,'admin rules tab');
  await click(btn('Add Rule'));
  await fill('input[aria-label="Cancellation rule name"]',tag+' UI rule');
  await fill('input[aria-label="Hours before puja"]','0');
  await choose('[aria-label="Cancellation puja scope"]',tag);
  await choose('[aria-label="Cancellation charge type"]','Fixed Amount (₹)');
  await fill('input[aria-label="Cancellation charge value"]','12.34');
  assert.ok(await browser.evaluate(`(()=>{const d=document.querySelector('[role="dialog"]');const r=d.getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight && getComputedStyle(d).overflowY==='auto'})()`));
  await click(btn('Create Rule'));
  await browser.wait(`!document.querySelector('[role="dialog"]') && document.body.innerText.includes(${JSON.stringify(tag+' UI rule')})`,'native create rule persisted');
  const created=(await pool.query('SELECT id FROM cancellation_rules WHERE name=$1',[tag+' UI rule'])).rows[0];ruleIds.push(-created.id);
  await click(`document.querySelector('[aria-label="Edit ${tag} UI rule"]')`);
  await fill('input[aria-label="Cancellation charge value"]','18.75');
  await click(btn('Save Changes'));
  await browser.wait(`!document.querySelector('[role="dialog"]')`,'native edit rule');
  assert.equal(Number((await pool.query('SELECT charge_value FROM cancellation_rules WHERE id=$1',[created.id])).rows[0].charge_value),18.75);
  await pool.query(`INSERT INTO cancellation_rules(user_type,name,hours_threshold,charge_type,charge_value,description,is_active,time_basis,puja_id)
    SELECT user_type,name||' legacy duplicate',hours_threshold,charge_type,charge_value,description,true,time_basis,puja_id FROM cancellation_rules WHERE id=$1`,[created.id]);
  await browser.command('Page.reload');
  await browser.wait(`!!document.querySelector('[role="tab"][id$="-trigger-cancellation-rules"]')`,'admin reload');
  await click(`document.querySelector('[role="tab"][id$="-trigger-cancellation-rules"]')`);
  await browser.wait(`!!document.querySelector('[aria-label="Edit ${tag} UI rule"]')`,'legacy test rule');
  await click(`document.querySelector('[aria-label="Edit ${tag} UI rule"]')`);
  await browser.wait(`document.querySelector('[role="dialog"]').innerText.includes('An active rule already uses')`,'explicit legacy conflict warning');
  assert.ok(await browser.evaluate(`(${btn('Save Changes')}).disabled`));
  await click(btn('Deactivate conflicting rule'));
  await browser.wait(`!(${btn('Save Changes')}).disabled`,'admin explicitly resolves conflict');
  await fill('input[aria-label="Cancellation charge value"]','20.5');
  await click(btn('Save Changes'));
  await browser.wait(`!document.querySelector('[role="dialog"]')`,'resolved rule saves');
  assert.equal(Number((await pool.query('SELECT charge_value FROM cancellation_rules WHERE id=$1',[created.id])).rows[0].charge_value),20.5);
  await browser.command('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:1,mobile:true});
  assert.ok(await browser.evaluate(`document.documentElement.scrollWidth<=innerWidth+2`),'Admin remains within the mobile page width');
  assert.deepEqual(await browser.evaluate(`window.__qaErrors.filter(message=>!/^ResizeObserver loop /.test(message))`),[]);
  const layoutWarnings=await browser.evaluate(`window.__qaErrors.filter(message=>/^ResizeObserver loop /.test(message)).length`);
  if(layoutWarnings)console.log(`Browser-only ResizeObserver layout notifications isolated: ${layoutWarnings}`);
  console.log('PASS: genuine admin finance UI and create/update cancellation rules on a 720px-high screen; no customer or Guruji booking flow changed');
} finally {
  if(browser)await browser.close();
  if(profiles.length){
    await pool.query('DELETE FROM guruji_finance_case_history WHERE case_id IN(SELECT id FROM guruji_finance_cases WHERE guruji_id=ANY($1))',[profiles]);
    await pool.query('DELETE FROM guruji_finance_cases WHERE guruji_id=ANY($1)',[profiles]);
    await pool.query('DELETE FROM guruji_finance_recognitions WHERE guruji_id=ANY($1)',[profiles]);
    await pool.query('UPDATE guruji_finance_ledger SET reverses_id=NULL WHERE guruji_id=ANY($1)',[profiles]);
    await pool.query('DELETE FROM guruji_finance_ledger WHERE guruji_id=ANY($1)',[profiles]);
  }
  await pool.query('DELETE FROM guruji_finance_recurring WHERE name LIKE $1',[tag+'%']);
  if(bookingIds.length){
    await pool.query('DELETE FROM guruji_finance_receipts WHERE booking_id=ANY($1)',[bookingIds]);
    await pool.query('DELETE FROM booking_cancellation_events WHERE booking_id=ANY($1)',[bookingIds]);
    await pool.query('DELETE FROM booking_requests WHERE "bookingId"=ANY($1)',[bookingIds]);
    await pool.query('DELETE FROM bookings WHERE id=ANY($1)',[bookingIds]);
  }
  await pool.query('DELETE FROM cancellation_rules WHERE name LIKE $1',[tag+'%']);
  if(profiles.length)await pool.query('DELETE FROM guruji_profiles WHERE id=ANY($1)',[profiles]);
  if(pujaId)await pool.query('DELETE FROM pujas WHERE id=$1',[pujaId]);
  if(users.length){
    await pool.query('DELETE FROM notifications WHERE "userId"=ANY($1)',[users]);
    await pool.query('DELETE FROM users WHERE id=ANY($1)',[users]);
  }
  await pool.end();
  console.log('Isolated finance fixtures removed; no real balances, booking states or pricing settings were edited');
}
