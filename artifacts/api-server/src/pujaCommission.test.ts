import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCommissionPolicy } from '@workspace/portal-shared/pujaCommission';

test('Other-category commission override takes precedence over linked puja and default rates', () => {
  assert.deepEqual(resolveCommissionPolicy({
    defaultPercentage: 20,
    defaultConfigured: true,
    pujaOverride: 30,
    otherCategoryOverride: 15,
  }), { percentage: 15, configured: true, source: 'other_category' });
});

test('linked puja override is used when no Other-category override exists', () => {
  assert.deepEqual(resolveCommissionPolicy({
    defaultPercentage: 20,
    defaultConfigured: true,
    pujaOverride: 30,
    otherCategoryOverride: null,
  }), { percentage: 30, configured: true, source: 'puja' });
});

test('default and unconfigured policies remain unchanged when no override exists', () => {
  assert.deepEqual(resolveCommissionPolicy({
    defaultPercentage: 20,
    defaultConfigured: true,
    pujaOverride: null,
    otherCategoryOverride: null,
  }), { percentage: 20, configured: true, source: 'default' });
  assert.deepEqual(resolveCommissionPolicy({
    defaultPercentage: 0,
    defaultConfigured: false,
    pujaOverride: null,
    otherCategoryOverride: null,
  }), { percentage: 0, configured: false, source: 'unconfigured' });
});
