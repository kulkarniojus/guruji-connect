import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import WebSocket from 'ws';
import { DBStorage } from '../server/dbStorage';
import { pool } from '../server/db';

// Development-only integration test. Creates isolated fixtures and removes only those fixtures.
const domain = process.env.REPLIT_DEV_DOMAIN;
if (process.env.NODE_ENV === 'production' || !domain?.endsWith('.replit.dev')) {
  throw new Error('Run this test only against the running development app.');
}
const base = `https://${domain}`;
const store = new DBStorage();
const users: number[] = [];
const profiles: number[] = [];
const password = randomBytes(18).toString('hex');
const tag = randomBytes(6).toString('hex');
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let browser: ReturnType<typeof spawn> | undefined;
let socket: WebSocket | undefined;
let browserDirectory: string | undefined;
let customerId: number | undefined;

async function api(path: string, method = 'GET', body?: unknown, cookie = '') {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0] || cookie,
  };
}

async function makeUser(role: 'customer' | 'guruji' | 'admin', suffix: string) {
  const user = await store.createUser({
    firstName: 'BookingQA', lastName: suffix, email: `booking-qa-${tag}-${suffix}@example.invalid`,
    mobile: `9${BigInt(`0x${randomBytes(5).toString('hex')}`).toString().padStart(9, '0').slice(-9)}`,
    password, role, age: 30, gender: 'other',
  });
  users.push(user.id);
  return user;
}

async function login(email: string, admin = false) {
  const result = await api(admin ? '/api/admin/login' : '/api/auth/login', 'POST', { email, password });
  assert.equal(result.status, 200, 'Genuine login must succeed');
  return result.cookie;
}

async function openBrowser() {
  browserDirectory = await mkdtemp(`${tmpdir()}/guruji-booking-qa-`);
  browser = spawn('chromium', [
    '--headless', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=9223',
    '--remote-debugging-address=127.0.0.1', `--user-data-dir=${browserDirectory}`, 'about:blank',
  ], { stdio: 'ignore' });
  let page: any;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const pages = await (await fetch('http://127.0.0.1:9223/json')).json() as any[];
      page = pages.find(item => item.type === 'page');
      if (page) break;
    } catch {}
    await delay(250);
  }
  assert.ok(page, 'System Chromium must start');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => { socket!.once('open', resolve); socket!.once('error', reject); });
  let sequence = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  socket.on('message', data => {
    const message = JSON.parse(String(data));
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id)!;
      pending.delete(message.id);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    }
  });
  const command = (method: string, params: any = {}) => new Promise<any>((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket!.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`Browser command timed out: ${method}`));
    }, 15000).unref();
  });
  const evaluate = async (expression: string) => {
    const result = await command('Runtime.evaluate', {
      expression: `(async () => (${expression}))()`, awaitPromise: true, returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result?.value;
  };
  const wait = async (expression: string, label: string) => {
    for (let attempt = 0; attempt < 160; attempt++) {
      if (await evaluate(expression)) return;
      await delay(250);
    }
    throw new Error(`Browser did not reach: ${label}`);
  };
  const click = async (selector: string, text: string) => {
    const position = await evaluate(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.textContent.trim() === ${JSON.stringify(text)});
      if (!el) throw new Error('Missing button');
      el.scrollIntoView({block:'center'});
      const r = el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', ...position, button: 'left', clickCount: 1 });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', ...position, button: 'left', clickCount: 1 });
  };
  await command('Page.enable');
  await command('Runtime.enable');
  return { command, evaluate, wait, click };
}

try {
  const settings = await api('/api/settings/payment');
  assert.equal(settings.data.paymentSkipped, true);
  assert.equal(settings.data.paymentRequired, false);
  const pujas = (await api('/api/pujas')).data;
  const puja = pujas.find((item: any) => item.price > 0 && item.duration >= 0);
  const city = (await api('/api/cities')).data[0];
  assert.ok(puja && city, 'A service and city must exist');
  const cityKey = city.name.toLowerCase().replace(/\s+/g, '-');
  const customer = await makeUser('customer', 'customer');
  customerId = customer.id;
  const guruji = await makeUser('guruji', 'guruji');
  const outsider = await makeUser('guruji', 'outsider');
  const admin = await makeUser('admin', 'admin');
  for (const user of [guruji, outsider]) {
    const result = await pool.query(`INSERT INTO guruji_profiles
      ("userId",city,experience,"pricePerHour","isVerified","isAvailable","createdAt","updatedAt",status,specialities,aadhar_verified,documents_verified)
      VALUES ($1,$2,1,100,true,true,NOW(),NOW(),'approved',$3,true,true) RETURNING id`,
    [user.id, cityKey, [puja.name]]);
    profiles.push(result.rows[0].id);
  }
  const customerCookie = await login(customer.email);
  const gurujiCookie = await login(guruji.email);
  const outsiderCookie = await login(outsider.email);
  const adminCookie = await login(admin.email, true);
  assert.equal((await api('/api/auth/me', 'GET', undefined, customerCookie)).data.id, customer.id);
  console.log('PASS: genuine customer, Guruji and admin login');

  const ui = await openBrowser();
  await ui.command('Page.navigate', { url: base + '/' });
  await ui.wait('!!document.querySelector("header")', 'homepage');
  const draft = {
    returnTo: '/booking', activeStep: 3, bookingType: 'offline', consultationType: 'auto_select',
    gurujiSelectionMode: 'specific', selectedPujaId: String(puja.id), selectedDate: '2030-01-01',
    selectedTime: '09:00 AM', selectedCity: cityKey, address: 'Automated test address',
    pincode: '411001', selectedGurujiId: String(profiles[0]), withSamagri: false,
  };
  await ui.evaluate(`sessionStorage.setItem('guruji-booking-registration-draft', ${JSON.stringify(JSON.stringify(draft))})`);
  await ui.command('Page.navigate', { url: base + '/booking' });
  await ui.wait(`document.body.innerText.includes('BookingQA guruji')`, 'selected Guruji');
  await ui.click('button', 'Review Booking Request');
  await ui.wait(`!!document.querySelector('[role="dialog"] input[type="email"]')`, 'booking login dialog');
  for (const [type, value] of [['email', customer.email], ['password', password]]) {
    await ui.evaluate(`document.querySelector('[role="dialog"] input[type="${type}"]').focus()`);
    await ui.command('Input.insertText', { text: value });
  }
  await ui.click('[role="dialog"] button', 'Login');
  await ui.wait(`document.body.innerText.includes('Send Booking Request') && !document.querySelector('[role="dialog"]')`, 'authenticated request review');
  assert.equal(await ui.evaluate(`(await (await fetch('/api/auth/me')).json()).id`), customer.id);
  await ui.click('button', 'Send Booking Request');
  await ui.wait(`/^\\/booking\\/\\d+$/.test(location.pathname)`, 'created booking detail');
  await ui.wait(`document.body.innerText.includes('Awaiting Guruji acceptance')`, 'customer awaiting-acceptance status');
  const bookingId = Number(await ui.evaluate(`location.pathname.split('/').pop()`));
  let booking = (await api(`/api/bookings/${bookingId}`, 'GET', undefined, customerCookie)).data;
  assert.equal(booking.status, 'pending_approval');
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM payments WHERE "bookingId"=$1', [bookingId])).rows[0].n, 0);
  console.log('PASS: booking login preserves selections and sends an unpaid acceptance request');

  const request = (await store.getBookingRequestsByBookingId(bookingId))[0];
  assert.equal((await api(`/api/bookings/${bookingId}/status`, 'PUT', { status: 'in_progress' }, customerCookie)).status, 403);
  assert.equal((await api(`/api/bookings/${bookingId}/status`, 'PUT', { status: 'in_progress' }, adminCookie)).status, 409);
  assert.equal((await api(`/api/booking-requests/${request.id}/respond`, 'POST', { response: 'accept', commissionAcknowledged:true }, outsiderCookie)).status, 403);
  assert.equal((await api(`/api/booking-requests/${request.id}/respond`, 'POST', { response: 'accept', commissionAcknowledged:true }, gurujiCookie)).status, 200);
  assert.equal((await api(`/api/bookings/${bookingId}/status`, 'PUT', { status: 'completed' }, gurujiCookie)).status, 409);
  for (const cookie of [customerCookie, gurujiCookie, adminCookie]) {
    const bookings = (await api('/api/bookings', 'GET', undefined, cookie)).data;
    assert.equal(bookings.find((item: any) => item.id === bookingId)?.status, 'confirmed');
  }
  console.log('PASS: acceptance is persisted and visible to all roles; unauthorized and skipped transitions are rejected');

  await ui.command('Page.navigate', { url: base + `/booking/${bookingId}` });
  await ui.wait(`document.body.innerText.includes('Accepted by Guruji')`, 'customer accepted status');
  await ui.evaluate(`await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(${JSON.stringify({ email: guruji.email, password })})})`);
  await ui.command('Page.navigate', { url: base + '/dashboard?tab=upcoming' });
  await ui.wait(`document.body.innerText.includes('Start Puja')`, 'Guruji accepted booking');
  await ui.click('button', 'Start Puja');
  await ui.wait(`!!document.querySelector('[role="dialog"]')`, 'start confirmation');
  await ui.click('[role="dialog"] button', 'Start Puja');
  await ui.wait(`document.body.innerText.includes('Mark Completed')`, 'in-progress booking');
  await ui.click('button', 'Mark Completed');
  await ui.wait(`!!document.querySelector('[role="dialog"]')`, 'completion confirmation');
  await ui.click('[role="dialog"] button', 'Mark Completed');
  await ui.wait(`!document.querySelector('[role="dialog"]') && !document.body.innerText.includes('Mark Completed')`, 'completed booking');
  for (const cookie of [customerCookie, gurujiCookie, adminCookie]) {
    const bookings = (await api('/api/bookings', 'GET', undefined, cookie)).data;
    assert.equal(bookings.find((item: any) => item.id === bookingId)?.status, 'completed');
  }
  assert.equal((await api(`/api/bookings/${bookingId}/status`, 'PUT', { status: 'in_progress' }, adminCookie)).status, 409);
  console.log('PASS: Guruji start/completion buttons persist lifecycle status visible to customer/admin/Guruji');

  const adminBooking = await api('/api/bookings', 'POST', {
    pujaId: puja.id, type: 'offline', amount: puja.price, city: cityKey,
    address: 'Automated test address', date: '2030-01-02T09:00:00.000Z',
    calendarDate: '2030-01-02', time: '09:00 AM', gurujiId: profiles[0],
  }, customerCookie);
  assert.equal(adminBooking.status, 201);
  const adminRequest = (await store.getBookingRequestsByBookingId(adminBooking.data.id))[0];
  assert.equal((await api(`/api/booking-requests/${adminRequest.id}/respond`, 'POST', { response: 'accept', commissionAcknowledged:true }, gurujiCookie)).status, 200);
  assert.equal((await api(`/api/bookings/${adminBooking.data.id}/status`, 'PUT', { status: 'in_progress' }, outsiderCookie)).status, 403);
  assert.equal((await api(`/api/bookings/${adminBooking.data.id}/status`, 'PUT', { status: 'in_progress' }, adminCookie)).status, 200);
  assert.equal((await api(`/api/bookings/${adminBooking.data.id}/status`, 'PUT', { status: 'completed' }, adminCookie)).status, 200);
  console.log('PASS: admin can start/complete accepted pujas; unrelated Gurujis cannot');

  const declined = await api('/api/bookings', 'POST', {
    pujaId: puja.id, type: 'offline', amount: puja.price, city: cityKey,
    address: 'Automated test address', date: '2030-01-03T09:00:00.000Z',
    calendarDate: '2030-01-03', time: '09:00 AM', gurujiId: profiles[0],
  }, customerCookie);
  assert.equal(declined.status, 201);
  assert.equal((await api(`/api/bookings/${declined.data.id}/respond`, 'POST', { action: 'reject' }, gurujiCookie)).status, 200);
  booking = (await api(`/api/bookings/${declined.data.id}`, 'GET', undefined, customerCookie)).data;
  assert.equal(booking.status, 'pending');
  assert.equal((await store.getBookingRequestsByBookingId(declined.data.id))[0].status, 'declined');
  console.log('PASS: declined requests stay unaccepted, including the legacy response endpoint');
} finally {
  socket?.close();
  if (browser && browser.exitCode === null) {
    await new Promise<void>(resolve => {
      browser!.once('exit', () => resolve());
      browser!.kill('SIGTERM');
      setTimeout(() => browser!.kill('SIGKILL'), 3000).unref();
    });
  }
  if (customerId) {
    const fixtureBookings = (await pool.query('SELECT id FROM bookings WHERE "customerId"=$1', [customerId])).rows.map(row => row.id);
    if (fixtureBookings.length) {
      await pool.query('DELETE FROM booking_requests WHERE "bookingId"=ANY($1::int[])', [fixtureBookings]);
      await pool.query('DELETE FROM payments WHERE "bookingId"=ANY($1::int[])', [fixtureBookings]);
      await pool.query('DELETE FROM bookings WHERE id=ANY($1::int[])', [fixtureBookings]);
    }
  }
  if (users.length) await pool.query('DELETE FROM notifications WHERE "userId"=ANY($1::int[])', [users]);
  if (profiles.length) await pool.query('DELETE FROM guruji_profiles WHERE id=ANY($1::int[])', [profiles]);
  if (users.length) await pool.query('DELETE FROM users WHERE id=ANY($1::int[])', [users]);
  await pool.end();
  if (browserDirectory) await rm(browserDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.log('Temporary verification records removed.');
}