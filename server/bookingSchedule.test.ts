import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bookingWindowsOverlap, parseBookingTime, validBookingDate } from './bookingSchedule';

const hour = 60 * 60_000;
const minute = 60_000;

test('parses booking time and rejects impossible dates and times', () => {
  assert.equal(parseBookingTime('12:00 AM'), 0);
  assert.equal(parseBookingTime('12:00 PM'), 720);
  assert.equal(parseBookingTime('01:30 PM'), 810);
  assert.equal(parseBookingTime('13:00 PM'), null);
  assert.equal(validBookingDate('2026-02-29'), false);
  assert.equal(validBookingDate('2026-09-28'), true);
});

test('overlapping bookings block both starts and intervals, but not adjacent slots', () => {
  assert.equal(bookingWindowsOverlap(10 * hour, 120, 11 * hour, 90), true);
  assert.equal(bookingWindowsOverlap(10 * hour, 120, 12 * hour, 90), false);
  assert.equal(bookingWindowsOverlap(12 * hour, 120, 10 * hour, 120), false);
  assert.equal(bookingWindowsOverlap(23 * hour, 120, 24 * hour, 60), true);
});

test('zero-hour exceptions occupy only the starting minute', () => {
  assert.equal(bookingWindowsOverlap(10 * hour, 0, 10 * hour, 0), true);
  assert.equal(bookingWindowsOverlap(10 * hour + minute, 0, 10 * hour, 0), false);
  assert.equal(bookingWindowsOverlap(10 * hour + minute, 0, 10 * hour, 120), true);
});