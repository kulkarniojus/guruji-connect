import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
import { pool } from '../server/db';
import { openBrowserTest } from './browserTest';
import { GURUJI_LANGUAGES } from '../client/src/components/GurujiSelectionFields';

const fixturePath = '/tmp/guruji-selection-fixture.json';
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
if (process.env.NODE_ENV === 'production' || !fixture.base.endsWith('.replit.dev')) throw new Error('Development only');
let ui: Awaited<ReturnType<typeof openBrowserTest>> | undefined;
const areas = '[data-testid="guruji-service-areas"]';
const languages = '[data-testid="guruji-languages"]';
const specializations = '[data-testid="guruji-puja-specializations"]';

async function chooseCity(selector: string, name: string) {
  await ui!.click(selector);
  await ui!.wait(`!!document.querySelector('[role="option"]')`, 'city choices');
  await ui!.click('[role="option"]', name);
}
async function puja(p: any) {
  await ui!.type(`${specializations} input`, p.name);
  await ui!.wait(`!!document.querySelector('button[role="option"][id$="-option-${p.id}"]')`, 'matching puja choice');
  await ui!.click(`button[role="option"][id$="-option-${p.id}"]`);
}

try {
  const response = await fetch(fixture.base + '/api/sales-rep/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: fixture.salesEmail, password: fixture.password }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie')!.split(';')[0];
  const separator = cookie.indexOf('=');
  ui = await openBrowserTest();
  await ui.command('Network.setCookie', { name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: fixture.base });
  await ui.command('Page.navigate', { url: fixture.base + '/sales-rep/dashboard?tab=register-guruji' });
  await ui.wait(`!!document.querySelector(${JSON.stringify(areas + ' [role="checkbox"]')})`, 'sales selection groups');
  assert.equal(await ui.evaluate(`document.querySelector(${JSON.stringify(areas)}).querySelectorAll('[role="checkbox"]').length`),
    (await (await fetch(fixture.base + '/api/cities')).json() as any[]).length);
  assert.equal(await ui.evaluate(`document.querySelector(${JSON.stringify(languages)}).querySelectorAll('[role="checkbox"]').length`), GURUJI_LANGUAGES.length);
  assert.equal(await ui.evaluate(`document.body.innerText.includes('comma separated')`), false);
  await ui.click('form button[type="submit"]');
  await ui.wait(`document.body.innerText.includes('Select at least one puja specialization') && document.body.innerText.includes('Select at least one service city') && document.body.innerText.includes('Select at least one language')`, 'required selection errors');
  console.log('PASS: live city catalog, complete shared language choices, no comma-separated fields, required validation');

  for (const [name, value] of Object.entries({
    firstName: 'SelectionsQA', lastName: 'Guruji', email: fixture.gurujiEmail,
    mobile: fixture.gurujiMobile, password: fixture.password,
    dob: '01/01/1980', aadhar: '123456789012', religion: 'Hindu', pincode: '400001',
  })) await ui.type(`input[name="${name}"]`, value as string);
  await ui.type('textarea[name="address"]', 'Temporary selection test street');
  await ui.type('textarea[name="bio"]', 'Experienced Vedic practitioner for temporary selection testing and ritual services.');
  await chooseCity('button[aria-label="Residential city"]', fixture.cities[0].name);
  assert.equal(await ui.evaluate(`document.querySelector('input[name="state"]').value`), fixture.cities[0].state);
  await chooseCity('button[aria-label="Primary service location"]', fixture.cities[0].name);
  assert.equal(await ui.evaluate(`document.querySelector(${JSON.stringify(areas)}).querySelectorAll('[aria-checked="true"]').length`), 1);
  await ui.click(`${areas} label`, fixture.cities[1].name);
  await ui.click(`${areas} button[aria-label="Remove ${fixture.cities[1].name}"]`);
  assert.equal(await ui.evaluate(`document.querySelector(${JSON.stringify(areas)}).querySelectorAll('[aria-checked="true"]').length`), 1);
  await ui.click(`${areas} label`, fixture.cities[1].name);
  for (const language of ['Hindi', 'Sanskrit', 'Odia']) await ui.click(`${languages} label`, language);
  await ui.click(`${languages} button[aria-label="Remove Odia"]`);
  await ui.click(`${languages} label`, 'Odia');
  await puja(fixture.pujas[0]);
  await puja(fixture.pujas[1]);
  await ui.click(`${specializations} button[aria-label="Remove ${fixture.pujas[1].name}"]`);
  await puja(fixture.pujas[1]);
  assert.equal(await ui.evaluate(`document.querySelector(${JSON.stringify(specializations)}).querySelectorAll('button[aria-label^="Remove"]').length`), 2);
  assert.equal(await ui.evaluate(`!!document.querySelector('button button')`), false);
  console.log('PASS: residential and service-city dropdowns, automatic primary-city inclusion, multi-selection, search and removal');
  await ui.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const selector of [areas, languages, specializations]) {
    assert.ok(await ui.evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })()`));
  }
  await ui.click('form button[type="submit"]');
  await ui.wait(`document.querySelector('input[name="email"]').value === ''`, 'Guruji registration success and reset');
  const registered = await pool.query(
    `SELECT u.id,u.city AS residential_city,gp.id AS profile_id,gp.city AS service_city,gp.cities,gp.languages,gp.specialities,gp.status,gp.address
     FROM users u JOIN guruji_profiles gp ON gp."userId"=u.id WHERE u.email=$1`,
    [fixture.gurujiEmail],
  );
  assert.equal(registered.rowCount, 1);
  const row = registered.rows[0];
  assert.equal(row.residential_city, fixture.cities[0].name);
  assert.equal(row.service_city, fixture.cities[0].name);
  assert.deepEqual(row.cities.sort(), fixture.cities.map((city: any) => String(city.id)).sort());
  assert.deepEqual(row.languages.sort(), ['Hindi', 'Odia', 'Sanskrit'].sort());
  assert.deepEqual(row.specialities.sort(), fixture.pujas.map((puja: any) => puja.name).sort());
  assert.equal(row.status, 'pending');
  assert.equal(row.address, 'Temporary selection test street');
  for (const selector of [areas, languages]) assert.equal(await ui.evaluate(`document.querySelector(${JSON.stringify(selector)}).querySelectorAll('[aria-checked="true"]').length`), 0);
  assert.equal(await ui.evaluate(`document.querySelector(${JSON.stringify(specializations)}).querySelectorAll('button[aria-label^="Remove"]').length`), 0);
  console.log('PASS: mobile registration saves exact city IDs, puja names and language arrays, retains address, remains pending, resets selections');

  await ui.command('Page.navigate', { url: fixture.base + '/become-guruji' });
  await ui.wait(`!!document.querySelector(${JSON.stringify(areas + ' [role="checkbox"]')})`, 'regular Guruji selection groups');
  assert.equal(await ui.evaluate(`document.querySelector(${JSON.stringify(languages)}).querySelectorAll('[role="checkbox"]').length`), GURUJI_LANGUAGES.length);
  await ui.click(`${areas} label`, fixture.cities[0].name);
  await ui.click(`${languages} label`, 'Odia');
  await puja(fixture.pujas[0]);
  assert.equal(await ui.evaluate(`!!document.querySelector(${JSON.stringify(specializations + ` button[aria-label="Remove ${fixture.pujas[0].name}"]`)})`), true);
  console.log('PASS: regular Guruji form reuses the same working selections without regression');
} finally {
  await ui?.close();
  const ids = await pool.query(`SELECT id FROM users WHERE id=$1 OR email=$2`, [fixture.salesId, fixture.gurujiEmail]);
  const users = ids.rows.map(user => user.id);
  const profiles = await pool.query(`SELECT id FROM guruji_profiles WHERE "userId"=ANY($1::int[])`, [users]);
  await pool.query(`DELETE FROM notifications WHERE "userId"=ANY($1::int[])`, [users]);
  await pool.query(`DELETE FROM guruji_pujas WHERE "gurujiId"=ANY($1::int[])`, [profiles.rows.map(profile => profile.id)]);
  await pool.query(`DELETE FROM guruji_profiles WHERE "userId"=ANY($1::int[])`, [users]);
  await pool.query(`DELETE FROM users WHERE id=ANY($1::int[])`, [users]);
  await pool.end();
  await unlink(fixturePath);
  console.log('Temporary registration fixtures removed.');
}