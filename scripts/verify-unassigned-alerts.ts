import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { isUnassignedBooking } from '../shared/isUnassignedBooking';
import { openBrowserTest } from './browserTest';

const domain = process.env.REPLIT_DEV_DOMAIN;
if (process.env.NODE_ENV === 'production' || !domain?.endsWith('.replit.dev')) throw new Error('Development only');
const base = `https://${domain}`;
const store = new DBStorage();
const tag = randomBytes(6).toString('hex');
const password = randomBytes(18).toString('hex');
const users: number[] = [], profiles: number[] = [], bookings: number[] = [];
let browser: Awaited<ReturnType<typeof openBrowserTest>> | undefined;

async function api(path: string, method = 'GET', data?: unknown, cookie = '') {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] || cookie };
}
async function user(role: 'admin' | 'guruji' | 'customer', label: string, blocked = false) {
  const result = await store.createUser({
    firstName: 'AlertsQA', lastName: label, email: `alerts-qa-${tag}-${label}@example.invalid`,
    mobile: `9${randomInt(100000000, 999999999)}`, password, role, age: 30, gender: 'other', isBlocked: blocked,
  } as any);
  users.push(result.id);
  if (blocked) await store.blockUser(result.id);
  return result;
}
async function login(account: any) {
  const response = await api(account.role === 'admin' ? '/api/admin/login' : '/api/auth/login', 'POST', { email: account.email, password });
  assert.equal(response.status, 200);
  return response.cookie;
}
const alerts = (id: number) => pool.query(
  `SELECT "userId","isRead",message FROM notifications WHERE type='unassigned_booking' AND message LIKE $1`,
  [`Booking #${id}: %`],
);

try {
  for (const status of ['pending', 'pending_approval']) assert.equal(isUnassignedBooking({ status }), true);
  for (const status of ['cancelled', 'completed', 'confirmed', 'in_progress']) assert.equal(isUnassignedBooking({ status }), false);
  assert.equal(isUnassignedBooking({ status: 'pending_approval', gurujiId: 1 }), false);
  const puja = (await api('/api/pujas')).data.find((p: any) => Number(p.price) > 0 && p.duration >= 0);
  const city = `Alerts QA ${tag}`;
  const cityKey = city.toLowerCase().replace(/\s+/g, '-');
  const customer = await user('customer', 'customer');
  const admin = await user('admin', 'admin');
  await user('admin', 'second-admin');
  const blockedAdmin = await user('admin', 'blocked-admin', true);
  const candidates: any[] = [];
  for (const label of ['linked', 'legacy', 'wrong-service', 'wrong-location', 'unapproved', 'blocked', 'busy']) {
    const account = await user('guruji', label, label === 'blocked');
    const result = await pool.query(
      `INSERT INTO guruji_profiles
       ("userId",city,pincode,experience,"pricePerHour","isVerified","isAvailable",
        "createdAt","updatedAt",status,specialities,aadhar_verified,documents_verified)
       VALUES ($1,$2,$3,1,100,true,true,NOW(),NOW(),$4,$5,true,true) RETURNING id`,
      [account.id, label === 'wrong-location' ? `Elsewhere ${tag}` : city,
        label === 'wrong-location' ? '900124' : '900123',
        label === 'unapproved' ? 'pending' : 'approved',
        label === 'linked' ? [] : [label === 'wrong-service' ? `Other service ${tag}` : puja.name]],
    );
    const id = result.rows[0].id;
    profiles.push(id);
    candidates.push({ ...account, profileId: id, label });
    if (label === 'linked') await pool.query(`INSERT INTO guruji_pujas ("gurujiId","pujaId","createdAt","updatedAt") VALUES ($1,$2,NOW(),NOW())`, [id, puja.id]);
  }
  const date = '2031-04-10', time = '09:00 AM';
  const busyBooking = await store.createBooking({
    customerId: customer.id, pujaId: puja.id, gurujiId: candidates.find(g => g.label === 'busy').profileId,
    type: 'offline', amount: Number(puja.price), date: new Date(`${date}T12:00:00Z`), time, city: cityKey,
    duration: puja.duration, status: 'confirmed',
  } as any);
  bookings.push(busyBooking.id);
  const customerCookie = await login(customer);
  const adminCookie = await login(admin);
  const payload = { pujaId: puja.id, type: 'offline', amount: Number(puja.price), city: cityKey,
    pincode: '900123', date: `${date}T12:00:00Z`, calendarDate: date, time, address: 'QA address' };
  const created = await api('/api/bookings', 'POST', payload, customerCookie);
  assert.equal(created.status, 201);
  bookings.push(created.data.id);
  const id = created.data.id;
  const requests = await store.getBookingRequestsByBookingId(id);
  assert.deepEqual(requests.map((r: any) => r.gurujiId).sort((a: number,b: number) => a-b), candidates.slice(0,2).map(g => g.profileId).sort((a,b) => a-b));
  for (const candidate of candidates) {
    const notices = (await store.getNotifications(candidate.id)).filter(n => n.type === 'booking_request');
    assert.equal(notices.length, ['linked', 'legacy'].includes(candidate.label) ? 1 : 0);
  }
  const expectedAdmins = (await pool.query(`SELECT id FROM users WHERE role='admin' AND "isBlocked"=false`)).rows.map(r => r.id).sort((a,b)=>a-b);
  const persisted = (await alerts(id)).rows;
  assert.deepEqual(persisted.map(n => n.userId).sort((a,b)=>a-b), expectedAdmins);
  assert.ok(persisted.every(n => !n.isRead && n.message.includes(puja.name) && n.message.includes('2 eligible Gurujis')));
  assert.ok(!persisted.some(n => n.userId === blockedAdmin.id));
  assert.equal((await api('/api/admin/bookings', 'GET', undefined, customerCookie)).status, 403);
  const resend = await api(`/api/admin/bookings/${id}/send-requests`, 'POST', {}, adminCookie);
  assert.equal(resend.status, 200);
  assert.equal(resend.data.requestCount, 0);
  assert.equal((await store.getBookingRequestsByBookingId(id)).length, 2);
  console.log('PASS: all eligible local Gurujis and every active admin notified; wrong service/location, unapproved, blocked and busy Gurujis excluded; resend stays local without duplicates');

  const empty = await api('/api/bookings', 'POST', { ...payload, city: `No-match-${tag}`, pincode: '000000' }, customerCookie);
  assert.equal(empty.status, 201);
  bookings.push(empty.data.id);
  assert.equal((await store.getBookingRequestsByBookingId(empty.data.id)).length, 0);
  const emptyAlerts = (await alerts(empty.data.id)).rows;
  assert.equal(emptyAlerts.length, expectedAdmins.length);
  assert.ok(emptyAlerts.every(n => n.message.includes('No eligible Guruji')));
  assert.equal((await api(`/api/admin/bookings/${empty.data.id}/send-requests`, 'POST', {}, adminCookie)).status, 400);
  console.log('PASS: zero matches still alerts every admin and does not broadcast to unrelated Gurujis');

  browser = await openBrowserTest();
  await browser.command('Page.navigate', { url: base + '/admin' });
  await browser.wait(`!!document.querySelector('input[name="email"]')`, 'admin login');
  await browser.type('input[name="email"]', admin.email);
  await browser.type('input[name="password"]', password);
  await browser.click('button[type="submit"]');
  await browser.wait(`location.pathname==='/admin-dashboard' && document.body.innerText.includes('Review unassigned pujas')`, 'admin overview warning');
  await browser.click('button', 'Review unassigned pujas');
  await browser.wait(`document.body.innerText.includes('#${id}') && document.body.innerText.includes('#${empty.data.id}')`, 'unassigned puja list');
  assert.equal(await browser.evaluate(`document.body.innerText.includes('#${busyBooking.id}')`), false);
  assert.ok(await browser.evaluate(`document.querySelector('button[aria-pressed="true"]')?.textContent.toLowerCase().includes('unassigned')`));
  console.log('PASS: actual admin overview warning opens a working unassigned-only list; assigned bookings excluded');

  const gurujiCookie = await login(candidates[0]);
  assert.equal((await api(`/api/booking-requests/${requests.find((r:any)=>r.gurujiId===candidates[0].profileId).id}/respond`, 'POST', { response: 'accept' }, gurujiCookie)).status, 200);
  assert.ok((await alerts(id)).rows.every(n => n.isRead));
  await browser.wait(`!document.body.innerText.includes('#${id}')`, 'accepted puja leaves live unassigned list');
  assert.equal((await api(`/api/admin/bookings/${id}/send-requests`, 'POST', {}, adminCookie)).status, 409);
  const cancelled = await api(`/api/bookings/${empty.data.id}/cancel`, 'POST', { reason: 'QA cancellation after no matches' }, adminCookie);
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.data));
  assert.ok((await alerts(empty.data.id)).rows.every(n => n.isRead));
  await browser.wait(`!document.body.innerText.includes('#${empty.data.id}')`, 'cancelled puja leaves live unassigned list');
  assert.equal((await api(`/api/admin/bookings/${empty.data.id}/send-requests`, 'POST', {}, adminCookie)).status, 409);
  console.log('PASS: genuine acceptance and cancellation clear current alerts and the live list; resolved bookings cannot be reopened by resend');
} finally {
  await browser?.close();
  const fixtureBookings = await pool.query(`SELECT id FROM bookings WHERE "customerId"=ANY($1::int[])`, [users]);
  for (const row of fixtureBookings.rows) if (!bookings.includes(row.id)) bookings.push(row.id);
  await pool.query(`DELETE FROM notifications WHERE type='unassigned_booking' AND message LIKE ANY($1::text[])`, [bookings.map(id => `Booking #${id}: %`)]);
  await pool.query(`DELETE FROM notifications WHERE "userId"=ANY($1::int[])`, [users]);
  await pool.query(`DELETE FROM booking_requests WHERE "bookingId"=ANY($1::int[])`, [bookings]);
  await pool.query(`DELETE FROM bookings WHERE id=ANY($1::int[])`, [bookings]);
  await pool.query(`DELETE FROM guruji_pujas WHERE "gurujiId"=ANY($1::int[])`, [profiles]);
  await pool.query(`DELETE FROM guruji_profiles WHERE id=ANY($1::int[])`, [profiles]);
  await pool.query(`DELETE FROM users WHERE id=ANY($1::int[])`, [users]);
  await pool.end();
  console.log('Temporary alert test fixtures removed.');
}