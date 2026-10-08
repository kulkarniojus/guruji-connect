import { z } from 'zod';
import { pool } from './db';
import { parseBookingTime, validBookingDate } from './bookingSchedule';
import {
  adjustedPrice, selectPricingRule, pricingRuleMatchesPuja, selectRegularPriceAdjustment,
  type PricingQuote, type PricingRule, type RegularPriceAdjustment,
} from '../shared/pujaPricing';

const priceFields = {
  mode: z.enum(['percent', 'amount', 'fixed']),
  value: z.number().finite().min(-100_000_000).max(100_000_000),
};
function validatePriceFields(rule: {mode: string; value: number}, ctx: z.RefinementCtx) {
  if (rule.mode === 'fixed' && (!Number.isInteger(rule.value) || rule.value < 1)) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Fixed prices must be positive whole rupees.' });
  }
  if (rule.mode === 'percent' && (rule.value <= -100 || rule.value > 10000)) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percentage must be greater than -100 and at most 10000.' });
  }
  if (rule.mode === 'amount' && !Number.isInteger(rule.value)) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Rupee adjustments must be whole rupees.' });
  }
}
const pujaIdsField = z.array(z.number().int().positive()).max(500);
export const pricingRulePayload = z.object({
  pujaId: z.number().int().positive().nullable().optional(),
  pujaIds: pujaIdsField.optional(),
  name: z.string().trim().min(2).max(120),
  withinHours: z.number().positive().max(8760),
  ...priceFields,
  customerMessage: z.string().trim().max(500).default(''),
  enabled: z.boolean().default(true),
}).superRefine((rule, ctx) => {
  validatePriceFields(rule, ctx);
  if (rule.pujaIds === undefined && rule.pujaId === undefined) {
    ctx.addIssue({ code: 'custom', path: ['pujaIds'], message: 'Choose selected pujas or all pujas.' });
  }
}).transform(rule => {
  const pujaIds = Array.from(new Set(rule.pujaIds ?? (rule.pujaId ? [rule.pujaId] : []))).sort((a,b) => a-b);
  return { ...rule, pujaIds, pujaId: pujaIds.length === 1 ? pujaIds[0] : null };
});
export const regularAdjustmentPayload = z.object({
  pujaIds: pujaIdsField.min(1),
  fromDate: z.string().refine(validBookingDate, 'Choose a valid from date'),
  toDate: z.string().refine(validBookingDate, 'Choose a valid to date'),
  ...priceFields,
}).superRefine((adjustment, ctx) => {
  validatePriceFields(adjustment, ctx);
  if (adjustment.fromDate > adjustment.toDate) {
    ctx.addIssue({ code: 'custom', path: ['toDate'], message: 'To date must be on or after from date.' });
  }
}).transform(a => ({...a, pujaIds: Array.from(new Set(a.pujaIds)).sort((x,y) => x-y)}));

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
  await pool.query(`ALTER TABLE puja_pricing_rules ADD COLUMN IF NOT EXISTS puja_ids INTEGER[] NOT NULL DEFAULT '{}'`);
  await pool.query(`UPDATE puja_pricing_rules SET puja_ids=ARRAY[puja_id]
    WHERE puja_id IS NOT NULL AND cardinality(puja_ids)=0`);
  await pool.query('DROP INDEX IF EXISTS puja_pricing_rules_scope_window');
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS puja_pricing_rules_multi_scope_window
    ON puja_pricing_rules (puja_ids,within_hours)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS puja_regular_price_adjustments (
    id SERIAL PRIMARY KEY,
    puja_ids INTEGER[] NOT NULL CHECK (cardinality(puja_ids)>0),
    from_date TEXT NOT NULL,
    to_date TEXT NOT NULL CHECK (to_date>=from_date),
    mode TEXT NOT NULL CHECK (mode IN ('percent','amount','fixed')),
    value DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB');
}

export function mapPricingRule(row: any): PricingRule {
  return {
    id: row.id, pujaId: row.puja_id, pujaIds: row.puja_ids ?? (row.puja_id ? [row.puja_id] : []),
    name: row.name, withinHours: Number(row.within_hours),
    mode: row.mode, value: Number(row.value), customerMessage: row.customer_message, enabled: row.enabled,
  };
}
type PricingDatabase = { query: (sql: string, values?: any[]) => Promise<{rows: any[]}> };
export function mapRegularAdjustment(row: any): RegularPriceAdjustment {
  return {id: row.id, pujaIds: row.puja_ids, fromDate: row.from_date, toDate: row.to_date,
    mode: row.mode, value: Number(row.value)};
}
export async function getRegularAdjustments(db: PricingDatabase = pool): Promise<RegularPriceAdjustment[]> {
  return (await db.query('SELECT * FROM puja_regular_price_adjustments ORDER BY from_date,id')).rows.map(mapRegularAdjustment);
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
  const [rules, regularAdjustments] = await Promise.all([getPricingRules(), getRegularAdjustments()]);
  const regularPriceAdjustment = selectRegularPriceAdjustment(regularAdjustments, puja.id, input.calendarDate);
  const effectiveRegularPrice = adjustedPrice(regularPrice, regularPriceAdjustment?.mode ?? 'amount', regularPriceAdjustment?.value ?? 0);
  const rule = selectPricingRule(rules, puja.id, (scheduledAt - now) / 3_600_000);
  const pujaPrice = adjustedPrice(effectiveRegularPrice, rule?.mode ?? 'amount', rule?.value ?? 0);
  const samagriPrice = input.withSamagri ? Number(puja.samagriPrice ?? 0) : 0;
  if (!Number.isInteger(samagriPrice) || samagriPrice < 0) throw new Error('Samagri pricing is not configured correctly.');
  const adjustment = pujaPrice - regularPrice;
  const regularAdjustment = effectiveRegularPrice - regularPrice;
  const timeAdjustment = pujaPrice - effectiveRegularPrice;
  const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
  const datedExplanation = regularPriceAdjustment
    ? `Your selected puja date falls in the temporary rate period ${regularPriceAdjustment.fromDate} to ${regularPriceAdjustment.toDate} (inclusive). ${regularAdjustment >= 0
      ? `This adds ${money(regularAdjustment)} to` : `This discounts ${money(-regularAdjustment)} from`} the regular price. `
    : '';
  const explanation = datedExplanation + (rule
    ? `You are booking within ${rule.withinHours} hours of the puja start. ${timeAdjustment > 0
      ? `Short-notice pricing adds ${money(timeAdjustment)} to the ${regularPriceAdjustment ? 'date-adjusted regular' : 'regular'} price of ${money(effectiveRegularPrice)}.`
      : timeAdjustment < 0 ? `This pricing rule reduces the ${regularPriceAdjustment ? 'date-adjusted ' : ''}regular price by ${money(-timeAdjustment)}.`
      : 'The regular price applies.'}${rule.customerMessage ? ` ${rule.customerMessage}` : ''}`
    : 'No short-notice surcharge applies: your selected time is outside the configured booking windows, or no enabled rule matches this puja.');
  return {
    pujaId: puja.id, regularPrice, pujaPrice, samagriPrice, totalAmount: pujaPrice + samagriPrice,
    adjustment, rule, explanation, quotedAt: new Date(now).toISOString(), scheduledAt: new Date(scheduledAt).toISOString(),
    regularPriceAdjustment, regularAdjustment, timeAdjustment, effectiveRegularPrice,
  };
}

async function selectedPujas(pujaIds: number[], db: PricingDatabase) {
  const pujas = (await db.query(
    'SELECT id,name,COALESCE(price,"basePrice") AS price FROM pujas WHERE (cardinality($1::int[])=0 OR id=ANY($1::int[]))',
    [pujaIds])).rows;
  if (pujaIds.length && pujas.length !== pujaIds.length) throw Object.assign(new Error('One or more selected pujas no longer exist. Refresh the selection.'), {status:404});
  return pujas;
}
const futureAdjustments = (adjustments: RegularPriceAdjustment[]) =>
  adjustments.filter(a => a.toDate >= new Date(Date.now()+330*60_000).toISOString().slice(0,10));
export async function validateRulePrices(rule: z.infer<typeof pricingRulePayload>, db: PricingDatabase = pool) {
  const pujas = await selectedPujas(rule.pujaIds, db);
  if (!rule.enabled) return;
  const adjustments = futureAdjustments(await getRegularAdjustments(db));
  for (const puja of pujas) {
    try {
      adjustedPrice(Number(puja.price), rule.mode, rule.value);
      for (const a of adjustments.filter(a => a.pujaIds.includes(puja.id))) {
        adjustedPrice(adjustedPrice(Number(puja.price), a.mode, a.value), rule.mode, rule.value);
      }
    }
    catch { throw Object.assign(new Error(`This rule gives an invalid price for ${puja.name}. Adjust its value or scope.`), { status: 400 }); }
  }
}

export async function validatePujaPriceRules(pujaId: number | null, price: number, db: PricingDatabase = pool) {
  const rules = (await db.query('SELECT * FROM puja_pricing_rules WHERE enabled=true')).rows.map(mapPricingRule)
    .filter(r => pricingRuleMatchesPuja(r, pujaId ?? -1));
  const adjustments = futureAdjustments(await getRegularAdjustments(db)).filter(a => a.pujaIds.includes(pujaId ?? -1));
  let prices: number[];
  try { prices = [price, ...adjustments.map(a => adjustedPrice(price,a.mode,a.value))]; }
  catch { throw Object.assign(new Error('This regular price is incompatible with a date-limited adjustment. Update or delete that adjustment first.'),{status:400}); }
  for (const rule of rules) {
    try { for (const effectivePrice of prices) adjustedPrice(effectivePrice, rule.mode, rule.value); }
    catch { throw Object.assign(new Error(`This price is incompatible with pricing rule "${rule.name}". Adjust the price or rule first.`), { status: 400 }); }
  }
}
export async function validateRegularAdjustmentPrices(a: z.infer<typeof regularAdjustmentPayload>, db: PricingDatabase) {
  const pujas = await selectedPujas(a.pujaIds, db);
  const rules = (await db.query('SELECT * FROM puja_pricing_rules WHERE enabled=true')).rows.map(mapPricingRule);
  for (const puja of pujas) {
    const price = adjustedPrice(Number(puja.price), a.mode, a.value);
    for (const rule of rules.filter(r => pricingRuleMatchesPuja(r, puja.id))) adjustedPrice(price, rule.mode, rule.value);
  }
}
export async function withPricingTransaction<T>(work: (db: PricingDatabase) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(729341,1)');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
