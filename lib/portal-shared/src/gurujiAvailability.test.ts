import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clockMinutes, rulesBlockBooking, type AvailabilityRule } from './gurujiAvailability';

const date = '2026-11-20';
const day = (isAvailable: boolean): AvailabilityRule => ({date,startTime:null,endTime:null,isAvailable});
const window = (startTime: string, endTime: string, isAvailable: boolean): AvailabilityRule =>
  ({date,startTime,endTime,isAvailable});
test('default availability and zero-duration bookings', () => {
  assert.equal(rulesBlockBooking([],date,600,120),false);
  assert.equal(rulesBlockBooking([day(false)],date,600,0),true);
});
test('whole-day on and off rules', () => {
  assert.equal(rulesBlockBooking([day(false)],date,600,120),true);
  assert.equal(rulesBlockBooking([day(true)],date,600,120),false);
});
test('time off excludes overlapping service duration, not adjacent appointments', () => {
  const rules = [window('10:00','12:00',false)];
  assert.equal(rulesBlockBooking(rules,date,540,120),true);
  assert.equal(rulesBlockBooking(rules,date,480,120),false);
  assert.equal(rulesBlockBooking(rules,date,720,120),false);
  assert.equal(rulesBlockBooking(rules,date,660,0),true);
});
test('time on reopens only a fully contained service window inside a closed day', () => {
  const rules = [day(false),window('10:00','12:00',true)];
  assert.equal(rulesBlockBooking(rules,date,600,120),false);
  assert.equal(rulesBlockBooking(rules,date,600,121),true);
  assert.equal(rulesBlockBooking(rules,date,599,60),true);
});
test('overnight service respects the next day rules', () => {
  assert.equal(rulesBlockBooking([{...day(false),date:'2026-11-21'}],date,1380,120),true);
  assert.equal(rulesBlockBooking([{...day(false),date:'2026-11-21'}],date,1380,60),false);
});
test('clock validates 24-hour times', () => {
  assert.equal(clockMinutes('09:30'),570);
  assert.equal(clockMinutes('24:00'),null);
  assert.equal(clockMinutes('12:99'),null);
});
