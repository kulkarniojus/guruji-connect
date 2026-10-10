import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { pool } from '../server/db';
import { bookingReturnPath, postAuthPath } from '../client/src/lib/authRedirect';
import { openBrowserTest } from './browserTest';

const domain = process.env.REPLIT_DEV_DOMAIN;
if (process.env.NODE_ENV === 'production' || !domain?.endsWith('.replit.dev')) {
  throw new Error('Run only against the running development app.');
}
const base = `https://${domain}`;
const email = `auth-return-qa-${randomBytes(6).toString('hex')}@example.invalid`;
const password = randomBytes(18).toString('hex');
let ui: Awaited<ReturnType<typeof openBrowserTest>> | undefined;

try {
  assert.equal(bookingReturnPath('//external.invalid/booking'), undefined);
  assert.equal(bookingReturnPath('/register'), undefined);
  assert.equal(postAuthPath('guruji', '/booking'), '/dashboard');
  assert.equal(postAuthPath('admin', '/booking'), '/admin-dashboard');
  const pujas = await (await fetch(base + '/api/pujas')).json() as any[];
  const cities = await (await fetch(base + '/api/cities')).json() as any[];
  const puja = pujas.find(item => item.isActive !== false && item.price > 0);
  assert.ok(puja, 'An active puja is required for the booking return check');
  const city = cities[0].name.toLowerCase().replace(/\s+/g, '-');
  const target = `/booking?type=offline&puja=${puja.id}&city=${encodeURIComponent(city)}`;
  const draft = {
    returnTo: target, activeStep: 3, bookingType: 'offline', consultationType: 'auto_select',
    gurujiSelectionMode: 'auto_nearby', selectedPujaId: String(puja.id), selectedDate: '2030-02-01',
    selectedTime: '09:00 AM', selectedCity: city, address: 'Registration return test address',
    pincode: '411001', selectedGurujiId: '', withSamagri: true,
  };
  ui = await openBrowserTest();
  await ui.command('Page.navigate', { url: base + '/' });
  await ui.wait('!!document.querySelector("header")', 'homepage');
  await ui.evaluate(`sessionStorage.setItem('guruji-booking-registration-draft',${JSON.stringify(JSON.stringify(draft))})`);
  await ui.command('Page.navigate', { url: base + target });
  await ui.wait(`[...document.querySelectorAll('button')].some(el=>el.textContent.trim()==='Review Booking Request')`, 'booking selection');
  await ui.click('button', 'Review Booking Request');
  await ui.wait(`!!document.querySelector('[role="dialog"] input[type="email"]')`, 'booking login dialog');
  await ui.click('[role="dialog"] button', 'Register now');
  await ui.wait(`location.pathname==='/register' && !!document.querySelector('input[name="firstName"]')`, 'registration form');
  assert.equal(await ui.evaluate(`new URLSearchParams(location.search).get('returnTo')`), target);
  for (const [name, value] of Object.entries({
    firstName: 'ReturnQA', lastName: 'Fixture', email: email.toUpperCase(),
    mobile: `9${randomInt(100000000,999999999)}`, age: '30', password,
  })) await ui.type(`input[name="${name}"]`, value);
  await ui.click('button[role="combobox"]');
  await ui.wait(`!!document.querySelector('[role="option"]')`, 'gender choices');
  await ui.click('[role="option"]', 'Other');
  await ui.click('button[role="checkbox"]');
  await ui.click('form button', 'Register');
  const reviewVisible = `location.pathname+location.search===${JSON.stringify(target)} && document.body.innerText.includes('Send Booking Request') && !document.querySelector('[role="dialog"]')`;
  await ui.wait(reviewVisible, 'registration return to booking review');
  const account = await pool.query('SELECT id,email,role FROM users WHERE email=$1', [email]);
  assert.equal(account.rowCount, 1);
  const id = account.rows[0].id;
  assert.equal(await ui.evaluate(`(await (await fetch('/api/auth/me')).json()).id`), id);
  const restored = await ui.evaluate(`JSON.parse(sessionStorage.getItem('guruji-booking-registration-draft'))`);
  for (const key of ['returnTo','selectedPujaId','selectedDate','selectedTime','selectedCity','address','pincode','withSamagri']) {
    assert.equal(restored[key], draft[key as keyof typeof draft]);
  }
  await ui.command('Page.reload');
  await ui.wait(reviewVisible, 'saved session and booking after refresh');
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM bookings WHERE "customerId"=$1', [id])).rows[0].n, 0);
  console.log('PASS: actual registration form signs in, returns to the exact booking URL, preserves all details, and survives refresh');

  const logout = async () => {
    assert.equal(await ui!.evaluate(`(await fetch('/api/auth/logout',{method:'POST'})).status`), 200);
  };
  const fillLogin = async () => {
    await ui!.type('[role="dialog"] input[type="email"]', email.toUpperCase());
    await ui!.type('[role="dialog"] input[type="password"]', password);
    await ui!.click('[role="dialog"] button', 'Login');
    await ui!.wait(reviewVisible, 'login return to same booking');
    assert.equal(await ui!.evaluate(`(await (await fetch('/api/auth/me')).json()).id`), id);
  };
  await logout();
  await ui.command('Page.navigate', { url: base + target });
  await ui.wait(`!!document.querySelector('[role="dialog"] input[type="email"]')`, 'booking login after logout');
  await fillLogin();
  console.log('PASS: actual booking login form signs in and resumes the same step');

  for (const selector of ['header button', 'main button']) {
    await logout();
    await ui.command('Page.navigate', { url: base + `/register?returnTo=${encodeURIComponent(target)}` });
    await ui.wait(`!!document.querySelector('input[name="firstName"]')`, 'registration page');
    await ui.click(selector, 'Login');
    await ui.wait(`!!document.querySelector('[role="dialog"] input[type="email"]')`, 'login on registration page');
    await fillLogin();
  }
  console.log('PASS: both header login and registration-page login honor the same booking return path');
} finally {
  await ui?.close();
  const fixture = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  for (const user of fixture.rows) {
    await pool.query('DELETE FROM notifications WHERE "userId"=$1', [user.id]);
    await pool.query('DELETE FROM users WHERE id=$1', [user.id]);
  }
  await pool.end();
  console.log('Temporary authentication test account removed.');
}