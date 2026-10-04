import assert from 'node:assert/strict';
import { pool } from '../server/db';
import { openBrowserTest } from './browserTest';

// Read credentials from stdin; never persist or print them.
const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
const { account, password, path, entry = 'booking', mobile = false } = JSON.parse(Buffer.concat(chunks).toString());
const domain = process.env.REPLIT_DEV_DOMAIN;
if (!domain?.endsWith('.replit.dev') || process.env.NODE_ENV === 'production') throw new Error('Development only');
const base = `https://${domain}`;
let browser: Awaited<ReturnType<typeof openBrowserTest>> | undefined;

try {
  const accounts = await pool.query(
    `SELECT id,email,"firstName" FROM users WHERE LOWER("firstName")=$1 OR LOWER(email)=$1`,
    [account.toLowerCase()],
  );
  assert.equal(accounts.rowCount, 1, 'Expected exactly one matching account');
  const user = accounts.rows[0];
  const pujas = await (await fetch(base + '/api/pujas')).json() as any[];
  const cities = await (await fetch(base + '/api/cities')).json() as any[];
  const requested = path ? new URL(path, base) : null;
  if (requested && (requested.origin !== base || requested.pathname !== '/booking')) throw new Error('Expected same-preview booking URL');
  const puja = pujas.find(p => String(p.id) === requested?.searchParams.get('puja')) || pujas.find(p => Number(p.price) > 0);
  const city = requested?.searchParams.get('city') || cities[0].name.toLowerCase().replace(/\s+/g, '-');
  const target = requested ? requested.pathname + requested.search : `/booking?type=offline&puja=${puja.id}&city=${encodeURIComponent(city)}`;
  const draft = {
    returnTo: target, activeStep: 3, bookingType: 'offline', consultationType: 'auto_select',
    gurujiSelectionMode: 'auto_nearby', selectedPujaId: String(puja.id), selectedDate: '2026-10-30',
    selectedTime: '09:00 AM', selectedCity: city, address: 'Login check (not submitted)',
    pincode: '411001', selectedGurujiId: '', withSamagri: true,
  };
  browser = await openBrowserTest();
  if (mobile) await browser.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await browser.command('Page.navigate', { url: base });
  await browser.wait(`!!document.querySelector('header')`, 'home');
  if (entry === 'booking') await browser.evaluate(`sessionStorage.setItem('guruji-booking-registration-draft',${JSON.stringify(JSON.stringify(draft))})`);
  await browser.command('Page.navigate', { url: base + target });
  if (entry === 'booking') {
    await browser.wait(`[...document.querySelectorAll('button')].some(el=>el.textContent.trim()==='Review Booking Request')`, 'booking step');
    await browser.click('button', 'Review Booking Request');
  } else {
    await browser.wait(`!!document.querySelector('header')`, 'booking header');
    if (mobile) await browser.click('header button[aria-label="Toggle menu"]');
    await browser.click(mobile ? 'header .absolute button' : 'header button', 'Login');
  }
  await browser.wait(`!!document.querySelector('[role="dialog"] input[type="email"]')`, 'booking login');
  await browser.type('[role="dialog"] input[type="email"]', user.email);
  await browser.type('[role="dialog"] input[type="password"]', password);
  await browser.click('[role="dialog"] button', 'Login');
  const review = `location.pathname+location.search===${JSON.stringify(target)} && ${entry === 'booking' ? "document.body.innerText.includes('Send Booking Request')" : "document.body.innerText.includes('Book Your Service')"} && !document.querySelector('[role="dialog"]')`;
  await browser.wait(review, 'successful login and booking review');
  assert.equal(await browser.evaluate(`(await (await fetch('/api/auth/me')).json()).id`), user.id);
  await browser.command('Page.reload');
  await browser.wait(review, 'authenticated booking after reload');
  console.log('PASS: existing account logs in through booking modal and remains logged in after refresh');
  console.log('PASS: exact booking URL, selections and review step preserved; no booking submitted');
} finally {
  await browser?.close();
  await pool.end();
}