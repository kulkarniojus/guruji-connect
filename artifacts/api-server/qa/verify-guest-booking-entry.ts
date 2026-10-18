import assert from 'node:assert/strict';
import { openBrowserTest } from './browserTest';

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
const browser=await openBrowserTest();
async function click(expression:string) {
  await browser.wait(`!!(${expression})`,'booking control');
  const role=await browser.evaluate(`(${expression}).getAttribute('role')`);
  if(role!=='combobox' && role!=='option') {
    await browser.evaluate(`(${expression}).click()`);
    return;
  }
  const rect=await browser.evaluate(`(()=>{const el=${expression};el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await browser.command('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'left',clickCount:1});
  await browser.command('Input.dispatchMouseEvent',{type:'mouseReleased',...rect,button:'left',clickCount:1});
}
const button=(text:string)=>`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)})`;
async function fill(selector:string,value:string) {
  await browser.wait(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled && !document.querySelector(${JSON.stringify(selector)}).readOnly`,'editable booking input');
  await browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await browser.command('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
  await browser.command('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
  await browser.command('Input.insertText',{text:value});
  await browser.wait(`document.querySelector(${JSON.stringify(selector)}).value===${JSON.stringify(value)}`,'booking input retained');
}
async function search() {
  await browser.command('Page.navigate',{url:base+'/'});
  await browser.wait(`document.querySelectorAll('[role="combobox"]').length===2 && !Array.from(document.querySelectorAll('[role="combobox"]')).some(b=>b.textContent.includes('Loading'))`,'landing city and puja choices');
  for(const index of [0,1]) {
    await click(`document.querySelectorAll('[role="combobox"]')[${index}]`);
    await browser.wait(`!!document.querySelector('[role="listbox"] [role="option"]')`,'open search options');
    for (const key of ['Home', 'Enter']) {
      await browser.command('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:key==='Enter'?13:36,...(key==='Enter'?{text:'\r'}:{})});
      await browser.command('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:key==='Enter'?13:36});
    }
    await browser.wait(`!document.querySelector('[role="listbox"]') &&
      !document.querySelectorAll('[role="combobox"]')[${index}].querySelector('[data-placeholder]') &&
      !document.querySelectorAll('[role="combobox"]')[${index}].textContent.startsWith('Select ')`,'search option selected');
  }
  await click(button('Pick a date'));
  const tomorrow=await browser.evaluate(`(()=>{const now=new Date();const day=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);return{day:day.getDate(),nextMonth:day.getMonth()!==now.getMonth()}})()`);
  if(tomorrow.nextMonth) await click(`document.querySelector('button[aria-label="Go to next month"]')`);
  await click(`Array.from(document.querySelectorAll('button[name="day"]')).find(b=>!b.disabled && b.textContent.trim()===${JSON.stringify(String(tomorrow.day))})`);
  await click(button('Find Guruji'));
  await browser.wait(`location.pathname==='/booking' && document.body.innerText.includes('Book Your Service') && !document.body.innerText.includes('Loading cities...')`,'guest booking page');
  return browser.evaluate(`location.pathname+location.search`);
}
try {
  // Reproduce a previous authentication attempt saved against the same landing
  // search URL. A NEW Find Guruji search must not jump to that old login step.
  const url=await search();
  assert.equal(await browser.evaluate(`!!document.querySelector('[role="dialog"] input[type="password"]')`),false);
  const params=new URLSearchParams(url.split('?')[1]);
  const oldDraft={returnTo:url,activeStep:4,bookingType:'offline',consultationType:'auto_select',
    gurujiSelectionMode:'auto_nearby',selectedPujaId:params.get('puja'),selectedDate:params.get('date')!.slice(0,10),
    selectedTime:'10:00 AM',selectedCity:params.get('city'),address:'Previous guest verification address',
    pincode:'560001',selectedGurujiId:'',withSamagri:true};
  await browser.evaluate(`sessionStorage.setItem('guruji-booking-registration-draft',${JSON.stringify(JSON.stringify(oldDraft))})`);
  const repeatedUrl=await search();
  assert.equal(repeatedUrl,url);
  await browser.wait(`!document.querySelector('[role="dialog"] input[type="password"]') && !!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Continue')`,'new search does not restore old login prompt');
  console.log('PASS: Find Guruji starts the existing guest booking flow even after an abandoned login attempt');

  await click(button('Continue'));
  await browser.wait(`!!document.querySelector('#address') && !!document.querySelector('#pincode')`,'original date and address form');
  await fill('#address','Guest booking verification address');
  await fill('#pincode','560001');
  await click(`Array.from(document.querySelectorAll('button')).find(b=>!b.disabled && /^\\d{2}:\\d{2} (AM|PM)$/.test(b.textContent.trim()))`);
  assert.equal(await browser.evaluate(`!!document.querySelector('[role="dialog"] input[type="password"]')`),false);
  await click(button('Continue'));
  await browser.wait(`!!document.querySelector('input[name="gurujiMode"][value="specific"]') && !!document.querySelector('input[name="gurujiMode"][value="auto_nearby"]')`,'guest sees both original Guruji selection choices');
  assert.equal(await browser.evaluate(`!!document.querySelector('[role="dialog"] input[type="password"]')`),false);
  await click(`document.querySelector('input[name="gurujiMode"][value="auto_nearby"]')`);
  await click(button('Review Booking Request'));
  await browser.wait(`!!document.querySelector('[role="dialog"] input[type="password"]')`,'login appears only after Guruji selection');
  const draft=await browser.evaluate(`JSON.parse(sessionStorage.getItem('guruji-booking-registration-draft'))`);
  assert.equal(draft.activeStep,4);
  assert.equal(draft.gurujiSelectionMode,'auto_nearby');
  assert.equal(draft.address,'Guest booking verification address');
  assert.equal(draft.pincode,'560001');
  assert.equal(draft.returnTo,url);
  console.log('PASS: guest retains date, address, pincode and automatic Guruji selection; authentication is required only at request review');
  // Authentication returns directly, without pressing Find Guruji again. That
  // navigation must still restore the complete draft and its review step.
  await browser.command('Page.navigate',{url:base+url});
  await browser.wait(`!!document.querySelector('[role="dialog"] input[type="password"]')`,'direct auth return keeps saved review step');
  assert.equal(await browser.evaluate(`JSON.parse(sessionStorage.getItem('guruji-booking-registration-draft')).pincode`),'560001');
  console.log('PASS: direct authentication returns still preserve the booking draft and correct step');

  await browser.command('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:1,mobile:true});
  await search();
  await browser.wait(`!document.querySelector('[role="dialog"] input[type="password"]') && !!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Continue')`,'mobile Find Guruji remains available without login');
  console.log('PASS: mobile landing search also defers login; no real bookings or accounts were created');
} finally {await browser.close();}
