import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { birthDateISO, birthDateDisplay, parseBirthDate, isPastBirthDate } from '../client/src/lib/birthDate';
import { openBrowserTest } from './browserTest';

const domain = process.env.REPLIT_DEV_DOMAIN;
if (!domain?.endsWith('.replit.dev') || process.env.NODE_ENV === 'production') throw new Error('Development only');
const base = `https://${domain}`;
const tag = randomBytes(6).toString('hex');
const password = randomBytes(18).toString('hex');
const store = new DBStorage();
const users: number[] = [];
const email = `dob-customer-${tag}@example.invalid`;
let ui: Awaited<ReturnType<typeof openBrowserTest>> | undefined;

async function replace(selector: string, text: string) {
  await ui!.click(selector);
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await ui!.command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  if (text) await ui!.command('Input.insertText', { text });
}
async function choose(selector: string, value: string) {
  await ui!.evaluate(`(() => {
    const select=document.querySelector(${JSON.stringify(selector)});
    select.value=${JSON.stringify(value)};
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`);
}

try {
  for (const input of ['15/08/1987', '15-08-1987', '1987-08-15']) {
    assert.equal(birthDateISO(parseBirthDate(input)!), '1987-08-15');
    assert.equal(birthDateDisplay(input), '15/08/1987');
  }
  assert.ok(parseBirthDate('29/02/2000'));
  for (const bad of ['29/02/2001', '31/04/1990', '1/2/19', '', 'abcd']) assert.equal(parseBirthDate(bad), null);
  assert.equal(isPastBirthDate('9999-01-01'), false);
  console.log('PASS: typed formats, leap years, impossible/incomplete dates and future birthdays');

  const sales = await store.createUser({
    firstName: 'BirthDateQA', lastName: 'Sales', email: `dob-sales-${tag}@example.invalid`,
    password, mobile: `9${randomInt(100000000, 999999999)}`, age: 30, gender: 'other', role: 'sales_rep',
  } as any);
  users.push(sales.id);
  const response = await fetch(base + '/api/sales-rep/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: sales.email, password }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie')!.split(';')[0];
  const separator = cookie.indexOf('=');
  ui = await openBrowserTest();
  await ui.command('Network.setCookie', { name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: base });
  await ui.command('Page.navigate', { url: base + '/sales-rep/dashboard?tab=register-customer' });
  await ui.wait(`!!document.querySelector('input[name="dob"]')`, 'customer registration DOB');
  assert.equal(await ui.evaluate(`document.querySelector('input[name="dob"]').type`), 'text');
  await ui.type('input[name="dob"]', '15/08/');
  for (const digit of '1987') {
    await ui.command('Input.insertText', { text: digit });
  }
  assert.equal(await ui.evaluate(`document.querySelector('input[name="dob"]').value`), '15/08/1987');
  await ui.click('button[aria-label="Choose date of birth"]');
  await ui.wait(`!!document.querySelector('select[aria-label="Choose year"]')`, 'DOB year selector');
  assert.equal(await ui.evaluate(`document.querySelector('select[aria-label="Choose year"]').value`), '1987');
  await choose('select[aria-label="Choose year"]', '1970');
  await choose('select[aria-label="Choose month"]', '2');
  await ui.click('[role="dialog"] button', '12');
  await ui.wait(`!document.querySelector('select[aria-label="Choose year"]')`, 'calendar closes after selection');
  assert.equal(await ui.evaluate(`document.querySelector('input[name="dob"]').value`), '12/03/1970');
  console.log('PASS: type year digit by digit; jump directly to 1970/March and select a day');

  await replace('input[name="dob"]', '31/02/1990');
  await ui.click('form button[type="submit"]');
  await ui.wait(`document.body.innerText.includes('Enter a valid date in DD/MM/YYYY format')`, 'invalid date validation');
  await replace('input[name="dob"]', '01/01/9999');
  await ui.click('form button[type="submit"]');
  await ui.wait(`document.body.innerText.includes('Date of birth cannot be in the future')`, 'future birthday validation');
  await replace('input[name="dob"]', '');
  await ui.click('form button[type="submit"]');
  await ui.wait(`document.body.innerText.includes('Date of birth required')`, 'required DOB validation');

  for (const [name, value] of Object.entries({
    firstName: 'BirthDateQA', lastName: 'Customer', email, mobile: `9${randomInt(100000000, 999999999)}`,
    password, aadhar: '123456789012', city: 'Mumbai', state: 'Maharashtra', pincode: '400001',
  })) await ui.type(`input[name="${name}"]`, value);
  await ui.type('textarea[name="address"]', 'Temporary DOB test address');
  await ui.type('input[name="dob"]', '15/08/1987');
  await ui.click('form button[type="submit"]');
  await ui.wait(`document.querySelector('input[name="email"]').value === ''`, 'customer registration reset');
  const registered = await pool.query(`SELECT id,dob::text AS dob FROM users WHERE email=$1`, [email]);
  assert.equal(registered.rowCount, 1);
  users.push(registered.rows[0].id);
  assert.equal(String(registered.rows[0].dob).slice(0, 10), '1987-08-15');
  assert.equal(await ui.evaluate(`document.querySelector('input[name="dob"]').value`), '');
  console.log('PASS: invalid/future/empty dates blocked; successful registration persists YYYY-MM-DD and resets DOB');

  await ui.click('[role="tab"]', 'Register Guruji');
  await ui.wait(`!!document.querySelector('input[name="dob"]')`, 'Guruji DOB');
  await ui.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await ui.type('input[name="dob"]', '29/02/1980');
  assert.equal(await ui.evaluate(`document.querySelector('input[name="dob"]').value`), '29/02/1980');
  await ui.click('button[aria-label="Choose date of birth"]');
  await ui.wait(`!!document.querySelector('select[aria-label="Choose year"]')`, 'mobile Guruji year selector');
  await choose('select[aria-label="Choose year"]', '1960');
  await choose('select[aria-label="Choose month"]', '0');
  await ui.click('[role="dialog"] button', '10');
  assert.equal(await ui.evaluate(`document.querySelector('input[name="dob"]').value`), '10/01/1960');
  console.log('PASS: Guruji form uses the same working picker, including mobile year selection');
} finally {
  await ui?.close();
  const customer = await pool.query(`SELECT id FROM users WHERE email=$1`, [email]);
  for (const row of customer.rows) if (!users.includes(row.id)) users.push(row.id);
  await pool.query(`DELETE FROM notifications WHERE "userId"=ANY($1::int[])`, [users]);
  await pool.query(`DELETE FROM users WHERE id=ANY($1::int[])`, [users]);
  await pool.end();
  console.log('Temporary DOB fixtures removed.');
}