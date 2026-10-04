import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { openBrowserTest } from './browserTest';

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (process.env.NODE_ENV === 'production' || !base.endsWith('.replit.dev')) throw new Error('Development verification only');
const tag = randomBytes(6).toString('hex');
const password = randomBytes(18).toString('hex');
const name = `CatalogueQA-${tag}`;
const userIds: number[] = [];
let ui: Awaited<ReturnType<typeof openBrowserTest>> | undefined;

async function api(path: string, method = 'GET', body?: unknown, cookie?: string) {
  return fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function login(role: 'admin' | 'customer') {
  const user = await new DBStorage().createUser({
    firstName: 'CatalogueQA', lastName: role, email: `${name}-${role}@example.invalid`,
    mobile: `9${randomInt(100000000, 999999999)}`, password, role,
  } as any);
  userIds.push(user.id);
  const response = await api(role === 'admin' ? '/api/admin/login' : '/api/auth/login', 'POST', { email: user.email, password });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie')!.split(';')[0];
}
async function adminPage() {
  await ui!.command('Page.navigate', { url: base + '/admin-dashboard' });
  await ui!.wait(`!!document.querySelector('[role="tab"][id$="-trigger-pujas"]')`, 'admin dashboard');
  // Activate the real tab by keyboard, avoiding chart-load layout shifts.
  await ui!.evaluate(`document.querySelector('[role="tab"][id$="-trigger-pujas"]').focus()`);
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await ui!.wait(`document.body.innerText.includes('Puja Management')`, 'puja configuration');
  await ui!.wait(`!!document.querySelector('button[aria-label^="Edit "]')`, 'loaded admin catalogue');
}
async function publicPage(path: string) {
  await ui!.command('Page.navigate', { url: base + path });
  await ui!.wait(`!!document.querySelector('header')`, path);
}
async function fill(selector: string, value: string) {
  await ui!.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  if (value) await ui!.command('Input.insertText', { text: value });
  const field = await ui!.evaluate(`(() => { const input=document.querySelector(${JSON.stringify(selector)}); return {value:input.value,type:input.type}; })()`);
  if (field.type === 'number' && value) assert.equal(Number(field.value), Number(value));
  else assert.equal(field.value, value);
}
async function activate(selector: string, text?: string) {
  const target = `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(el => ${text === undefined ? 'true' : `el.textContent.trim() === ${JSON.stringify(text)}`})`;
  await ui!.wait(`!!(${target})`, `control ${text || selector}`);
  await ui!.evaluate(`(${target}).focus()`);
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
}
const popular = `Array.from(document.querySelectorAll('section')).find(s=>s.querySelector('h2')?.innerText === 'Popular Pujas')`;

try {
  const all = await (await api('/api/pujas')).json();
  const active = all.filter((puja: any) => puja.isActive);
  assert.ok(active.length >= 25);
  for (const puja of active) {
    assert.ok(puja.imageUrl);
    const image = await api(puja.imageUrl);
    assert.equal(image.status, 200, `Image exists for ${puja.name}`);
    assert.match(image.headers.get('content-type') || '', /image/);
  }
  assert.equal((await api('/api/pujas', 'POST', {})).status, 401);
  assert.equal((await api('/api/admin/pujas', 'POST', {})).status, 401);
  const customerCookie = await login('customer');
  assert.equal((await api('/api/pujas/1', 'PUT', { isPopular: false }, customerCookie)).status, 403);
  const adminCookie = await login('admin');
  assert.equal((await api('/api/pujas/1', 'PUT', { imageUrl: 'javascript:alert(1)' }, adminCookie)).status, 400);
  assert.equal((await api('/api/pujas/1', 'PUT', { isPopular: 'false' }, adminCookie)).status, 400);
  console.log('PASS: 25+ active catalogue entries, every photo served, admin-only writes, URL and boolean validation');

  ui = await openBrowserTest();
  const separator = adminCookie.indexOf('=');
  await ui.command('Network.setCookie', { name: adminCookie.slice(0, separator), value: adminCookie.slice(separator + 1), url: base });
  await adminPage();
  await activate('button', 'Add New Puja');
  await ui.wait(`!!document.querySelector('#name')`, 'new puja dialog');
  await fill('#name', name);
  await fill('#description', 'Temporary verification of catalogue photo and popular settings.');
  await fill('#basePrice', '500');
  await fill('#price', '0');
  await fill('#duration', '0.5');
  await fill('#imageUrl', '/images/pujas/ganesh.jpg');
  await activate('#isPopular');
  await activate('#isActive');
  await ui.wait(`Array.from(document.querySelectorAll('[role="dialog"] img')).some(i=>i.complete && i.naturalWidth>0)`, 'photo preview');
  await activate('button[type="submit"]', 'Create Puja');
  await ui.wait(`!document.querySelector('#name')`, 'saved creation closes dialog');
  const saved = (await pool.query(`SELECT * FROM pujas WHERE name=$1`, [name])).rows[0];
  assert.ok(saved);
  assert.equal(saved.price, 0);
  assert.equal(saved.isPopular, true);
  assert.equal(saved.isActive, false);
  assert.equal(saved.duration, 30);
  assert.equal(saved.imageUrl, '/images/pujas/ganesh.jpg');
  console.log('PASS: admin creates and saves photo URL, popular flag, inactive visibility, zero price and duration');

  await publicPage('/');
  await ui.wait(`${popular}?.querySelectorAll('h3').length > 0`, 'popular catalogue');
  assert.equal(await ui.evaluate(`${popular}.innerText.includes(${JSON.stringify(name)})`), false);
  await adminPage();
  await activate(`button[aria-label="Edit ${name}"]`);
  await ui.wait(`!!document.querySelector('#edit-imageUrl')`, 'edit dialog');
  await fill('#edit-imageUrl', '/images/pujas/shiva.jpg');
  await activate('#edit-isActive');
  await activate('button[type="submit"]', 'Update Puja');
  await ui.wait(`!document.querySelector('#edit-imageUrl')`, 'saved edit');
  await publicPage('/');
  await ui.wait(`${popular}?.innerText.includes(${JSON.stringify(name)})`, 'new active popular puja on homepage');
  assert.equal(await ui.evaluate(`${popular}.querySelector('img[alt^="${name}"]').getAttribute('src')`), '/images/pujas/shiva.jpg');
  assert.equal(await ui.evaluate(`${popular}.querySelectorAll('h3').length`), active.filter((puja: any) => puja.isPopular).length + 1);
  console.log('PASS: saved popular/photo edits appear after reload, all featured pujas displayed without a three-card cap');

  await adminPage();
  await activate(`button[aria-label="Edit ${name}"]`);
  await ui.wait(`!!document.querySelector('#edit-imageUrl')`, 'edit existing settings');
  assert.equal(await ui.evaluate(`document.querySelector('#edit-isPopular').getAttribute('aria-checked')`), 'true');
  await fill('#edit-imageUrl', '/images/pujas/lakshmi.jpg');
  await ui.evaluate(`(() => {
    window.catalogueOriginalFetch = window.fetch;
    window.fetch = (input, init) => init?.method === 'PUT' && String(input).endsWith('/api/pujas/${saved.id}')
      ? Promise.resolve(new Response(JSON.stringify({message:'Simulated save failure'}), {status:500,headers:{'Content-Type':'application/json'}}))
      : window.catalogueOriginalFetch(input, init);
  })()`);
  await activate('button[type="submit"]', 'Update Puja');
  await ui.wait(`document.body.innerText.includes('Simulated save failure')`, 'server save failure shown');
  assert.ok(await ui.evaluate(`!!document.querySelector('#edit-imageUrl')`), 'Failure must keep the editor open');
  assert.equal(await ui.evaluate(`document.querySelector('#edit-imageUrl').value`), '/images/pujas/lakshmi.jpg');
  assert.equal((await pool.query(`SELECT "imageUrl" FROM pujas WHERE id=$1`, [saved.id])).rows[0].imageUrl, '/images/pujas/shiva.jpg');
  await ui.evaluate(`window.fetch = window.catalogueOriginalFetch`);
  console.log('PASS: failed saves retain entered settings, show an error, and never fake success');
  await fill('#edit-imageUrl', 'javascript:alert(1)');
  await activate('button[type="submit"]', 'Update Puja');
  await ui.wait(`document.body.innerText.includes('Invalid photo URL')`, 'invalid URL rejection');
  assert.ok(await ui.evaluate(`!!document.querySelector('#edit-imageUrl')`));
  assert.equal((await pool.query(`SELECT "imageUrl" FROM pujas WHERE id=$1`, [saved.id])).rows[0].imageUrl, '/images/pujas/shiva.jpg');
  await fill('#edit-imageUrl', '');
  await activate('#edit-isPopular');
  await activate('button[type="submit"]', 'Update Puja');
  await ui.wait(`!document.querySelector('#edit-imageUrl')`, 'cleared photo and popularity saved');
  await publicPage('/');
  await ui.wait(`${popular}?.querySelectorAll('h3').length > 0`, 'featured data');
  assert.equal(await ui.evaluate(`${popular}.innerText.includes(${JSON.stringify(name)})`), false);
  await activate('section a[href="/pujas"]', 'View all pujas');
  await ui.wait(`!!document.querySelector('input[aria-label="Search pujas"]')`, 'all pujas');
  await fill('input[aria-label="Search pujas"]', name);
  await ui.wait(`document.querySelector('main').innerText.includes(${JSON.stringify(name)})`, 'catalogue search');
  assert.equal(await ui.evaluate(`document.querySelector('main').querySelectorAll('a[href^="/puja/"]').length`), 1);
  assert.ok(await ui.evaluate(`!!document.querySelector('main [role="img"][aria-label$="image unavailable"]')`));
  await fill('input[aria-label="Search pujas"]', 'no-such-puja-zzzz');
  await ui.wait(`document.querySelector('main').innerText.includes('No pujas')`, 'empty search state');
  await activate('button[aria-label="Clear search"]');
  await ui.wait(`document.querySelector('main').querySelectorAll('a[href^="/puja/"]').length === ${active.length + 1}`, 'full active catalogue');
  console.log('PASS: unmark popular persists, photo removal works, View All includes nonpopular records, search and clear');

  await ui.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await ui.evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'No mobile horizontal overflow');
  await fill('input[aria-label="Search pujas"]', name);
  await activate(`main a[href="/puja/${saved.id}"]`);
  await ui.wait(`location.pathname === '/puja/${saved.id}'`, 'real detail page');
  await ui.wait(`document.body.innerText.includes(${JSON.stringify(name)})`, 'detail content');
  // Booking intentionally redirects admins to their dashboard. Test as a customer.
  const customerSeparator = customerCookie.indexOf('=');
  await ui.command('Network.setCookie', { name: customerCookie.slice(0, customerSeparator), value: customerCookie.slice(customerSeparator + 1), url: base });
  await ui.command('Page.navigate', { url: base + `/puja/${saved.id}` });
  await ui.wait(`document.body.innerText.includes(${JSON.stringify(name)})`, 'customer detail page');
  await activate('button', 'Book Now');
  await ui.wait(`location.pathname === '/booking' && new URLSearchParams(location.search).get('pujaId') === '${saved.id}'`, 'selected puja passed to booking');
  console.log('PASS: mobile catalogue and real detail links');
  await ui.command('Emulation.clearDeviceMetricsOverride');
  await ui.command('Network.setCookie', { name: adminCookie.slice(0, separator), value: adminCookie.slice(separator + 1), url: base });
  await adminPage();
  await activate(`button[aria-label="Deactivate ${name}"]`);
  await ui.wait(`!!document.querySelector('[role="dialog"]')`, 'deactivation confirmation');
  await activate('[role="dialog"] button', 'Deactivate');
  await ui.wait(`!document.querySelector('[role="dialog"]')`, 'deactivation saved');
  assert.equal((await pool.query(`SELECT "isActive" FROM pujas WHERE id=$1`, [saved.id])).rows[0].isActive, false);
  console.log('PASS: administrator can deactivate a puja');
} finally {
  await ui?.close();
  await pool.query(`DELETE FROM pujas WHERE name=$1`, [name]);
  await pool.query(`DELETE FROM notifications WHERE "userId"=ANY($1::int[])`, [userIds]);
  await pool.query(`DELETE FROM users WHERE id=ANY($1::int[])`, [userIds]);
  await pool.end();
  console.log('Temporary catalogue test records removed.');
}