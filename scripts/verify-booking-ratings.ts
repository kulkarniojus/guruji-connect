import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { openBrowserTest } from './browserTest';

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (process.env.NODE_ENV === 'production' || !base.endsWith('.replit.dev')) throw new Error('Development verification only');
const tag = `RatingsQA-${randomBytes(6).toString('hex')}`;
const password = randomBytes(18).toString('hex');
const users: number[] = [], profiles: number[] = [], bookings: number[] = [];
const cookies: string[] = [];
let ui: Awaited<ReturnType<typeof openBrowserTest>> | undefined;
async function api(path: string, cookie?: string, method = 'GET', payload?: unknown) {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
async function account(role: 'customer' | 'guruji' | 'admin', suffix: string) {
  const user = await new DBStorage().createUser({
    firstName: 'RatingsQA', lastName: suffix, email: `${tag}-${suffix}@example.invalid`,
    mobile: `9${randomInt(100000000, 999999999)}`, password, role,
  } as any);
  users.push(user.id);
  const result = await api(role === 'admin' ? '/api/admin/login' : '/api/auth/login', undefined, 'POST', { email: user.email, password });
  assert.equal(result.status, 200);
  const cookie = result.headers.get('set-cookie')!.split(';')[0];
  cookies.push(cookie);
  return { id: user.id, cookie };
}
async function booking(customerId: number, gurujiId: number, completed = true) {
  const puja = (await pool.query(`SELECT id FROM pujas WHERE "isActive"=true ORDER BY id LIMIT 1`)).rows[0];
  const row = (await pool.query(
    `INSERT INTO bookings ("customerId","gurujiId","pujaId",date,time,address,city,state,pincode,
      "locationType","totalAmount",status,"consultationType","createdAt","updatedAt")
     VALUES ($1,$2,$3,CURRENT_DATE,'11:00',$4,'Pune','Maharashtra','411001','home',2500,$5,'own_guruji',NOW(),NOW()) RETURNING id`,
    [customerId, gurujiId, puja.id, tag, completed ? 'completed' : 'confirmed'])).rows[0];
  bookings.push(row.id);
  return row.id as number;
}
async function navigate(cookie: string, path: string, ready: string) {
  const split = cookie.indexOf('=');
  await ui!.command('Network.setCookie', { name: cookie.slice(0, split), value: cookie.slice(split + 1), url: base });
  await ui!.command('Page.navigate', { url: base + path });
  await ui!.command('Page.bringToFront');
  await ui!.wait(ready, `loaded ${path}`);
}
async function clickText(selector: string, text: string) {
  await ui!.wait(`Array.from(document.querySelectorAll(${JSON.stringify(selector)})).some(el=>el.textContent.trim()===${JSON.stringify(text)} && !el.disabled)`, text);
  const element = `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(el=>el.textContent.trim()===${JSON.stringify(text)})`;
  if (selector === '[role="tab"]') {
    await ui!.evaluate(`${element}.focus()`);
    await ui!.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await ui!.command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  } else {
    await ui!.evaluate(`${element}.click()`);
  }
}
async function clickSelector(selector: string) {
  await ui!.wait(`!!document.querySelector(${JSON.stringify(selector)})`, selector);
  await ui!.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
}
const both = (id: number, cookie: string) => api(`/api/reviews/booking/${id}/both`, cookie);
try {
  const customer = await account('customer', 'owner');
  const outsider = await account('customer', 'outsider');
  const guruji = await account('guruji', 'guruji');
  const admin = await account('admin', 'admin');
  const profile = (await pool.query(
    `INSERT INTO guruji_profiles ("userId",city,experience,"pricePerHour",status,"createdAt","updatedAt")
     VALUES ($1,'Pune',5,1000,'approved',NOW(),NOW()) RETURNING id`, [guruji.id])).rows[0].id;
  profiles.push(profile);
  const a = await booking(customer.id, profile);
  const pending = await booking(customer.id, profile, false);
  const post = (cookie: string, payload: any) => api('/api/reviews', cookie, 'POST', { bookingId: a, gurujiId: profile, rating: 5, ...payload });
  assert.equal((await post(outsider.cookie, {})).status, 403);
  assert.equal((await post(admin.cookie, {})).status, 403);
  assert.equal((await post(customer.cookie, { fromRole: 'guruji' })).status, 403);
  assert.equal((await post(customer.cookie, { gurujiId: profile + 99999 })).status, 400);
  assert.equal((await post(customer.cookie, { bookingId: pending })).status, 400);
  for (const rating of [0, 6, 3.5, true, 'bad']) assert.equal((await post(customer.cookie, { rating })).status, 400);
  assert.equal((await post(customer.cookie, { review: 'x'.repeat(501) })).status, 400);
  assert.equal((await both(a, outsider.cookie)).status, 403);
  assert.equal((await api(`/api/reviews/booking/${a}`, outsider.cookie)).status, 403);
  assert.equal((await api('/api/admin/ratings', customer.cookie)).status, 403);
  assert.equal((await api('/api/reviews', undefined, 'POST', {})).status, 401);
  assert.deepEqual((await both(a, admin.cookie)).body, { customerReview: null, gurujiReview: null });
  console.log('PASS: ratings limited to completed assigned bookings, valid whole stars, real participant roles and authorized readers');

  ui = await openBrowserTest();
  await ui.command('Network.enable');
  await navigate(customer.cookie, '/dashboard', `document.body?.innerText.includes('Upcoming')`);
  await ui.wait(`Array.from(document.querySelectorAll('[role="tab"]')).some(el=>el.textContent.includes('Past'))`, 'customer past bookings tab');
  const pastText = await ui.evaluate(`Array.from(document.querySelectorAll('[role="tab"]')).find(el=>el.textContent.includes('Past')).textContent.trim()`);
  await clickText('[role="tab"]', pastText);
  await clickText('button', 'Rate Service');
  await clickSelector('button[aria-label="Rate 5 stars"]');
  const customerNote = 'The Guruji explained each step and performed the ceremony carefully.';
  await ui.type('#review', customerNote);
  await ui.command('Network.setBlockedURLs', { urls: ['*://*/api/reviews'] });
  await clickText('[role="dialog"] button', 'Submit Rating');
  await ui.wait(`!!document.querySelector('[role="dialog"] [role="alert"]')`, 'failed submission stays open with error');
  assert.equal(await ui.evaluate(`document.querySelector('#review').value`), customerNote);
  assert.equal((await both(a, admin.cookie)).body.customerReview, null);
  await ui.command('Network.setBlockedURLs', { urls: [] });
  await clickText('[role="dialog"] button', 'Submit Rating');
  await ui.wait(`!document.querySelector('[role="dialog"]') && document.body.innerText.includes('Rated 5/5')`, 'customer rating success');
  assert.equal((await both(a, admin.cookie)).body.customerReview.review, customerNote);
  await ui.command('Page.reload');
  await ui.wait(`document.body?.innerText.includes('Upcoming')`, 'customer dashboard reload');
  assert.equal((await api(`/api/reviews/booking/${a}`, customer.cookie)).body.rating, 5);
  console.log('PASS: customer rate-Guruji dialog preserves failed form, retries successfully, persists after reload');

  await navigate(guruji.cookie, '/dashboard', `document.body?.innerText.includes('Completed')`);
  const gurujiCompleted = await ui.evaluate(`Array.from(document.querySelectorAll('[role="tab"]')).find(el=>el.textContent.includes('Completed')).textContent.trim()`);
  await clickText('[role="tab"]', gurujiCompleted);
  await clickText('button', 'Rate Customer');
  await clickSelector('button[aria-label="Rate 2 stars"]');
  const gurujiNote = 'The customer needed additional guidance with the preparations.';
  await ui.type('#customer-review', gurujiNote);
  await clickText('[role="dialog"] button', 'Submit Rating');
  await ui.wait(`!document.querySelector('[role="dialog"]') && document.body.innerText.includes('Rated 2/5')`, 'Guruji rating success');
  const pair = (await both(a, admin.cookie)).body;
  assert.equal(pair.customerReview.rating, 5);
  assert.equal(pair.gurujiReview.rating, 2);
  assert.equal(pair.gurujiReview.review, gurujiNote);
  const aggregate = (await pool.query('SELECT rating,"totalReviews" FROM guruji_profiles WHERE id=$1', [profile])).rows[0];
  assert.equal(aggregate.rating, 5);
  assert.equal(aggregate.totalReviews, 1);
  assert.equal((await api(`/api/reviews/guruji/${profile}`)).body.length, 1);
  assert.equal((await api('/api/reviews/my-customer-ratings', customer.cookie)).body[0].rating, 2);
  console.log('PASS: Guruji rate-customer UI saves separate feedback; customer rating does not contaminate Guruji score or public reviews');

  await navigate(admin.cookie, '/admin-dashboard', `Array.from(document.querySelectorAll('[role="tab"]')).some(el=>el.textContent.trim()==='Bookings')`);
  await clickText('[role="tab"]', 'Bookings');
  await ui.wait(`!!document.querySelector('button[aria-label="View ratings for booking #${a}"]')`, 'per-booking admin ratings');
  await ui.click(`button[aria-label="View ratings for booking #${a}"]`);
  await ui.wait(`document.querySelector('[role="dialog"]')?.innerText.includes(${JSON.stringify(customerNote)}) && document.querySelector('[role="dialog"]')?.innerText.includes(${JSON.stringify(gurujiNote)})`, 'admin sees both comments');
  assert.ok(await ui.evaluate(`document.querySelector('[role="dialog"]').innerText.includes('5/5') && document.querySelector('[role="dialog"]').innerText.includes('2/5')`));
  await clickText('[role="dialog"] button', 'Close');
  await clickText('[role="tab"]', 'Ratings');
  await ui.wait(`document.body.innerText.includes(${JSON.stringify(customerNote)}) && document.body.innerText.includes(${JSON.stringify(gurujiNote)})`, 'admin ratings analytics');
  const analytics = await api('/api/admin/ratings', admin.cookie);
  assert.equal(analytics.status, 200);
  assert.ok(analytics.body.recentGurujiReviews.some((r: any) => r.bookingId === a && r.rating === 5));
  assert.ok(analytics.body.recentCustomerRatings.some((r: any) => r.bookingId === a && r.rating === 2));
  console.log('PASS: admin Bookings shows both ratings and comments; Ratings tab loads both directions and summaries');

  const b = await booking(customer.id, profile);
  const c = await booking(customer.id, profile);
  const raced = await Promise.all([
    post(customer.cookie, { bookingId: b, rating: 1 }),
    post(customer.cookie, { bookingId: b, rating: 1 }),
    post(customer.cookie, { bookingId: c, rating: 3 }),
  ]);
  assert.deepEqual(raced.map(r => r.status).sort(), [201, 201, 409]);
  const stats = (await pool.query('SELECT rating,"totalReviews" FROM guruji_profiles WHERE id=$1', [profile])).rows[0];
  assert.equal(stats.rating, 3);
  assert.equal(stats.totalReviews, 3);
  console.log('PASS: duplicate/concurrent submissions cannot double-rate; concurrent bookings maintain the correct Guruji average');

  const d = await booking(customer.id, profile);
  await navigate(customer.cookie, `/booking/${d}`, `Array.from(document.querySelectorAll('button')).some(el=>el.textContent.trim()==='Rate Guruji')`);
  await clickText('button', 'Rate Guruji');
  await clickSelector('button[aria-label="Rate 4 stars"]');
  await ui.type('#review', 'Booking details rating submission works correctly.');
  await clickText('[role="dialog"] button', 'Submit Rating');
  await ui.wait(`!document.querySelector('[role="dialog"]') && document.body.innerText.includes('You rated: 4/5')`, 'booking detail rating success');
  const oneSided = (await both(d, admin.cookie)).body;
  assert.equal(oneSided.customerReview.rating, 4);
  assert.equal(oneSided.gurujiReview, null);
  console.log('PASS: booking details Rate Guruji also works; admin receives one-sided feedback without an invented counterpart rating');
} finally {
  if (ui) await ui.close();
  await Promise.all(cookies.map(cookie => api('/api/auth/logout', cookie, 'POST')));
  await pool.query('DELETE FROM reviews WHERE "bookingId"=ANY($1::int[])', [bookings]);
  await pool.query('DELETE FROM bookings WHERE id=ANY($1::int[])', [bookings]);
  await pool.query('DELETE FROM notifications WHERE "userId"=ANY($1::int[])', [users]);
  await pool.query('DELETE FROM guruji_profiles WHERE id=ANY($1::int[])', [profiles]);
  await pool.query('DELETE FROM users WHERE id=ANY($1::int[])', [users]);
  await pool.end();
  console.log('All temporary ratings fixtures removed.');
}