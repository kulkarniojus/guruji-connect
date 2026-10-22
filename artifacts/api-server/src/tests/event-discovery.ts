import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { DBStorage } from '../dbStorage';
import { pool } from '../db';
import { browserClient } from './browser-client';

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (!base.endsWith('.replit.dev')) throw new Error('Run discovery fixtures only on development preview');
const tag = `verify-event-discovery-${randomBytes(5).toString('hex')}`;
const password = randomBytes(18).toString('hex');
const store = new DBStorage();
const userIds: number[] = [];
let eventId: number | undefined;
let browser: Awaited<ReturnType<typeof browserClient>> | undefined;
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

async function api(path: string, cookie = '', method = 'GET', body?: unknown) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    data: await response.json().catch(() => null) as any,
    cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '',
  };
}

async function account(role: 'admin' | 'customer') {
  const user = await store.createUser({
    firstName: 'Verification', lastName: 'Parent',
    email: `${tag}-${role}@example.invalid`, mobile: `9${randomInt(100000000, 999999999)}`,
    password, role, age: 30, gender: 'other',
  } as any);
  userIds.push(user.id);
  const login = await api(role === 'admin' ? '/api/admin/login' : '/api/auth/login', '', 'POST', {
    email: user.email, password,
  });
  assert.equal(login.status, 200);
  assert.ok(login.cookie);
  return { ...user, cookie: login.cookie };
}

try {
  const admin = await account('admin');
  const parent = await account('customer');
  const event = await api('/api/admin/events', admin.cookie, 'POST', {
    name: `${tag} Ramraksha class`,
    description: 'A temporary devotional learning class used to verify public event discovery and registration.',
    classType: 'Ramraksha class', ageMin: 5, ageMax: 15,
    instructorName: 'Verification instructor', instructorDetails: 'Religious education instructor',
    mode: 'offline', location: 'Verification classroom', meetingUrl: '',
    startDate: day(5), endDate: day(5), startTime: '10:00', durationMinutes: 60,
    frequency: 'once', weekdays: [],
    basePrice: 0, discountedPrice: null, registrationDeadline: `${day(4)}T18:00:00+05:30`,
    capacity: 1, paymentMode: 'manual', media: [],
  });
  assert.equal(event.status, 201, JSON.stringify(event.data));
  eventId = event.data.id;
  assert.equal((await api('/api/events')).data.some((row: any) => row.id === eventId), false, 'Draft stays private');
  assert.equal((await api(`/api/admin/events/${eventId}/action`, admin.cookie, 'POST', {
    action: 'publish', reason: '',
  })).status, 200);

  browser = await browserClient();
  await browser.command('Network.enable');
  await browser.command('Page.navigate', { url: `${base}/services` });
  await browser.wait(`!!document.querySelector('[data-testid="card-event-${eventId}"]')`, 'anonymous event card under Our Services');
  assert.equal(await browser.evaluate(`document.querySelector('[data-testid="card-event-${eventId}"]')?.textContent.includes('View details & register')`), true);
  assert.equal(await browser.evaluate(`document.body.innerText.includes('Our Services') && document.body.innerText.includes('Events')`), true);
  await browser.click(`[data-testid="card-event-${eventId}"]`);
  await browser.wait(`!!document.querySelector('[data-testid="button-login-to-register"]')`, 'anonymous event details with sign-in prompt');
  assert.equal((await api(`/api/events/${eventId}`)).data.registrationOpen, true);
  assert.equal((await api('/api/events')).data.some((row: any) => row.id === eventId), true, 'All published events available publicly');

  const equals = parent.cookie.indexOf('=');
  await browser.command('Network.setCookie', {
    name: parent.cookie.slice(0, equals),
    value: parent.cookie.slice(equals + 1),
    url: base, secure: true, httpOnly: true,
  });
  await browser.command('Page.navigate', { url: `${base}/services/events` });
  await browser.wait(`!!document.querySelector('[data-testid="card-event-${eventId}"]')`, 'same event on dedicated public Events page');
  await browser.click(`[data-testid="card-event-${eventId}"]`);
  await browser.wait(`!!document.querySelector('[data-testid="input-child-name"]')`, 'authenticated registration form');
  await browser.fill('[data-testid="input-child-name"]', 'Verification child');
  await browser.fill('[data-testid="input-child-age"]', '8');
  await browser.click('[data-testid="checkbox-consent"]');
  await browser.click('[data-testid="button-register"]');
  await browser.wait(`!!document.querySelector('[data-testid="text-registered"]')`, 'registration confirmation');
  const mine = await api('/api/event-registrations', parent.cookie);
  assert.equal(mine.data.filter((row: any) => row.eventId === eventId).length, 1);
  assert.equal(mine.data.find((row: any) => row.eventId === eventId).childName, 'Verification child');

  await browser.command('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
  });
  await browser.command('Page.navigate', { url: `${base}/services` });
  await browser.wait(`!!document.querySelector('[data-testid="card-event-${eventId}"]')`, 'phone-sized Services listing');
  assert.equal(await browser.evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
  assert.equal((await api('/api/events')).data.find((row: any) => row.id === eventId).registrationOpen, false, 'Full event remains visible');
  assert.equal((await api(`/api/events/${eventId}`)).status, 200, 'Closed published event still has public details');
  console.log('PASS: published event appears under Our Services and on Events page for anonymous visitors, links to book, requires genuine guardian login, registers a child, and remains visible when full on a phone.');
} finally {
  if (browser) await browser.close();
  if (eventId) await pool.query('DELETE FROM religious_events WHERE id=$1', [eventId]);
  await pool.query('DELETE FROM notifications WHERE "userId"=ANY($1) OR message LIKE $2', [userIds, `%${tag}%`]);
  if (userIds.length) {
    await pool.query(`DELETE FROM user_sessions WHERE (sess->>'userId')::text=ANY($1::text[])`, [userIds.map(String)]);
    await pool.query('DELETE FROM users WHERE id=ANY($1)', [userIds]);
  }
  await pool.end();
}
