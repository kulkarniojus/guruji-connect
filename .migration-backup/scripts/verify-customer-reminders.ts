import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { customerPujaReminders, reminderSchedule } from '../shared/customerPujaReminder';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { openBrowserTest } from './browserTest';

const domain = process.env.REPLIT_DEV_DOMAIN;
if (process.env.NODE_ENV === 'production' || !domain?.endsWith('.replit.dev')) throw new Error('Development only');
const base = `https://${domain}`;
const store = new DBStorage();
const tag = randomBytes(6).toString('hex');
const password = randomBytes(18).toString('hex');
const users: number[] = [], bookings: number[] = [];
let browser: Awaited<ReturnType<typeof openBrowserTest>> | undefined;

async function account(role: string) {
  const result = await store.createUser({
    firstName: 'ReminderQA', lastName: role, email: `reminder-${tag}-${role}@example.invalid`,
    mobile: `9${randomInt(100000000, 999999999)}`, password, role, age: 30, gender: 'other',
  } as any);
  users.push(result.id);
  return result;
}
async function signIn(user: any) {
  const response = await fetch(base + (user.role === 'admin' ? '/api/admin/login' : '/api/auth/login'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  const separator = cookie.indexOf('=');
  await browser!.command('Network.clearBrowserCookies');
  await browser!.command('Network.setCookie', {
    name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: base,
  });
}
const region = `document.querySelector('[aria-label="Active puja booking reminders"]')`;
const has = (id: number) => `!!${region}?.querySelector('a[href="/booking/${id}"]')`;

try {
  const sample = { id: 1, customerId: 1, date: '2031-04-10', time: '09:00 AM', status: 'pending' };
  for (const status of ['pending', 'pending_approval', 'confirmed', 'in_progress']) {
    assert.equal(customerPujaReminders([{ ...sample, status }], 1).length, 1);
  }
  for (const status of ['completed', 'cancelled', 'rejected', 'declined', 'expired']) {
    assert.equal(customerPujaReminders([{ ...sample, status }], 1).length, 0);
  }
  assert.equal(customerPujaReminders([sample], 2).length, 0);
  assert.equal(reminderSchedule(sample), '10 April 2031 at 09:00 AM');
  assert.ok(reminderSchedule({ ...sample, date: null, time: null }).includes('yet to be confirmed'));
  console.log('PASS: active/terminal statuses, ownership and separate date/time formatting');

  const customer = await account('customer');
  const admin = await account('admin');
  const guruji = await account('guruji');
  const pujas = await (await fetch(base + '/api/pujas')).json() as any[];
  const puja = pujas.find(p => Number(p.price) > 0);
  assert.ok(puja);
  const fixtures = new Map<string, number>();
  for (const status of ['pending', 'pending_approval', 'confirmed', 'in_progress', 'completed', 'cancelled']) {
    const booking = await store.createBooking({
      customerId: customer.id, pujaId: puja.id, status, type: 'offline', amount: Number(puja.price),
      date: new Date(`${status === 'pending' ? '2020-04-10' : '2031-04-10'}T12:00:00Z`),
      time: '09:00 AM', city: 'reminder-qa', duration: puja.duration,
    } as any);
    bookings.push(booking.id);
    fixtures.set(status, booking.id);
  }
  browser = await openBrowserTest();
  await browser.command('Page.navigate', { url: base });
  await browser.wait(`!!document.querySelector('header')`, 'anonymous home');
  assert.equal(await browser.evaluate(`!!${region}`), false);
  await signIn(customer);
  await browser.command('Page.navigate', { url: base + '/my-bookings' });
  await browser.wait(has(fixtures.get('in_progress')!), 'customer reminders');
  assert.equal(await browser.evaluate(`${region}.querySelectorAll('li').length`), 4);
  assert.equal(await browser.evaluate(has(fixtures.get('completed')!)), false);
  assert.equal(await browser.evaluate(has(fixtures.get('cancelled')!)), false);
  assert.ok(await browser.evaluate(`${region}.innerText.includes('10 April 2031') && ${region}.innerText.includes('09:00 AM')`));
  assert.ok(await browser.evaluate(`${region}.innerText.includes('This is a request') && ${region}.innerText.includes('Your puja is in progress')`));
  console.log('PASS: actual customer UI shows all active bookings, including past dates; no terminal bookings');

  const beforeScroll = await browser.evaluate(`${region}.getBoundingClientRect().top`);
  assert.equal(await browser.evaluate(`getComputedStyle(document.querySelector('[data-testid="customer-puja-reminder"]')).position`), 'fixed');
  await browser.evaluate(`(window.scrollTo(0, 500), true)`);
  await new Promise(resolve => setTimeout(resolve, 300));
  assert.ok(await browser.evaluate(`window.scrollY > 0`));
  assert.ok(Math.abs(await browser.evaluate(`${region}.getBoundingClientRect().top`) - beforeScroll) < 2);
  console.log('PASS: reminder is outside document flow and stays fixed as the page scrolls');

  await browser.click(`a[href="/booking/${fixtures.get('confirmed')}"]`);
  await browser.wait(`location.pathname==='/booking/${fixtures.get('confirmed')}'`, 'reminder details link');
  assert.equal(await browser.evaluate(has(fixtures.get('pending')!)), true);
  await browser.command('Page.reload');
  await browser.wait(has(fixtures.get('in_progress')!), 'reminders after refresh');
  await browser.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await browser.evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), true);
  assert.ok(await browser.evaluate(`${region}.getBoundingClientRect().height < innerHeight / 2`));
  assert.ok(await browser.evaluate(`${region}.getBoundingClientRect().bottom <= innerHeight - 80`));
  console.log('PASS: links, cross-page persistence, refresh, mobile sizing');

  await store.updateBookingStatus(fixtures.get('in_progress')!, 'completed');
  await store.updateBookingStatus(fixtures.get('confirmed')!, 'cancelled');
  await browser.wait(`!(${has(fixtures.get('in_progress')!)}) && !(${has(fixtures.get('confirmed')!)})`, 'live completion/cancellation cleanup');
  assert.equal(await browser.evaluate(`${region}.querySelectorAll('li').length`), 2);
  console.log('PASS: completion and cancellation remove reminders through polling without refresh');
  for (const status of ['pending', 'pending_approval']) await store.updateBookingStatus(fixtures.get(status)!, 'cancelled');
  await browser.wait(`!${region}`, 'no active bookings hides reminder');
  for (const user of [admin, guruji]) {
    await signIn(user);
    await browser.command('Page.navigate', { url: base });
    await browser.wait(`!!document.querySelector('header')`, `${user.role} home`);
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.equal(await browser.evaluate(`!!${region}`), false);
  }
  await browser.command('Network.clearBrowserCookies');
  await browser.command('Page.navigate', { url: base });
  await browser.wait(`!!document.querySelector('header')`, 'signed-out home');
  assert.equal(await browser.evaluate(`!!${region}`), false);
  console.log('PASS: empty state, admins, Gurujis and signed-out visitors show no customer reminders');
} finally {
  await browser?.close();
  await pool.query(`DELETE FROM notifications WHERE "userId"=ANY($1::int[])`, [users]);
  await pool.query(`DELETE FROM bookings WHERE id=ANY($1::int[])`, [bookings]);
  await pool.query(`DELETE FROM users WHERE id=ANY($1::int[])`, [users]);
  await pool.end();
  console.log('Temporary reminder fixtures removed.');
}