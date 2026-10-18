import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addressWindow, bookingStartIndia, privateResponse, redactPhoneText } from './bookingPrivacy';

test('India schedule boundaries are inclusive at -4h and exclusive at scheduled start', () => {
  const booking = { date: '2026-10-05', time: '01:00 PM', status: 'confirmed' };
  const start = Date.parse('2026-10-05T07:30:00Z');
  assert.equal(bookingStartIndia(booking.date, booking.time), start);
  assert.equal(bookingStartIndia(booking.date, '13:00'), start);
  assert.equal(addressWindow(booking, start - 4 * 3600000 - 1).visible, false);
  assert.equal(addressWindow(booking, start - 4 * 3600000).visible, true);
  assert.equal(addressWindow(booking, start - 1).visible, true);
  assert.equal(addressWindow(booking, start).visible, false);
  assert.equal(addressWindow({ ...booking, status: 'cancelled' }, start - 1).visible, false);
  assert.equal(addressWindow({ ...booking, time: 'invalid' }, start - 1).visible, false);
});
test('Counterparty and anonymous phones are removed; own profile remains usable', async () => {
  const data = { id: 10, role: 'guruji', firstName: 'Fixture', mobile: '9123456789', phoneNumber: '9123456789' };
  assert.equal((await privateResponse(data, { id: 20, role: 'customer' })).mobile, undefined);
  assert.equal((await privateResponse(data, {})).phoneNumber, undefined);
  assert.equal((await privateResponse(data, { id: 10, role: 'guruji' })).mobile, data.mobile);
  assert.equal((await privateResponse(data, { id: 30, role: 'admin' })).mobile, data.mobile);
  const nested = await privateResponse({ ...data, customer: { id: 20, firstName: 'Customer', mobile: '9234567890' } }, { id: 10, role: 'guruji' });
  assert.equal(nested.customer.mobile, undefined);
  assert.equal(redactPhoneText('Contact +91 91234 56789, OTP 123456.'), 'Contact [phone hidden], OTP 123456.');
});