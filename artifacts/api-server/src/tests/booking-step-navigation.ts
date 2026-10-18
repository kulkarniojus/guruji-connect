import assert from 'node:assert/strict';
import { browserClient } from './browser-client';

// Read-only browser regression check: no account, booking or payment fixtures.
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (!base.endsWith('.replit.dev')) throw new Error('Run against the development portal only.');
const response = await fetch(`${base}/api/pujas`);
assert(response.ok);
const pujas = await response.json() as any[];
const puja = pujas.find(p => p.type === 'offline');
assert(puja, 'An active offline puja is needed for this read-only check.');
const b = await browserClient();
try {
  await b.command('Page.enable');
  for (const width of [1280, 402]) {
    await b.command('Emulation.setDeviceMetricsOverride', {
      width, height: 874, deviceScaleFactor: 1, mobile: width < 640,
    });
    await b.command('Page.navigate', { url: `${base}/booking?puja=${puja.id}&city=Bangalore` });
    await b.wait('!![...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="Change Selection")', 'selected puja');
    await b.click('button', 'Change Selection');
    await b.wait('!!document.querySelector(\'input[aria-label="Search pujas for booking"]\')', 'full puja list');
    assert(await b.evaluate('document.documentElement.scrollHeight > innerHeight * 2'), 'Must exercise a long list');
    assert(await b.evaluate(`(()=>{
      const actions=document.querySelector('[data-testid="booking-service-actions"]');
      const button=actions.querySelector('button').getBoundingClientRect(),style=getComputedStyle(actions);
      return button.x+button.width/2>innerWidth/2 && style.backgroundColor==='rgba(0, 0, 0, 0)' && style.borderTopWidth==='0px';
    })()`), 'Original right-aligned button without a full-width background bar');
    const visibleContinue = async () => {
      const state = await b.evaluate(`(()=>{
        const button=document.querySelector('[data-testid="booking-service-actions"] button');
        const r=button.getBoundingClientRect();
        return {visible:r.top>=0 && r.bottom<=innerHeight && document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===button,
          top:r.top,bottom:r.bottom,scrollY,height:innerHeight,over:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,200)};
      })()`);
      assert(state.visible, `Continue must be visible and unobstructed at width ${width}: ${JSON.stringify(state)}`);
    };
    for (const fraction of [0, 0.45, 1]) {
      await b.evaluate(`(()=>{const card=document.querySelector('[data-testid="booking-service-actions"]').parentElement;
        const bottom=card.getBoundingClientRect().bottom+scrollY;
        window.scrollTo({top:Math.max(0,bottom-innerHeight)*${fraction},behavior:'instant'});})()`);
      await visibleContinue();
    }
    // Existing selection validation must remain unchanged.
    await b.click('[data-testid="booking-service-actions"] button');
    await b.wait('document.body.innerText.includes("You need to select a puja to continue")', 'selection validation');
    assert(await b.evaluate('!!document.querySelector(\'input[aria-label="Search pujas for booking"]\')'));
    await b.wait('[...document.querySelectorAll("li[data-state=open]")].every(e=>e.getAnimations().every(a=>a.playState!=="running"))', 'validation toast entrance animation');
    await b.click('button[toast-close]');
    await b.wait(`(()=>{
      const button=document.querySelector('[data-testid="booking-service-actions"] button'),r=button.getBoundingClientRect();
      return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===button;
    })()`, 'validation toast dismissed');
    const point = await b.evaluate(`(()=>{
      const heading=[...document.querySelectorAll('h3')].find(e=>e.textContent===${JSON.stringify(puja.name)});
      const card=heading.closest('.cursor-pointer');card.scrollIntoView({block:'center'});
      const r=heading.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    await b.command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await b.command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
    await b.wait('!!document.querySelector("#without-samagri")', 'existing puja selection');
    await b.evaluate(`(()=>{const card=document.querySelector('[data-testid="booking-service-actions"]').parentElement;
      window.scrollTo({top:card.getBoundingClientRect().bottom+scrollY-innerHeight,behavior:"instant"});})()`);
    await visibleContinue();
    // Click without scrollIntoView, so the test cannot conceal an inaccessible button.
    const next = await b.evaluate(`(()=>{
      const r=document.querySelector('[data-testid="booking-service-actions"] button').getBoundingClientRect();
      return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    await b.command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...next });
    await b.command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...next });
    await b.wait('!!document.querySelector("#pincode")', 'unchanged Date & Location step');
    await b.wait('window.scrollY===0', 'Step 2 at page top');
    assert(await b.evaluate(`(()=>{
      const r=document.querySelector('h1').getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight;
    })()`));
    console.log(`PASS ${width}px: sticky Continue at top/middle/bottom, unchanged selection validation, Step 2 opens at top with pincode intact.`);
  }
} catch (error) {
  console.error(error);
  throw error;
} finally {
  await b.close();
}
