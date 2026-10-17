import assert from 'node:assert/strict';
import {openBrowserTest} from './browserTest';
import {indiaToday} from '../server/gurujiFinanceStore';

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`,browser=await openBrowserTest();
try {
  const pujas=await(await fetch(base+'/api/pujas')).json();
  assert.ok(pujas.length>=2);
  const url=`/booking?pujaId=${pujas[0].id}&pujaName=${encodeURIComponent(pujas[0].name)}&city=bangalore`;
  await browser.command('Page.navigate',{url:base+'/'});
  await browser.wait(`document.body.innerText.includes('Sanatan Guruji')`,'landing page');
  const draft={returnTo:url,activeStep:1,bookingType:'offline',consultationType:'auto_select',gurujiSelectionMode:'auto_nearby',
    selectedPujaId:String(pujas[0].id),selectedDate:indiaToday(new Date(Date.now()+48*3600000)),
    selectedTime:'10:00 AM',selectedCity:'bangalore',address:'Selection preservation verification address',pincode:'560001',selectedGurujiId:'',withSamagri:false};
  await browser.evaluate(`sessionStorage.setItem('guruji-booking-registration-draft',${JSON.stringify(JSON.stringify(draft))})`);
  await browser.command('Page.navigate',{url:base+url});
  const button=(text:string)=>`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()===${JSON.stringify(text)})`;
  await browser.wait(`!!(${button('Change Selection')}) && Array.from(document.querySelectorAll('h3')).some(e=>e.textContent.trim()===${JSON.stringify(pujas[0].name)})`,'preselected service');
  await browser.evaluate(`(()=>{window.__selectionProbe='same-document';(${button('Change Selection')}).click();})()`);
  await browser.wait(`Array.from(document.querySelectorAll('h3')).some(e=>e.textContent.trim()===${JSON.stringify(pujas[1].name)})`,'all services without refresh');
  assert.equal(await browser.evaluate(`window.__selectionProbe`),'same-document');
  assert.equal(await browser.evaluate(`new URLSearchParams(location.search).get('city')`),'bangalore');
  assert.equal(await browser.evaluate(`new URLSearchParams(location.search).has('pujaId')`),false);
  await browser.evaluate(`Array.from(document.querySelectorAll('h3')).find(e=>e.textContent.trim()===${JSON.stringify(pujas[1].name)}).closest('[class*="cursor-pointer"]').click()`);
  await browser.evaluate(`(${button('Continue')}).click()`);
  await browser.wait(`!!document.querySelector('#pincode') && !!document.querySelector('#address')`,'original date and location form');
  assert.equal(await browser.evaluate(`document.querySelector('#pincode').value`),'560001');
  assert.equal(await browser.evaluate(`document.querySelector('#address').value`),'Selection preservation verification address');
  console.log('PASS: Change Selection opens the full catalogue without reloading; another puja can be selected while schedule/location/pincode draft stays intact');
}finally{await browser.close();}
