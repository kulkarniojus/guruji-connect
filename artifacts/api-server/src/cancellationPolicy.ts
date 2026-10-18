import { createHash } from 'node:crypto';
import { z } from 'zod';
import { pool } from './db';
import { parseBookingTime } from './bookingSchedule';

export const cancellationRuleInput = z.object({
  userType: z.enum(['customer', 'guruji']),
  name: z.string().trim().min(1).max(150),
  hoursThreshold: z.coerce.number().int().min(0).max(87600),
  timeBasis: z.enum(['within', 'at_least']).default('within'),
  pujaId: z.coerce.number().int().positive().nullable().default(null),
  chargeType: z.enum(['free', 'percentage', 'fixed', 'full']),
  chargeValue: z.coerce.number().finite().min(0).max(100000000).default(0),
  description: z.string().trim().max(1000).default(''),
  isActive: z.boolean().default(true),
}).superRefine((rule, ctx) => {
  if (rule.chargeType === 'percentage' && rule.chargeValue > 100)
    ctx.addIssue({ code: 'custom', path: ['chargeValue'], message: 'Percentage must be between 0 and 100' });
});

export async function initializeCancellations() {
  // Existing minimum-hour policies retain their original meaning.
  await pool.query(`
    ALTER TABLE cancellation_rules ADD COLUMN IF NOT EXISTS time_basis text NOT NULL DEFAULT 'at_least';
    ALTER TABLE cancellation_rules ADD COLUMN IF NOT EXISTS puja_id integer REFERENCES pujas(id);
    ALTER TABLE cancellation_rules ALTER COLUMN charge_value TYPE numeric(14,2);
    ALTER TABLE bookings ALTER COLUMN cancellation_charge TYPE numeric(14,2);
    CREATE TABLE IF NOT EXISTS booking_cancellation_events (
      id serial PRIMARY KEY,
      booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      requested_by integer NOT NULL REFERENCES users(id),
      user_type text NOT NULL,
      kind text NOT NULL,
      status text NOT NULL,
      reason text NOT NULL,
      charge numeric(14,2) NOT NULL DEFAULT 0,
      quote jsonb NOT NULL,
      previous_guruji_id integer,
      reviewed_by integer REFERENCES users(id),
      review_reason text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      reviewed_at timestamptz
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_pending_customer_cancellation
      ON booking_cancellation_events(booking_id) WHERE status='pending' AND kind='customer_request';
  `);
}

export function hoursBeforeBooking(booking: any, now = Date.now()) {
  const date = booking.calendar_date || (booking.date instanceof Date
    ? booking.date.toISOString().slice(0, 10) : String(booking.date).slice(0, 10));
  const minutes = parseBookingTime(booking.time || '');
  if (minutes === null || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw Object.assign(new Error('Booking schedule is incomplete. Please contact the Sanatan Guruji support team.'), { status: 409 });
  // Live dates and twelve-hour times are Indian local wall-clock values.
  return (Date.parse(`${date}T00:00:00+05:30`) + minutes * 60000 - now) / 3600000;
}

export function selectCancellationRule(rules: any[], hours: number) {
  const remaining = Math.max(0, hours);
  const within = rules.filter(r => r.is_active && r.time_basis === 'within' && Number(r.hours_threshold) >= remaining)
    .sort((a, b) => Number(a.hours_threshold) - Number(b.hours_threshold) || b.id - a.id);
  if (within.length) return within[0];
  return rules.filter(r => r.is_active && r.time_basis !== 'within' && Number(r.hours_threshold) <= remaining)
    .sort((a, b) => Number(b.hours_threshold) - Number(a.hours_threshold) || b.id - a.id)[0] || null;
}

export function calculateCancellationCharge(amount: number, rule: any) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid saved booking amount');
  if (!rule || rule.charge_type === 'free') return 0;
  const value = Number(rule.charge_value);
  if (!Number.isFinite(value) || value < 0 || (rule.charge_type === 'percentage' && value > 100))
    throw Object.assign(new Error('The cancellation rule needs correction by the Sanatan Guruji support team.'), { status: 409 });
  if (rule.charge_type === 'full') return amount;
  if (rule.charge_type === 'percentage') return Math.round(amount * value) / 100;
  if (rule.charge_type === 'fixed') return Math.round(value * 100) / 100;
  throw new Error('Unsupported cancellation charge type');
}

export async function cancellationQuote(client: { query: any }, booking: any, userType: string) {
  const hoursUntil = hoursBeforeBooking(booking);
  const rules = userType === 'admin' ? [] : (await client.query(
    'SELECT * FROM cancellation_rules WHERE user_type=$1 AND is_active=true AND (puja_id IS NULL OR puja_id=$2)', [userType,booking.pujaId],
  )).rows;
  const rule = selectCancellationRule(rules.filter((r:any)=>r.puja_id!=null), hoursUntil)
    || selectCancellationRule(rules.filter((r:any)=>r.puja_id==null), hoursUntil);
  // Physical storage uses totalAmount; the application's Booking model uses amount.
  const bookingAmount = Number(booking.totalAmount ?? booking.amount);
  const charge = calculateCancellationCharge(bookingAmount, rule);
  const pending = (await client.query(`SELECT id FROM booking_cancellation_events
    WHERE booking_id=$1 AND kind='customer_request' AND status='pending'`, [booking.id])).rows[0];
  const canCancel = userType === 'guruji' ? ['confirmed','in_progress'].includes(booking.status)
    : userType === 'admin' ? ['pending','pending_approval','confirmed','in_progress'].includes(booking.status)
    : ['pending','pending_approval','confirmed'].includes(booking.status) && hoursUntil > 0 && !pending;
  const chargeDescription = rule?.charge_type === 'percentage' ? `${rule.charge_value}% of the saved booking amount: ₹${charge}`
    : rule?.charge_type === 'fixed' ? `Fixed charge: ₹${charge}`
    : rule?.charge_type === 'full' ? `Full saved booking amount: ₹${charge}` : 'No cancellation charge';
  const quoteToken = createHash('sha256').update(JSON.stringify({
    bookingId: booking.id, status: booking.status, gurujiId: booking.gurujiId,
    userType, bookingAmount, rule, charge, pending: pending?.id ?? null, canCancel,
  })).digest('hex');
  return {
    hoursUntil, bookingAmount, rule, charge, chargeDescription, quoteToken, canCancel,
    pendingRequestId: pending?.id ?? null,
    paymentNotice: 'Payments are currently disabled. Charges are recorded only; no money is deducted or refunded.',
    outcome: userType === 'guruji' ? 'Reopen the booking and search for another eligible Guruji; the booking will not be closed.'
      : userType === 'customer' ? 'Send a cancellation request to the Sanatan Guruji support team for approval. The booking stays open until approved.'
      : 'Admin controls cancellation and reassignment.',
  };
}
