import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adjustedPrice, selectPricingRule, selectRegularPriceAdjustment, type PricingRule } from '@workspace/portal-shared/pujaPricing';
import { pricingQuotePayload, pricingRulePayload, regularAdjustmentPayload, scheduledIndiaTime } from './pujaPricing';

const rule = (id: number, withinHours: number, pujaId: number | null = null): PricingRule => ({
  id, withinHours, pujaId, name: 'Short notice', mode: 'fixed', value: 5000, customerMessage: '', enabled: true,
});
test('percentage, rupee and fixed-price increases/decreases use whole rupees', () => {
  assert.equal(adjustedPrice(3000, 'percent', 60), 4800);
  assert.equal(adjustedPrice(3000, 'percent', -10), 2700);
  assert.equal(adjustedPrice(3000, 'amount', 2000), 5000);
  assert.equal(adjustedPrice(3000, 'amount', -500), 2500);
  assert.equal(adjustedPrice(3000, 'fixed', 5000), 5000);
  assert.equal(adjustedPrice(3000, 'percent', 66.67), 5000);
  assert.throws(() => adjustedPrice(3000, 'amount', -3000));
  assert.throws(() => adjustedPrice(3000, 'percent', Infinity));
});
test('time windows are inclusive, smallest wins, only one rule applies', () => {
  const rules = [rule(1,24),rule(2,12),rule(3,4)];
  assert.equal(selectPricingRule(rules, 10, 25), null);
  assert.equal(selectPricingRule(rules, 10, 24)?.id, 1);
  assert.equal(selectPricingRule(rules, 10, 12)?.id, 2);
  assert.equal(selectPricingRule(rules, 10, 4)?.id, 3);
  assert.equal(selectPricingRule(rules, 10, 0)?.id, 3);
  assert.equal(selectPricingRule(rules, 10, -0.001), null);
});
test('per-puja wins equal-window tie, unrelated/disabled rules do not apply', () => {
  const rules = [rule(1,12),rule(2,12,10),rule(3,4,99),{...rule(4,2),enabled:false}];
  assert.equal(selectPricingRule(rules, 10, 1)?.id, 2);
  assert.equal(selectPricingRule(rules, 11, 1)?.id, 1);
  assert.equal(selectPricingRule([rule(1,24,10),rule(2,4)], 10, 3)?.id, 2);
});
test('server calculates schedule in India time independent of server/browser timezone', () => {
  assert.equal(new Date(scheduledIndiaTime('2030-01-02','12:00 AM')).toISOString(), '2030-01-01T18:30:00.000Z');
  assert.equal(new Date(scheduledIndiaTime('2030-01-02','12:00 PM')).toISOString(), '2030-01-02T06:30:00.000Z');
  assert.equal(new Date(scheduledIndiaTime('2030-01-02','4:15 PM')).toISOString(), '2030-01-02T10:45:00.000Z');
});
test('configuration and schedule payloads reject invalid prices/windows and dates', () => {
  for (const patch of [{withinHours:0},{withinHours:9000},{mode:'fixed',value:-1},
    {mode:'fixed',value:3.5},{mode:'percent',value:-100},{mode:'amount',value:0.5}]) {
    assert.equal(pricingRulePayload.safeParse({...rule(1,12),...patch}).success, false);
  }
  assert.equal(pricingRulePayload.safeParse({...rule(1,0.5),mode:'percent',value:12.5}).success, true);
  assert.equal(pricingQuotePayload.safeParse({pujaId:1,calendarDate:'2030-02-31',time:'12:00 PM'}).success, false);
  assert.equal(pricingQuotePayload.safeParse({pujaId:1,calendarDate:'2030-01-01',time:'15:00 PM'}).success, false);
});
test('multi-puja rules apply only to their members and lose to narrower windows', () => {
  const multi = {...rule(10,24),pujaIds:[1,2]};
  assert.equal(selectPricingRule([rule(1,24),multi],2,23)?.id,10);
  assert.equal(selectPricingRule([multi],3,23),null);
  assert.equal(selectPricingRule([multi],2,24.001),null);
  assert.equal(selectPricingRule([multi,rule(11,4)],2,3)?.id,11);
  assert.deepEqual(pricingRulePayload.parse({...rule(1,24),pujaIds:[2,1,2]}).pujaIds,[1,2]);
  assert.deepEqual(pricingRulePayload.parse({...rule(1,24,5)}).pujaIds,[5]);
});
test('temporary regular-price ranges use inclusive scheduled dates and only selected pujas', () => {
  const a = {id:1,pujaIds:[1,2],fromDate:'2030-01-02',toDate:'2030-01-04',mode:'amount' as const,value:500};
  assert.equal(selectRegularPriceAdjustment([a],1,'2030-01-01'),null);
  assert.equal(selectRegularPriceAdjustment([a],1,'2030-01-02')?.id,1);
  assert.equal(selectRegularPriceAdjustment([a],2,'2030-01-04')?.id,1);
  assert.equal(selectRegularPriceAdjustment([a],2,'2030-01-05'),null);
  assert.equal(selectRegularPriceAdjustment([a],3,'2030-01-03'),null);
  const effective = adjustedPrice(3000,a.mode,a.value);
  const final = adjustedPrice(effective,'percent',10);
  assert.equal(3000 + (effective-3000) + (final-effective) + 200,4050);
});
test('dated adjustment validation rejects missing members, reversed/invalid dates and unsafe changes', () => {
  const valid = {pujaIds:[2,1,2],fromDate:'2030-01-02',toDate:'2030-01-04',mode:'percent',value:10};
  assert.deepEqual(regularAdjustmentPayload.parse(valid).pujaIds,[1,2]);
  for (const patch of [{pujaIds:[]},{toDate:'2030-01-01'},{fromDate:'2030-02-31'},{value:-100},{mode:'amount',value:1.5}]) {
    assert.equal(regularAdjustmentPayload.safeParse({...valid,...patch}).success,false);
  }
});
