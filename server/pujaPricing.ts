import { z } from 'zod';
import { pool } from './db';
import { parseBookingTime, validBookingDate } from './bookingSchedule';
import { adjustedPrice, selectPricingRule, type PricingQuote, type PricingRule } from '../shared/pujaPricing';

export const pricingRulePayload = z.object({
  pujaId: z.number().int().positive().nullable(),
  name: z.string().trim().min(2).max(120),
  withinHours: z.number().positive().max(8760),
  mode: z.enum(['percent', 'amount', 'fixed']),
  value: z.number().finite().min(-100_000_000).max(100_000_000),
  customerMessage: z.string().trim().max(500).default(''),
  enabled: z.boolean().default(true),
}).superRefine((rule, ctx) => {
  if (rule.mode === 'fixed' && (!Number.isInteger(rule.value) || rule.value < 1)) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Fixed prices must be positive whole rupees.' });
  }
  if (rule.mode === 'percent' && (rule.value <= -100 || rule.value > 10000)) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percentage must be greater than -100 and at most 10000.' });
  }
  if (rule.mode === 'amount' && !Number.isInteger(rule.value)) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Rupee adjustments must be whole rupees.' });
  }
});

export const pricingQuotePayload = z.object({
  pujaId: z.number().int().positive(),
  calendarDate: z.string().refine(validBookingDate, 'Invalid calendar date'),
  time: z.string().refine(time => parseBookingTime(time) !== null, 'Use a time such as 10:00 AM'),
  withSamagri: z.boolean().default(false),
});

export async function initializePujaPricing() {
  await pool.query(`CREATE TABLE IF NOT EXISTS puja_pricing_rules (
    id SERIAL PRIMARY KEY,
    puja_id INTEGER REFERENCES pujas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    within_hours DOUBLE PRECISION NOT NULL CHECK (within_hours > 0 AND within_hours <= 8760),
    mode TEXT NOT NULL CHECK (mode IN ('percent','amount','fixed')),
    value DOUBLE PRECISION NOT NULL,
    customer_message TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS puja_pricing_rules_scope_window
    ON puja_pricing_rules (COALESCE(puja_id,0),within_hours)`);
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB');
}

export function mapPricingRule(row: any): PricingRule {
  return {
    id: row.id, pujaId: row.puja_id, name: row.name, withinHours: Number(row.within_hours),
    mode: row.mode, value: Number(row.value), customerMessage: row.customer_message, enabled: row.enabled,
  };
}
export async function getPricingRules(): Promise<PricingRule[]> {
  return (await pool.query('SELECT * FROM puja_pricing_rules ORDER BY within_hours, id')).rows.map(mapPricingRule);
}

export function scheduledIndiaTime(calendarDate: string, time: string): number {
  const minute = parseBookingTime(time);
  if (!validBookingDate(calendarDate) || minute === null) throw new Error('Invalid booking schedule.');
  return Date.parse(`${calendarDate}T00:00:00.000Z`) + (minute - 330) * 60_000;
}

export async function getPricingQuote(input: z.infer<typeof pricingQuotePayload>, now = Date.now()): Promise<PricingQuote> {
  const puja = (await pool.query('SELECT * FROM pujas WHERE id=$1 AND "isActive"=true', [input.pujaId])).rows[0];
  if (!puja) throw Object.assign(new Error('This puja is not available for booking.'), { status: 404 });
  const scheduledAt = scheduledIndiaTime(input.calendarDate, input.time);
  if (scheduledAt < now) throw Object.assign(new Error('Please choose a future puja date and time.'), { status: 400 });
  const regularPrice = Number(puja.price ?? puja.basePrice);
  const rule = selectPricingRule(await getPricingRules(), puja.id, (scheduledAt - now) / 3_600_000);
  const pujaPrice = adjustedPrice(regularPrice, rule?.mode ?? 'amount', rule?.value ?? 0);
  const samagriPrice = input.withSamagri ? Number(puja.samagriPrice ?? 0) : 0;
  if (!Number.isInteger(samagriPrice) || samagriPrice < 0) throw new Error('Samagri pricing is not configured correctly.');
  const adjustment = pujaPrice - regularPrice;
  const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
  const explanation = rule
    ? `You are booking within ${rule.withinHours} hours of the puja start. ${adjustment > 0
      ? `Short-notice pricing adds ${money(adjustment)} to the regular price of ${money(regularPrice)}.`
      : adjustment < 0 ? `This pricing rule reduces the regular price by ${money(-adjustment)}.`
      : 'The regular price applies.'}${rule.customerMessage ? ` ${rule.customerMessage}` : ''}`
    : 'Regular pricing applies. No short-notice pricing rule matches this schedule.';
  return {
    pujaId: puja.id, regularPrice, pujaPrice, samagriPrice, totalAmount: pujaPrice + samagriPrice,
    adjustment, rule, explanation, quotedAt: new Date(now).toISOString(), scheduledAt: new Date(scheduledAt).toISOString(),
  };
}

export async function validateRulePrices(rule: z.infer<typeof pricingRulePayload>) {
  const pujas = (await pool.query(
    'SELECT id,name,COALESCE(price,"basePrice") AS price FROM pujas WHERE ($1::int IS NULL OR id=$1)',
    [rule.pujaId])).rows;
  if (rule.pujaId !== null && !pujas.length) throw Object.assign(new Error('Puja not found.'), { status: 404 });
  if (!rule.enabled) return;
  for (const puja of pujas) {
    try { adjustedPrice(Number(puja.price), rule.mode, rule.value); }
    catch { throw Object.assign(new Error(`This rule gives an invalid price for ${puja.name}. Adjust its value or scope.`), { status: 400 }); }
  }
}

export async function validatePujaPriceRules(pujaId: number | null, price: number) {
  const rules = await getPricingRules();
  for (const rule of rules.filter(r => r.enabled && (r.pujaId === null || r.pujaId === pujaId))) {
    try { adjustedPrice(price, rule.mode, rule.value); }
    catch { throw Object.assign(new Error(`This price is incompatible with pricing rule "${rule.name}". Adjust the price or rule first.`), { status: 400 }); }
  }
}
