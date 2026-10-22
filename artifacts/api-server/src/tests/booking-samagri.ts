import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { DBStorage } from '../dbStorage';
import { pool } from '../db';
import { ObjectStorageService } from '../lib/objectStorage';
import { browserClient } from './browser-client';

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (!base.endsWith('.replit.dev')) throw new Error('Development fixtures only');
const store = new DBStorage();
const tag = `verify-samagri-${randomBytes(5).toString('hex')}`;
const password = randomBytes(18).toString('hex');
const users: number[] = [];
const bookings: number[] = [];
let pujaId: number | undefined;
let imageId: string | undefined;
let browser: Awaited<ReturnType<typeof browserClient>> | undefined;
async function api(path: string, cookie = '', method = 'GET', data?: unknown, extra: Record<string,string> = {}) {
  const response = await fetch(base + path, {
    method, headers: { ...(cookie ? { cookie } : {}), ...(data ? { 'content-type': 'application/json' } : {}), ...extra },
    body: data ? JSON.stringify(data) : undefined,
  });
  return { status: response.status, data: await response.json().catch(() => null),
    cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '' };
}
async function account(role: 'admin' | 'customer') {
  const user = await store.createUser({ firstName: tag, lastName: 'Verification',
    email: `${tag}-${role}-${users.length}@example.invalid`, mobile: `9${randomInt(100000000,999999999)}`,
    password, role, age: 30, gender: 'other' } as any);
  users.push(user.id);
  const login = await api(role === 'admin' ? '/api/admin/login' : '/api/auth/login', '', 'POST', { email: user.email, password });
  assert.equal(login.status, 200);
  assert.ok(login.cookie);
  return { ...user, cookie: login.cookie };
}
try {
  const admin = await account('admin'), customer = await account('customer'), outsider = await account('customer');
  assert.equal((await api('/api/pujas')).status, 200, 'Public booking catalogue remains public');
  assert.equal((await api('/api/samagri/uploads', customer.cookie, 'POST', {})).status, 403);
  assert.equal((await api('/api/samagri/uploads', admin.cookie, 'POST', {
    name: 'bad.svg', size: 100, contentType: 'image/svg+xml',
  })).status, 400);
  const upload = await api('/api/samagri/uploads', admin.cookie, 'POST', {
    name: 'samagri.png', size: 68, contentType: 'image/png',
  });
  assert.equal(upload.status, 200, 'Real persistent storage upload URL');
  imageId = upload.data.imageUrl.split('/').pop();
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=', 'base64');
  assert.ok((await fetch(upload.data.uploadURL, { method: 'PUT', body: bytes, headers: { 'Content-Type': 'image/png' } })).ok);
  const complete = await api('/api/samagri/uploads/complete', admin.cookie, 'POST', { imageUrl: upload.data.imageUrl });
  assert.equal(complete.status, 200, 'Photo upload validated and persisted');
  assert.equal((await fetch(base + upload.data.imageUrl, { headers: { cookie: customer.cookie } })).status, 200);
  assert.equal((await fetch(base + upload.data.imageUrl)).status, 401);

  const items = [
    { name: 'Rice verification', quantity: 500, unit: 'g', price: 0, optional: false, imageUrl: upload.data.imageUrl },
    { name: 'Flowers verification', quantity: 1, unit: 'basket', price: 0, optional: true },
  ];
  const created = await api('/api/pujas', admin.cookie, 'POST', {
    name: tag, description: 'Isolated samagri verification fixture', basePrice: 100,
    type: 'online', duration: 60, isActive: false, samagri: items,
  });
  assert.equal(created.status, 201);
  pujaId = created.data.id;
  assert.deepEqual(created.data.samagri, items);
  const saved = (await api(`/api/pujas/${pujaId}`, admin.cookie)).data;
  assert.deepEqual(saved.samagri, items, 'Admin items, categories, quantity and image survive reload');
  const booking = await store.createBooking({ customerId: customer.id, pujaId, type: 'online', amount: 100,
    date: new Date(Date.now()+72*3600000), time: '10:00 AM', status: 'pending', duration: 60 } as any);
  bookings.push(booking.id);
  const path = `/api/bookings/${booking.id}/samagri`;
  assert.equal((await api(path)).status, 401);
  assert.equal((await api(path, outsider.cookie)).status, 404);
  const list = await api(path, customer.cookie);
  assert.equal(list.status, 200);
  assert.deepEqual(list.data.items, items);
  assert.equal(list.data.whatsappStatus, 'not_connected');
  assert.ok(list.data.history.some((event: any) => event.channel === 'in_app' && event.status === 'available'));
  assert.equal((await pool.query(`SELECT count(*)::int AS count FROM notifications
    WHERE "userId"=$1 AND title='Your puja samagri list is ready'`, [customer.id])).rows[0].count, 1);
  const revised = [...items, { name: 'Coconut verification', quantity: 2, unit: 'pieces', optional: false, price: 0 }];
  assert.equal((await api(`/api/pujas/${pujaId}`, admin.cookie, 'PUT', { samagri: revised })).status, 200);
  assert.deepEqual((await api(path, customer.cookie)).data.items, items, 'Existing bookings retain their saved list');
  assert.equal((await api(`/api/admin/bookings/${booking.id}/samagri/resend`, customer.cookie, 'POST', {})).status, 403);
  assert.equal((await api(`/api/admin/bookings/${booking.id}/samagri/resend`, admin.cookie, 'POST', {}, { 'sec-fetch-site': 'cross-site' })).status, 403);
  const resend = await api(`/api/admin/bookings/${booking.id}/samagri/resend`, admin.cookie, 'POST', {});
  assert.equal(resend.status, 200);
  assert.deepEqual(resend.data.items, revised);
  assert.ok(resend.data.history.some((event: any) => event.channel === 'in_app' && event.status === 'resent'));
  assert.equal((await api(`/api/admin/bookings/${booking.id}/samagri/resend`, admin.cookie, 'POST', {})).status, 429);
  assert.deepEqual((await api(path, customer.cookie)).data.items, revised);
  const invalid = await api(`/api/pujas/${pujaId}`, admin.cookie, 'PUT', { samagri: [{ ...items[0], name: '' }] });
  assert.equal(invalid.status, 400);

  browser = await browserClient();
  const separator = customer.cookie.indexOf('=');
  await browser.command('Network.enable');
  await browser.command('Network.setCookie', { name: customer.cookie.slice(0,separator),
    value: customer.cookie.slice(separator+1), url: base, secure: true, httpOnly: true });
  await browser.command('Page.navigate', { url: `${base}/booking/${booking.id}` });
  await browser.wait(`document.body?.innerText?.includes('Coconut verification')`, 'customer booking samagri checklist');
  assert.equal(await browser.evaluate(`document.body.innerText.includes('Mandatory items') && document.body.innerText.includes('Optional items')`), true);
  await browser.wait(`document.querySelector('[aria-label="Booking samagri"] img')?.naturalWidth > 0`, 'samagri photo');
  await browser.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await browser.evaluate(`document.querySelector('[aria-label="Booking samagri"]').scrollWidth <= document.querySelector('[aria-label="Booking samagri"]').clientWidth`), true);
  console.log('PASS: real photo upload, admin persistence, automatic list/notification, booking snapshots, ownership, resend audit/rate limit, and customer desktop/mobile checklist.');
} finally {
  if (browser) await browser.close();
  if (bookings.length) await pool.query('DELETE FROM bookings WHERE id=ANY($1)', [bookings]);
  if (pujaId) await pool.query('DELETE FROM pujas WHERE id=$1', [pujaId]);
  if (imageId) {
    const image = (await pool.query('SELECT object_path FROM samagri_images WHERE id=$1', [imageId])).rows[0];
    if (image) {
      try { await (await new ObjectStorageService().getObjectEntityFile(image.object_path)).delete(); } catch {}
      await pool.query('DELETE FROM samagri_images WHERE id=$1', [imageId]);
    }
  }
  if (users.length) {
    await pool.query('DELETE FROM notifications WHERE "userId"=ANY($1)', [users]);
    await pool.query(`DELETE FROM user_sessions WHERE (sess->>'userId')::text=ANY($1::text[])`, [users.map(String)]);
    await pool.query('DELETE FROM users WHERE id=ANY($1)', [users]);
  }
  await pool.end();
}
