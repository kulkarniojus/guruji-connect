import assert from 'node:assert/strict';
import { browserClient } from './browser-client';

export async function verifyCustomerFixesBrowser(input:{
  base:string;customerCookie:string;adminCookie:string;gurujiCookie:string;customerId:number;pujaId:number;tag:string;uiCancellationBookingId:number;
}) {
  const b=await browserClient();
  const navigate=async(path:string)=>{
    await b.command('Page.navigate',{url:input.base+path});
    await b.wait('document.readyState==="complete"','page document');
  };
  async function identity(cookie:string) {
    await b.command('Network.clearBrowserCookies');
    const [name,...values]=cookie.split('=');
    await b.command('Network.setCookie',{name,value:values.join('='),url:input.base,httpOnly:true,secure:true,sameSite:'Lax'});
  }
  try {
    await b.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await identity(input.customerCookie);
    await navigate('/');
    await b.wait('!!document.querySelector("[data-testid=customer-puja-reminder]")','customer reminder');
    await b.click('button[aria-label="Minimize puja reminders"]');
    await b.wait('!!document.querySelector("[data-testid=customer-puja-reminder-minimized]")','minimized reminder');
    await b.command('Page.reload');
    await b.wait('!!document.querySelector("[data-testid=customer-puja-reminder]")','reminder restored after reload');
    await b.click('button[aria-label="Open notifications and mark all as read"]');
    await b.wait('location.pathname==="/notifications" && !document.querySelector("[data-testid=notification-unread-count]")','bell cleared');
    await b.command('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:1,mobile:true});
    await navigate('/');
    await b.wait('!!document.querySelector("[data-testid=customer-puja-reminder]")','mobile reminder');
    const handle=await b.evaluate(`(()=>{const e=document.querySelector('[data-testid=customer-puja-reminder]').firstElementChild,r=e.getBoundingClientRect();return{x:r.x+70,y:r.y+r.height/2}})()`);
    await b.command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...handle});
    await b.command('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:handle.x+130,y:handle.y});
    await b.command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:handle.x+130,y:handle.y});
    await b.wait('!!document.querySelector("[data-testid=customer-puja-reminder-minimized]")','mobile sideways drag');
    await b.command('Page.reload');
    await b.wait('!!document.querySelector("[data-testid=customer-puja-reminder]")','mobile reminder restored on reload');
    await b.click('button[aria-label="Minimize puja reminders"]');
    await b.click('button','Pick a date');
    await b.wait('!!document.querySelector("[role=dialog]")','home date calendar');
    assert(await b.evaluate(`!![...document.querySelectorAll('button')].find(e=>e.getAttribute('name')==='previous-month'&&e.disabled)`),
      'home calendar must not navigate into past months');
    await b.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await navigate(`/booking?puja=${input.pujaId}&city=Bangalore`);
    await b.wait('!![...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="Change Selection")','selected service');
    await b.click('button','Change Selection');
    await b.wait('!!document.querySelector("input[aria-label=\\"Search pujas for booking\\"]")','change-selection search');
    await b.fill('input[aria-label="Search pujas for booking"]',input.tag);
    await b.wait(`document.body.innerText.includes(${JSON.stringify(input.tag)})`,'matching booking puja');
    await b.fill('input[aria-label="Search pujas for booking"]','no-matching-service-000');
    await b.wait('document.body.innerText.includes("No pujas match your search")','booking empty search');
    await navigate(`/booking/${input.uiCancellationBookingId}`);
    await b.wait('!![...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="Cancel Booking")','customer cancel action');
    if(await b.evaluate('!!document.querySelector("button[aria-label=\\"Minimize puja reminders\\"]")'))
      await b.click('button[aria-label="Minimize puja reminders"]');
    await b.click('button','Cancel Booking');
    await b.wait('!!document.querySelector("textarea[aria-label=\\"Cancellation reason\\"]")','immediate cancellation dialog');
    await b.fill('textarea[aria-label="Cancellation reason"]','Browser cancellation verification');
    await b.click('button','Confirm Cancellation');
    await b.wait('!document.querySelector("textarea[aria-label=\\"Cancellation reason\\"]")','customer cancellation saved');
    assert.equal(await b.evaluate(`(await (await fetch('/api/bookings/${input.uiCancellationBookingId}')).json()).status`),'cancelled');
    await identity(input.gurujiCookie);
    await navigate(`/booking?puja=${input.pujaId}`);
    await b.wait('location.pathname==="/dashboard"','Guruji blocked from booking UI');
    await identity(input.adminCookie);
    await b.command('Emulation.setDeviceMetricsOverride',{width:1280,height:950,deviceScaleFactor:1,mobile:false});
    await navigate('/admin-dashboard');
    await b.wait('!![...document.querySelectorAll("[role=tab]")].find(e=>e.textContent.trim()==="Customers")','admin customers tab');
    await b.click('[role=tab]','Customers');
    await b.wait(`document.body.innerText.includes(${JSON.stringify(input.tag)})`,'fixture customer row');
    await b.fill('input[placeholder*="Search"]',input.tag);
    await b.click('button','Activity');
    await b.wait('!!document.querySelector("[role=dialog]") && document.body.innerText.includes("Refund owed")','customer activity dialog');
    assert(await b.evaluate('document.body.innerText.includes("Cancellation") || document.body.innerText.includes("cancelled")'));
    await b.evaluate(`(()=>{const e=document.querySelector('#cad-booking');e.value='${input.uiCancellationBookingId}';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await b.evaluate(`(()=>{const e=document.querySelector('#cad-type');e.value='refund';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await b.fill('#cad-amount','400');
    await b.fill('#cad-ref','ui-refund-reference');
    await b.fill('#cad-reason','Actual manual refund verification fixture');
    await b.click('[role=dialog] button[type=submit]');
    await b.wait('document.querySelector("#cad-amount")?.value===""','manual refund form saved and reset');
    const report=await b.evaluate(`(await (await fetch('/api/admin/customers/${input.customerId}/activity')).json())`);
    assert.equal(report.bookings.find((r:any)=>r.id===input.uiCancellationBookingId).refundOwed,0);
    assert(report.entries.some((e:any)=>e.reference==='ui-refund-reference' && e.type==='refund' && Number(e.amount)===400));
    console.log('PASS browser: desktop minimize/reload, mobile drag/reload, bell read state, past-month block, change-selection search, Guruji redirect, customer cancellation and admin manual refund form with refreshed activity');
  } finally {await b.close();}
}
