import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { openBrowserTest } from './browserTest';
import { gurujiFirstName } from '../shared/gurujiDisplayName';

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (process.env.NODE_ENV === 'production' || !base.endsWith('.replit.dev')) throw new Error('Development verification only');
const tag = `ControlsQA-${randomBytes(5).toString('hex')}`, password = randomBytes(18).toString('hex');
const users: number[] = [], cookies: string[] = [];
let cityId: number | undefined, serviceId: number | undefined, pujaId: number | undefined;
let profileId: number | undefined, bookingId: number | undefined;
let browser: Awaited<ReturnType<typeof openBrowserTest>> | undefined;
async function api(path: string, cookie?: string, method = 'GET', body?: unknown) {
  const response = await fetch(base + path, { method, headers: {
    'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
async function account(role: 'admin' | 'customer' | 'guruji') {
  const user = await new DBStorage().createUser({
    firstName: role === 'guruji' ? 'Pandit ControlsGuruji Surname' : tag,
    lastName: role, role, email: `${tag}-${role}@example.invalid`,
    mobile: `9${randomInt(100000000, 999999999)}`, password,
  } as any);
  users.push(user.id);
  const result = await api(role === 'admin' ? '/api/admin/login' : '/api/auth/login', undefined, 'POST', { email: user.email, password });
  assert.equal(result.status, 200);
  const cookie = result.headers.get('set-cookie')!.split(';')[0]; cookies.push(cookie);
  return { id: user.id, cookie };
}
async function navigate(cookie: string, path: string, ready: string) {
  const [name, value] = cookie.split('=');
  await browser!.command('Network.setCookie', { name, value: decodeURIComponent(value), url: base });
  await browser!.command('Page.navigate', { url: base + path });
  await browser!.wait(ready, path);
}
async function input(selector: string, value: string) {
  await browser!.evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});
    el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
}
try {
  assert.equal(gurujiFirstName('Pandit Rahul Sharma'), 'Rahul');
  assert.equal(gurujiFirstName('Pt. Rahul'), 'Rahul');
  const admin = await account('admin'), customer = await account('customer'), guruji = await account('guruji');
  const createdCity = await api('/api/cities', admin.cookie, 'POST', { name: tag, state: 'Maharashtra' });
  assert.equal(createdCity.status, 201); cityId = createdCity.body.id;
  assert.equal((await api('/api/admin/cities')).status, 401);
  assert.equal((await api('/api/admin/cities', customer.cookie)).status, 403);
  await api(`/api/cities/${cityId}`, admin.cookie, 'PUT', { isActive: false });
  assert.ok(!(await api('/api/cities')).body.some((city: any) => city.id === cityId));
  assert.equal((await api('/api/admin/cities', admin.cookie)).body.find((city: any) => city.id === cityId).isActive, false);

  browser = await openBrowserTest();
  await browser.command('Network.enable');
  await browser.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await navigate(admin.cookie, '/admin-dashboard', `!!document.querySelector('[role="tab"][data-state="active"]')`);
  await browser.click('[role="tab"]', 'Cities');
  await browser.wait(`!!document.querySelector('button[aria-label="Activate ${tag}"]')`, 'inactive city admin control');
  await browser.click(`button[aria-label="Activate ${tag}"]`);
  await browser.wait(`!!document.querySelector('button[aria-label="Deactivate ${tag}"]')`, 'reactivated city');
  assert.ok((await api('/api/cities')).body.some((city: any) => city.id === cityId));
  console.log('PASS: city deactivate persists, public choices exclude it, and admin can reactivate through visible controls');

  await browser.click('[role="tab"]', 'Services');
  await browser.wait(`document.body.innerText.includes('Our Services')`, 'service management');
  await browser.click('button', 'Add service');
  await browser.wait(`!!document.querySelector('[role="dialog"] input[name="title"]')`, 'add service form');
  await input('input[name="title"]', tag);
  await input('input[name="slug"]', tag.toLowerCase());
  await input('textarea[name="description"]', 'Isolated service management verification.');
  await input('input[name="image"]', '/images/onlinepuja.png');
  await input('input[name="bookingHref"]', '/booking?type=puja');
  await browser.click('[role="dialog"] button', 'Add service');
  await browser.wait(`!document.querySelector('[role="dialog"]') && document.body.innerText.includes(${JSON.stringify(tag)})`, 'saved service');
  const service = (await api('/api/admin/services', admin.cookie)).body.find((item: any) => item.title === tag);
  assert.ok(service); serviceId = service.id;
  assert.equal((await api('/api/admin/services', customer.cookie, 'POST', service)).status, 403);
  assert.equal((await api('/api/admin/services', admin.cookie, 'POST', service)).status, 409);
  assert.equal((await api('/api/admin/services', admin.cookie, 'POST', { ...service, slug: `${service.slug}-bad`, image: 'javascript:alert(1)' })).status, 400);
  await browser.click(`button[aria-label="Edit ${tag}"]`);
  await browser.wait(`!!document.querySelector('input[name="title"]')`, 'edit service form');
  await input('input[name="title"]', `${tag} edited`);
  await browser.click('[role="dialog"] button', 'Save changes');
  await browser.wait(`!document.querySelector('[role="dialog"]') && document.body.innerText.includes(${JSON.stringify(`${tag} edited`)})`, 'updated service');
  const rowToggle = () => browser!.evaluate(`Array.from(document.querySelectorAll('tr')).find(el=>el.textContent.includes(${JSON.stringify(`${tag} edited`)})).querySelector('button').click()`);
  await rowToggle();
  await browser.wait(`Array.from(document.querySelectorAll('tr')).find(el=>el.textContent.includes(${JSON.stringify(`${tag} edited`)}))?.textContent.includes('Inactive')`, 'deactivated service');
  assert.equal((await api(`/api/services/${service.slug}`)).status, 404);
  assert.ok(!(await api('/api/services')).body.some((item: any) => item.id === serviceId));
  await rowToggle();
  await browser.wait(`Array.from(document.querySelectorAll('tr')).find(el=>el.textContent.includes(${JSON.stringify(`${tag} edited`)}))?.textContent.includes('Deactivate')`, 'reactivated service');
  await navigate(customer.cookie, `/services/${service.slug}`, `document.body.innerText.includes(${JSON.stringify(`${tag} edited`)})`);
  assert.ok(await browser.evaluate(`!!document.querySelector('a[href="/booking?type=puja"]')`));
  await navigate(admin.cookie, '/admin-dashboard', `!!document.querySelector('[role="tab"]')`);
  await browser.click('[role="tab"]', 'Services');
  await browser.wait(`!!document.querySelector('button[aria-label="Delete ${tag} edited"]')`, 'delete service control');
  const deletion = browser.click(`button[aria-label="Delete ${tag} edited"]`);
  await new Promise(resolve => setTimeout(resolve, 400));
  await browser.command('Page.handleJavaScriptDialog', { accept: true }); await deletion;
  await browser.wait(`!document.querySelector('button[aria-label="Delete ${tag} edited"]')`, 'deleted service');
  assert.equal((await api(`/api/services/${service.slug}`)).status, 404); serviceId = undefined;
  console.log('PASS: admin creates, edits, activates/deactivates and deletes services; public detail and booking link reflect persisted data');

  const puja = await api('/api/pujas', admin.cookie, 'POST', { name: tag, description: 'Isolated customer control fixture.', basePrice: 3000, price: 3000, type: 'offline', duration: 60, isActive: true });
  assert.equal(puja.status, 201); pujaId = puja.body.id;
  profileId = (await pool.query(`INSERT INTO guruji_profiles
    ("userId",city,specialities,experience,"pricePerHour",status,"isVerified","isAvailable","createdAt","updatedAt")
    VALUES ($1,$2,$3,5,1000,'approved',true,true,NOW(),NOW()) RETURNING id`, [guruji.id, tag, [String(pujaId)]])).rows[0].id;
  const when = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const request = { pujaId, type: 'offline', amount: 1, calendarDate: when, date: `${when}T12:00:00.000Z`, time: '11:00 AM', address: 'Fixture address', city: tag, withSamagri: false };
  for (const pincode of [undefined, '', '123', '000000', 'abcdef']) {
    assert.equal((await api('/api/bookings', customer.cookie, 'POST', { ...request, pincode })).status, 400);
  }
  assert.equal((await api('/api/bookings', customer.cookie, 'POST', { ...request, pincode: '411001' })).status, 409);
  await api(`/api/cities/${cityId}`, admin.cookie, 'PUT', { isActive: false });
  assert.match((await api('/api/bookings', customer.cookie, 'POST', { ...request, pincode: '411001' })).body.message, /city/i);
  await api(`/api/cities/${cityId}`, admin.cookie, 'PUT', { isActive: true });
  const completed = await new DBStorage().createBooking({ customerId: customer.id, gurujiId: profileId, pujaId,
    type: 'offline', amount: 3000, date: new Date(), time: '11:00 AM', city: tag, address: 'Fixture address', pincode: '411001', withSamagri: false } as any);
  bookingId = completed.id;
  await pool.query("UPDATE bookings SET status='completed' WHERE id=$1", [bookingId]);
  await new DBStorage().createReview({ customerId: customer.id, gurujiId: profileId, bookingId, rating: 5, review: 'Isolated test review.', fromRole: 'customer' } as any);
  assert.equal((await api(`/api/bookings/${bookingId}`, customer.cookie)).body.gurujiName, 'ControlsGuruji');

  await browser.command('Page.addScriptToEvaluateOnNewDocument', { source: `
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const path = typeof input === 'string' ? input : input.url;
      const json = value => new Response(JSON.stringify(value), {status:200,headers:{'Content-Type':'application/json'}});
      if (path === '/api/addresses/config') return json({enabled:true});
      if (path === '/api/addresses/search') return json({suggestions:JSON.parse(init.body).input.includes('unlisted') ? [] : [{placeId:'fixture-address',description:'QA building, fixture road, India'}]});
      if (path === '/api/addresses/details') return json({address:'QA building, fixture road, India',pincode:'411001'});
      return originalFetch(input,init);
    };` });
  await navigate(customer.cookie, '/services', `!!document.querySelector('h1')`);
  const path = `/booking?pujaId=${pujaId}`;
  const draft = { returnTo: path, activeStep: 1, bookingType: 'offline', consultationType: 'own_guruji', gurujiSelectionMode: 'specific',
    selectedPujaId: String(pujaId), selectedDate: when, selectedTime: '11:00 AM', selectedCity: tag.toLowerCase(), address: '', pincode: '', selectedGurujiId: '', withSamagri: false };
  await browser.evaluate(`sessionStorage.setItem('guruji-booking-registration-draft',${JSON.stringify(JSON.stringify(draft))})`);
  await navigate(customer.cookie, path, `!!document.querySelector('#with-samagri')`);
  assert.ok(await browser.evaluate(`document.querySelector('#with-samagri').disabled && document.querySelector('#without-samagri').disabled`));
  await browser.click('button', 'Continue');
  await browser.wait(`!!document.querySelector('#pincode') && !document.querySelector('#address').disabled`, 'address lookup');
  await input('#address', 'QA building');
  await browser.wait(`!!document.querySelector('#address-suggestions [role="option"]')`, 'Google address prediction UI (simulated provider response)');
  await browser.click('#address-suggestions [role="option"]');
  await browser.wait(`document.querySelector('#pincode')?.value==='411001' && document.querySelector('#address')?.readOnly`, 'resolved address and pincode');
  await input('#address-unit', 'Flat 7');
  assert.match(await browser.evaluate(`document.querySelector('#address').value`), /^Flat 7,/);
  await input('#pincode', '');
  await browser.click('button', 'Continue');
  await browser.wait(`document.body.innerText.includes('Valid pincode required')`, 'required pincode validation');
  assert.ok(await browser.evaluate(`!!document.querySelector('#pincode')`));
  await input('#pincode', '411001');
  await browser.click('button', 'Continue');
  await browser.wait(`Array.from(document.querySelectorAll('h3')).some(el=>el.textContent.trim()==='ControlsGuruji')`, 'first-name-only Guruji');
  assert.ok(await browser.evaluate(`Array.from(document.querySelectorAll('h3')).find(el=>el.textContent.trim()==='ControlsGuruji').parentElement.textContent.includes('5.0 (1 reviews)')`));
  assert.ok(await browser.evaluate(`!Array.from(document.querySelectorAll('h3')).some(el=>/Pandit|Surname/.test(el.textContent))`));
  await browser.click('button', 'Back');
  await browser.wait(`!!document.querySelector('#pincode')`, 'back to location');
  await browser.click('button', 'Change address');
  await input('#address', 'unlisted exact address');
  await browser.wait(`document.body.innerText.includes('No matching address found')`, 'unlisted address fallback');
  await browser.click('button', 'My exact address isn’t listed — enter manually');
  await input('#address', 'Manual fixture full address');
  assert.equal(await browser.evaluate(`document.querySelector('#address').value`), 'Manual fixture full address');
  await browser.command('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  assert.ok(await browser.evaluate(`document.documentElement.scrollWidth <= 402`));
  console.log('PASS: customer samagri is locked, required pincode blocks navigation/API, genuine review rating and first name display, address selection/autofill/manual fallback and phone layout');
  console.log('NOTE: Google browser responses simulated for UI verification; live Google searches still need the configured API key.');
} finally {
  if (browser) await browser.close();
  if (bookingId) {
    await pool.query('DELETE FROM reviews WHERE "bookingId"=$1', [bookingId]);
    await pool.query('DELETE FROM bookings WHERE id=$1', [bookingId]);
  }
  if (profileId) await pool.query('DELETE FROM guruji_profiles WHERE id=$1', [profileId]);
  if (pujaId) await pool.query('DELETE FROM pujas WHERE id=$1', [pujaId]);
  if (cityId) await pool.query('DELETE FROM cities WHERE id=$1', [cityId]);
  if (serviceId) await pool.query('DELETE FROM our_services WHERE id=$1', [serviceId]);
  if (cookies.length) await pool.query(`DELETE FROM user_sessions WHERE sess->>'userId'=ANY($1::text[])`, [users.map(String)]);
  if (users.length) await pool.query('DELETE FROM users WHERE id=ANY($1::int[])', [users]);
  await pool.end();
  console.log('Isolated customer-control verification fixtures removed.');
}
