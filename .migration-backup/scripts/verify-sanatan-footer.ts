import assert from 'node:assert/strict';
import { openBrowserTest } from './browserTest';

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (!base.endsWith('.replit.dev')) throw new Error('Preview-only verification');
const ui = await openBrowserTest();

const newPages: Record<string, string> = {
  '/about': 'About Sanatan Guruji',
  '/contact': 'Contact Us',
  '/faq': 'Frequently Asked Questions',
  '/privacy-policy': 'Privacy Policy',
  '/terms': 'Terms & Conditions',
  '/cancellation-policy': 'Cancellation & Refunds',
};

try {
  await ui.command('Page.navigate', { url: base + '/about' });
  await ui.wait(`!!document.querySelector('footer a[href="/contact"]')`, 'new footer');
  assert.match(await ui.evaluate('document.title'), /Sanatan Guruji/);
  assert.equal(await ui.evaluate(`document.querySelector('footer').innerText.includes('8087138429')`), true);
  assert.equal(await ui.evaluate(`!!document.querySelector('footer a[href="#"]')`), false);
  assert.equal(await ui.evaluate(`!!document.querySelector('footer input')`), false);
  assert.equal(await ui.evaluate(`/Guruji\\s*Connect\\b/i.test(document.body.innerText)`), false);

  const paths: string[] = await ui.evaluate(`Array.from(new Set(Array.from(document.querySelectorAll('footer a')).map(a=>a.getAttribute('href')).filter(h=>h?.startsWith('/'))))`);
  for (const path of paths) {
    await ui.command('Page.navigate', { url: base + (path === '/about' ? '/contact' : '/about') });
    await ui.wait(`!!document.querySelector('footer a[href=${JSON.stringify(path)}]')`, `footer destination ${path}`);
    await ui.click(`footer a[href="${path}"]`);
    await ui.wait(`location.pathname === ${JSON.stringify(path)}`, `navigation to ${path}`);
    await ui.wait(`!document.querySelector('footer') || window.scrollY < 100`, 'destination scroll position');
    assert.equal(await ui.evaluate(`!!document.querySelector('h1')?.innerText.match(/404|not found/i)`), false, `No 404 at ${path}`);
    if (newPages[path]) {
      await ui.wait(`document.querySelector('h1')?.innerText === ${JSON.stringify(newPages[path])}`, `${path} content`);
      assert.ok((await ui.evaluate(`document.querySelector('main').innerText.length`)) > 300);
      assert.match(await ui.evaluate('document.title'), /Sanatan Guruji/);
    }
    console.log(`PASS: footer link ${path} opens its working destination`);
  }

  await ui.command('Page.navigate', { url: base + '/faq' });
  await ui.wait(`!!document.querySelector('[data-testid="faq-page"]')`, 'FAQs');
  await ui.click('main button', 'Is my booking confirmed as soon as I submit it?');
  await ui.wait(`document.querySelector('main').innerText.includes('The Guruji must accept it')`, 'FAQ expansion');
  await ui.click('main button', 'Is my booking confirmed as soon as I submit it?');
  await ui.wait(`!document.querySelector('main').innerText.includes('The Guruji must accept it')`, 'FAQ collapse');
  console.log('PASS: FAQ controls expand and collapse real answers');

  await ui.command('Page.navigate', { url: base + '/contact' });
  await ui.wait(`!!document.querySelector('[data-testid="contact-page"]')`, 'contact information');
  assert.equal(await ui.evaluate(`document.querySelector('main a[href^="tel:"]').getAttribute('href')`), 'tel:+918087138429');
  assert.equal(await ui.evaluate(`document.querySelector('main a[href^="https://wa.me/"]').getAttribute('href')`), 'https://wa.me/918087138429');
  assert.equal(await ui.evaluate(`document.querySelector('footer a[href^="tel:"]').getAttribute('href')`), 'tel:+918087138429');
  console.log('PASS: call and WhatsApp actions use the exact provided phone number');

  await ui.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await ui.evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'Mobile page does not overflow horizontally');
  await ui.click('footer a[href="/about"]');
  await ui.wait(`document.querySelector('h1')?.innerText === 'About Sanatan Guruji'`, 'mobile About Us');
  assert.ok(await ui.evaluate(`window.scrollY < 100`), 'Footer navigation opens top of destination');
  assert.ok(await ui.evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'Mobile About/footer fit viewport');
  await ui.click('footer a[href="/contact"]');
  await ui.wait(`!!document.querySelector('[data-testid="contact-page"]')`, 'mobile contact');
  assert.equal(await ui.evaluate(`/Guruji\\s*Connect\\b/i.test(document.body.innerText)`), false);
  console.log('PASS: mobile footer navigation, contact links, responsive width and new branding');
} finally {
  await ui.close();
}