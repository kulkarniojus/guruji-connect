import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { openBrowserTest } from './browserTest';

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (process.env.NODE_ENV === 'production' || !base.endsWith('.replit.dev')) throw new Error('Development verification only');
const tag = `CompletionQA-${randomBytes(6).toString('hex')}`;
const password = randomBytes(18).toString('hex');
const users: number[] = [], profiles: number[] = [], bookings: number[] = [];
let ui: Awaited<ReturnType<typeof openBrowserTest>> | undefined;

async function api(path: string, cookie?: string, method = 'GET', payload?: unknown) {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
  });
  const body = response.status === 204 ? {} : await response.json();
  return { status: response.status, body, headers: response.headers };
}
async function account(role: 'customer' | 'guruji' | 'admin', suffix: string) {
  const user = await new DBStorage().createUser({
    firstName: 'CompletionQA', lastName: suffix, email: `${tag}-${suffix}@example.invalid`,
    mobile: `9${randomInt(100000000, 999999999)}`, password, role,
  } as any);
  users.push(user.id);
  const result = await api(role === 'admin' ? '/api/admin/login' : '/api/auth/login', undefined, 'POST', { email: user.email, password });
  assert.equal(result.status, 200, `${role} fixture login`);
  return { userId: user.id, cookie: result.headers.get('set-cookie')!.split(';')[0] };
}
async function createBooking(customerId: number, gurujiId: number, accepted = true) {
  const puja = (await pool.query(`SELECT id FROM pujas WHERE "isActive"=true ORDER BY id LIMIT 1`)).rows[0];
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const result = await pool.query(
    `INSERT INTO bookings ("customerId","pujaId","gurujiId",date,time,address,city,state,pincode,
      "locationType","totalAmount",notes,status,"consultationType","createdAt","updatedAt",duration)
     VALUES ($1,$2,$3,$4,'11:00',$5,'Pune','Maharashtra','411001','home',2500,$5,
      'confirmed','own_guruji',NOW(),NOW(),120) RETURNING id`,
    [customerId, puja.id, gurujiId, date, tag]);
  const id = result.rows[0].id;
  bookings.push(id);
  if (accepted) await accept(id, gurujiId);
  return id;
}
async function accept(id: number, gurujiId: number) {
  await pool.query(`INSERT INTO booking_requests ("bookingId","gurujiId",status) VALUES ($1,$2,'accepted')`, [id, gurujiId]);
}
async function cookie(value: string) {
  const split = value.indexOf('=');
  await ui!.command('Network.setCookie', { name: value.slice(0, split), value: value.slice(split + 1), url: base });
}
async function detail(id: number) {
  await ui!.command('Page.navigate', { url: `${base}/booking/${id}` });
  await ui!.wait(`document.body.innerText.includes('Puja completion')`, 'completion controls');
  await ui!.wait(`!document.querySelector('[aria-label="Loading completion details"]')`, 'loaded completion metadata');
}
async function activate(selector: string, text?: string) {
  const target = `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(el=>${text === undefined ? 'true' : `el.textContent.trim()===${JSON.stringify(text)}`})`;
  await ui!.wait(`!!(${target}) && !(${target}).disabled`, `enabled ${text || selector}`);
  await ui!.evaluate(`(${target}).focus()`);
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
}
async function fill(selector: string, text: string) {
  await ui!.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await ui!.command('Input.insertText', { text });
}
const state = async (id: number) => (await pool.query('SELECT status FROM bookings WHERE id=$1', [id])).rows[0].status;

try {
  const customer = await account('customer', 'owner');
  const outsider = await account('customer', 'outsider');
  const guruji = await account('guruji', 'guruji');
  const otherGuruji = await account('guruji', 'other-guruji');
  const admin = await account('admin', 'admin');
  const profile = (await pool.query(
    `INSERT INTO guruji_profiles ("userId",city,experience,"pricePerHour",status,"createdAt","updatedAt")
     VALUES ($1,'Pune',5,1000,'approved',NOW(),NOW()) RETURNING id`, [guruji.userId])).rows[0].id;
  profiles.push(profile);
  const a = await createBooking(customer.userId, profile, false);
  const path = `/api/bookings/${a}/completion`;
  assert.equal((await api(path)).status, 401);
  assert.equal((await api(path, outsider.cookie)).status, 403);
  assert.equal((await api(path, otherGuruji.cookie)).status, 403);
  assert.equal((await api(path + '/request', outsider.cookie, 'POST', {})).status, 403);
  assert.equal((await api(`/api/bookings/${a}/status`, customer.cookie, 'PUT', { status: 'in_progress' })).status, 403);
  assert.equal((await api(`/api/bookings/${a}/status`, guruji.cookie, 'PUT', { status: 'in_progress' })).status, 409);
  await accept(a, profile);
  assert.equal((await api(`/api/bookings/${a}/status`, guruji.cookie, 'PUT', { status: 'in_progress' })).status, 200);
  assert.equal((await api(path, customer.cookie)).body.requestedAt, null);
  assert.equal((await api(path, customer.cookie)).body.otp, undefined);
  assert.equal((await api(`/api/bookings/${a}/status`, guruji.cookie, 'PUT', { status: 'completed' })).status, 409);
  assert.equal((await api(`/api/bookings/${a}/status`, admin.cookie, 'PUT', { status: 'completed' })).status, 409);
  console.log('PASS: genuine acceptance required, start has no OTP, unauthorized access and old completion bypass blocked');

  const requested = await api(path + '/request', guruji.cookie, 'POST', {});
  assert.equal(requested.status, 200);
  assert.equal(requested.body.otp, undefined);
  const customerRead = await api(path, customer.cookie);
  assert.match(customerRead.headers.get('cache-control') || '', /no-store/);
  const code = customerRead.body.otp;
  assert.ok(/^\d{6}$/.test(code));
  assert.ok((await api(path, customer.cookie)).body.otp === code, 'Refresh preserves current code');
  assert.equal((await api(path, guruji.cookie)).body.otp, undefined);
  assert.equal((await api(path, admin.cookie)).body.otp, undefined);
  assert.ok(Array.isArray((await api(path, admin.cookie)).body.history));
  assert.equal((await api(path, customer.cookie)).body.history, undefined);
  const stored = (await pool.query('SELECT * FROM booking_completion_challenges WHERE booking_id=$1', [a])).rows[0];
  assert.ok(stored.code_cipher !== code && stored.otp_digest !== code);
  assert.equal((await api(path + '/request', guruji.cookie, 'POST', { resend: true })).status, 429);
  assert.equal((await api(path + '/verify', customer.cookie, 'POST', { otp: code })).status, 403);
  assert.equal((await api(path + '/verify', otherGuruji.cookie, 'POST', { otp: code })).status, 403);
  assert.equal((await api(path + '/override', guruji.cookie, 'POST', { reason: 'Unauthorized completion test' })).status, 403);
  assert.equal((await api(path + '/override', admin.cookie, 'POST', { reason: '' })).status, 400);
  console.log('PASS: customer-only private code, encrypted persistence, reload, admin audit and participant resend cooldown');

  assert.equal((await api(path + '/request', admin.cookie, 'POST', { resend: true })).status, 200);
  const newCode = (await api(path, customer.cookie)).body.otp;
  assert.ok(newCode !== code, 'Resend invalidates and replaces the prior code');
  assert.equal((await api(path + '/verify', guruji.cookie, 'POST', { otp: code })).status, 400);
  const wrong = ((Number(newCode) + 1) % 1000000).toString().padStart(6, '0');
  for (let i = 0; i < 4; i++) {
    assert.equal((await api(path + '/verify', guruji.cookie, 'POST', { otp: wrong })).status, i === 3 ? 429 : 400);
  }
  assert.equal((await api(path + '/verify', guruji.cookie, 'POST', { otp: newCode })).status, 429);
  assert.equal((await api(path, customer.cookie)).body.otp, undefined);
  assert.equal(await state(a), 'in_progress');
  await pool.query(`UPDATE booking_completion_challenges SET expires_at=NOW()-INTERVAL '1 second',attempt_count=0 WHERE booking_id=$1`, [a]);
  assert.equal((await api(path + '/verify', guruji.cookie, 'POST', { otp: newCode })).status, 410);
  assert.equal((await api(path, customer.cookie)).body.otp, undefined);
  await api(path + '/request', admin.cookie, 'POST', { resend: true });
  const finalCode = (await api(path, customer.cookie)).body.otp;
  const concurrent = await Promise.all([1, 2].map(() => api(path + '/verify', guruji.cookie, 'POST', { otp: finalCode })));
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
  assert.equal(await state(a), 'completed');
  assert.equal((await api(path, customer.cookie)).body.otp, undefined);
  assert.equal((await api(path + '/request', admin.cookie, 'POST', { resend: true })).status, 409);
  const completed = (await api(path, admin.cookie)).body;
  assert.equal(completed.completionMethod, 'customer_otp');
  assert.ok(completed.startedAt && completed.verifiedAt && completed.completedAt);
  assert.equal(completed.history.filter((e: any) => e.action === 'completion_otp_verified').length, 1);
  console.log('PASS: replaced code rejected, five-attempt lock, expiry, single-use/concurrent verification and timestamps');

  const b = await createBooking(customer.userId, profile);
  const c = await createBooking(customer.userId, profile);
  for (const id of [b, c]) assert.equal((await api(`/api/bookings/${id}/status`, admin.cookie, 'PUT', { status: 'in_progress' })).status, 200);
  await api(`/api/bookings/${b}/completion/request`, guruji.cookie, 'POST', {});
  const browserCode = (await api(`/api/bookings/${b}/completion`, customer.cookie)).body.otp;
  ui = await openBrowserTest();
  await cookie(customer.cookie);
  await ui.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await detail(b);
  await ui.wait(`!!document.querySelector('[aria-label="Completion code"]')`, 'customer code display');
  assert.ok(await ui.evaluate(`document.querySelector('[aria-label="Completion code"]').textContent.trim() === ${JSON.stringify(browserCode)}`));
  assert.ok(await ui.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Customer mobile layout fits');
  await detail(b);
  await ui.wait(`!!document.querySelector('[aria-label="Completion code"]')`, 'customer code survives reload');
  console.log('PASS: signed-in customer code display and reload on mobile');

  await cookie(guruji.cookie);
  await detail(b);
  await ui.wait(`!!document.querySelector('input[aria-label="Customer-shared six-digit completion code"]')`, 'Guruji OTP input');
  assert.equal(await ui.evaluate(`!!document.querySelector('[aria-label="Completion code"]')`), false);
  await fill('input[aria-label="Customer-shared six-digit completion code"]', ((Number(browserCode) + 1) % 1000000).toString().padStart(6, '0'));
  await activate('button', 'Verify & complete');
  await ui.wait(`document.body.innerText.includes('Incorrect completion code')`, 'wrong OTP error');
  assert.equal(await state(b), 'in_progress');
  await fill('input[aria-label="Customer-shared six-digit completion code"]', browserCode);
  await activate('button', 'Verify & complete');
  await ui.wait(`document.body.innerText.includes('Puja completion verified')`, 'completion confirmed in UI');
  assert.equal(await state(b), 'completed');
  console.log('PASS: Guruji cannot see code, wrong-code failure shown, correct customer code completes through real UI');

  await ui.command('Emulation.clearDeviceMetricsOverride');
  await cookie(admin.cookie);
  await detail(c);
  await activate('button', 'Request customer code');
  await ui.wait(`document.body.innerText.includes('Resend customer code')`, 'admin code request saved');
  const beforeResend = (await api(`/api/bookings/${c}/completion`, customer.cookie)).body.otp;
  await activate('button', 'Resend customer code');
  await ui.wait(`!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Resend customer code')?.disabled`, 'admin resend finished');
  assert.ok((await api(`/api/bookings/${c}/completion`, customer.cookie)).body.otp !== beforeResend);
  assert.equal(await ui.evaluate(`!!document.querySelector('[aria-label="Completion code"]')`), false);
  await activate('button', 'Manual completion');
  await ui.wait(`!!document.querySelector('#override-reason-${c}')`, 'manual override reason');
  assert.ok(await ui.evaluate(`Array.from(document.querySelectorAll('[role="dialog"] button')).find(b=>b.textContent.trim()==='Record override').disabled`));
  const reason = 'Customer confirmed the ceremony ended; recording the admin exception.';
  await fill(`#override-reason-${c}`, reason);
  await ui.evaluate(`(() => {
    window.completionOriginalFetch=window.fetch;
    window.fetch=(input,init)=>init?.method==='POST' && String(input).endsWith('/api/bookings/${c}/completion/override')
      ? Promise.resolve(new Response(JSON.stringify({message:'Simulated override failure'}),{status:500,headers:{'Content-Type':'application/json'}}))
      : window.completionOriginalFetch(input,init);
  })()`);
  await activate('[role="dialog"] button', 'Record override');
  await ui.wait(`document.body.innerText.includes('Simulated override failure')`, 'override failure reported');
  assert.equal(await state(c), 'in_progress');
  assert.equal(await ui.evaluate(`document.querySelector('#override-reason-${c}').value`), reason);
  await ui.evaluate('window.fetch=window.completionOriginalFetch');
  await activate('[role="dialog"] button', 'Record override');
  await ui.wait(`document.body.innerText.includes('Manual completion recorded')`, 'admin override persisted');
  await ui.wait(`!document.querySelector('[role="dialog"]')`, 'override closes only after success');
  await detail(c);
  await ui.wait(`document.body.innerText.includes('Admin override (not OTP verified)')`, 'explicit override audit');
  assert.equal(await state(c), 'completed');
  const override = (await api(`/api/bookings/${c}/completion`, admin.cookie)).body;
  assert.equal(override.completionMethod, 'admin_override');
  assert.equal(override.verifiedAt, null);
  assert.equal(override.history.find((e: any) => e.action === 'completion_admin_override').reason, reason);
  assert.equal((await api(`/api/bookings/${c}/completion`, customer.cookie)).body.otp, undefined);
  console.log('PASS: admin request/resend, required reason, failed override preserved, audited manual completion without fake OTP verification');
  await ui.command('Page.navigate', { url: `${base}/admin-dashboard` });
  await ui.wait(`!!document.querySelector('[role="tab"][id$="-trigger-bookings"]')`, 'admin booking tab');
  await activate('[role="tab"][id$="-trigger-bookings"]');
  await activate(`button[aria-label="Manage completion for booking #${c}"]`);
  await ui.wait(`document.querySelector('[role="dialog"]')?.innerText.includes(${JSON.stringify(reason)})`, 'completion audit in admin bookings');
  console.log('PASS: admin booking management exposes persisted completion tracking and audit record');
} finally {
  await ui?.close();
  await pool.query(`DELETE FROM booking_requests WHERE "bookingId"=ANY($1::int[])`, [bookings]);
  await pool.query('DELETE FROM bookings WHERE id=ANY($1::int[])', [bookings]);
  await pool.query(`DELETE FROM notifications WHERE "userId"=ANY($1::int[])`, [users]);
  await pool.query('DELETE FROM guruji_profiles WHERE id=ANY($1::int[])', [profiles]);
  if ((await pool.query(`SELECT to_regclass('public.session') AS name`)).rows[0].name) {
    await pool.query(`DELETE FROM session WHERE sess->>'userId'=ANY($1::text[])`, [users.map(String)]);
  }
  await pool.query('DELETE FROM users WHERE id=ANY($1::int[])', [users]);
  await pool.end();
  console.log('All temporary completion fixtures removed.');
}