import { z } from 'zod';
import { pool } from './db';
import { paymentSettings } from './stripePayments';
import type { PoolClient } from '@neondatabase/serverless';

export const eventFail = (status: number, message: string) => Object.assign(new Error(message), { status });
export type EventDb = Pick<PoolClient, 'query'>;
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}, 'Use a valid calendar date');
export const eventMediaSchema = z.object({
  url: z.string().regex(/^\/api\/event-media\/[0-9a-f-]{36}$/),
  kind: z.enum(['banner','photo','video','document']),
  label: z.string().trim().min(1).max(200),
});
export const eventInputSchema = z.object({
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().min(10).max(15000),
  classType: z.string().trim().min(2).max(120),
  ageMin: z.number().int().min(1).max(18),
  ageMax: z.number().int().min(1).max(18),
  instructorName: z.string().trim().min(2).max(180),
  instructorDetails: z.string().trim().min(1).max(4000),
  mode: z.enum(['online','offline']),
  location: z.string().trim().max(2000),
  meetingUrl: z.string().trim().max(2000).refine(value => {
    if (!value) return true;
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
  }, 'Use a secure online joining URL'),
  startDate: calendarDate,
  endDate: calendarDate,
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().min(5).max(720),
  frequency: z.enum(['once','daily','weekly']),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7),
  basePrice: z.number().min(0).max(1000000).multipleOf(0.01),
  discountedPrice: z.number().min(0).max(1000000).multipleOf(0.01).nullable(),
  registrationDeadline: z.string().datetime({ offset: true }),
  capacity: z.number().int().min(1).max(10000),
  paymentMode: z.enum(['online','manual','both']),
  media: z.array(eventMediaSchema).max(12),
}).superRefine((event, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  if (event.ageMin > event.ageMax) issue('ageMax','Maximum age must not be below minimum age');
  if (event.discountedPrice !== null && event.discountedPrice > event.basePrice) issue('discountedPrice','Discounted price cannot exceed base price');
  if (event.mode === 'offline' && !event.location) issue('location','Enter the offline venue');
  if (event.endDate < event.startDate) issue('endDate','End date must not precede start date');
  if ((Date.parse(event.endDate)-Date.parse(event.startDate))/86400000 > 365) issue('endDate','Use a schedule of at most 366 days');
  if (event.frequency === 'once' && event.endDate !== event.startDate) issue('endDate','A one-time event starts and ends on the same day');
  if (event.frequency === 'weekly' && !event.weekdays.length) issue('weekdays','Select at least one weekday');
  if (event.media.filter(item => item.kind === 'banner').length > 1) issue('media','Use at most one banner');
  if (Date.parse(event.registrationDeadline) > Date.parse(`${event.endDate}T${event.startTime}:00+05:30`))
    issue('registrationDeadline','Registration must close no later than the final class starts');
});
export type EventInput = z.infer<typeof eventInputSchema>;
export function eventSchedule(event: EventInput) {
  const result: { start: Date; end: Date }[] = [];
  const start = Date.parse(`${event.startDate}T00:00:00Z`), end = Date.parse(`${event.endDate}T00:00:00Z`);
  for (let day = start; day <= end && result.length <= 366; day += 86400000) {
    const date = new Date(day);
    if (event.frequency === 'weekly' && !event.weekdays.includes(date.getUTCDay())) continue;
    const time = new Date(`${date.toISOString().slice(0,10)}T${event.startTime}:00+05:30`);
    result.push({ start: time, end: new Date(time.getTime()+event.durationMinutes*60000) });
  }
  if (!result.length || result.length > 366) throw eventFail(400,'This schedule does not contain a valid class session');
  return result;
}
export const reservedSeatsSql = `(SELECT count(*)::int FROM event_registrations r WHERE r.event_id=e.id
  AND (r.status IN ('registered','pending_confirmation') OR (r.status='pending_payment' AND r.hold_until>now())))`;

export async function initializeEvents() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS religious_events (
      id serial PRIMARY KEY, details jsonb NOT NULL,
      status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','cancelled')),
      version integer NOT NULL DEFAULT 1, cancellation_reason text NOT NULL DEFAULT '',
      actor_id integer REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS event_sessions (
      id serial PRIMARY KEY, event_id integer NOT NULL REFERENCES religious_events(id) ON DELETE CASCADE,
      start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
      status text NOT NULL DEFAULT 'scheduled', version integer NOT NULL,
      UNIQUE(event_id,start_at,version)
    );
    CREATE TABLE IF NOT EXISTS event_registrations (
      id uuid PRIMARY KEY, event_id integer NOT NULL REFERENCES religious_events(id) ON DELETE CASCADE,
      guardian_id integer NOT NULL REFERENCES users(id), request_id uuid NOT NULL,
      child_name text NOT NULL, child_age integer NOT NULL,
      event_name text NOT NULL,
      consent_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL,
      payment_method text NOT NULL, fee_paise integer NOT NULL,
      paid_paise integer NOT NULL DEFAULT 0, refunded_paise integer NOT NULL DEFAULT 0,
      is_test boolean NOT NULL DEFAULT false, hold_until timestamptz,
      stripe_session_id text UNIQUE, stripe_price_id text, checkout_expires_at timestamptz,
      cancellation_reason text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(guardian_id,request_id)
    );
    CREATE INDEX IF NOT EXISTS event_registrations_event ON event_registrations(event_id,status);
    CREATE TABLE IF NOT EXISTS event_payment_records (
      id bigserial PRIMARY KEY, registration_id uuid NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
      type text NOT NULL, amount_paise integer NOT NULL CHECK(amount_paise>0),
      reference text NOT NULL, note text NOT NULL DEFAULT '',
      actor_id integer REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(registration_id,type,reference)
    );
    CREATE TABLE IF NOT EXISTS event_attendance (
      session_id integer NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
      registration_id uuid NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
      status text NOT NULL CHECK(status IN ('present','absent','excused')),
      actor_id integer REFERENCES users(id), recorded_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(session_id,registration_id)
    );
    CREATE TABLE IF NOT EXISTS event_media (
      id uuid PRIMARY KEY, object_path text NOT NULL UNIQUE,
      actor_id integer NOT NULL REFERENCES users(id), content_type text NOT NULL,
      completed boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS event_notices (
      id bigserial PRIMARY KEY, event_id integer REFERENCES religious_events(id) ON DELETE CASCADE,
      actor_id integer REFERENCES users(id), message text NOT NULL,
      recipients integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function syncEventSessions(id: number, input: EventInput, version: number, client: EventDb) {
  // Keep session/attendance records, but never leave the superseded future
  // schedule active, including sessions an admin marked in advance.
  await client.query(`UPDATE event_sessions SET status='cancelled' WHERE event_id=$1 AND start_at>now()`, [id]);
  for (const item of eventSchedule(input)) {
    if (version > 1 && item.start.getTime() <= Date.now()) continue;
    await client.query(`INSERT INTO event_sessions(event_id,start_at,end_at,version)
      SELECT $1,$2,$3,$4 WHERE NOT EXISTS(SELECT 1 FROM event_sessions WHERE event_id=$1 AND start_at=$2 AND status='scheduled')`,
      [id,item.start,item.end,version]);
  }
}
export async function notifyEventGuardians(client: EventDb, eventId: number, title: string, message: string) {
  const result = await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
    SELECT DISTINCT guardian_id,$2,$3,'event',false,now() FROM event_registrations
    WHERE event_id=$1 AND (status IN ('registered','pending_confirmation') OR (status='pending_payment' AND hold_until>now())) RETURNING id`,
    [eventId,title,message]);
  return result.rowCount ?? 0;
}
export async function eventView(id: number, viewerId?: number, admin = false, client: EventDb = pool) {
  const row = (await client.query(`SELECT e.*,${reservedSeatsSql} AS reserved FROM religious_events e WHERE e.id=$1`, [id])).rows[0];
  if (!row || (!admin && row.status === 'draft')) throw eventFail(404,'Event not found');
  const details = { ...row.details } as EventInput;
  const own = viewerId ? (await client.query(`SELECT id FROM event_registrations WHERE event_id=$1 AND guardian_id=$2 AND status='registered'
    AND (fee_paise=0 OR paid_paise>=fee_paise) LIMIT 1`, [id,viewerId])).rowCount : 0;
  if (!admin && !own) details.meetingUrl = '';
  const sessions = (await client.query(`SELECT id,start_at AS "startAt",end_at AS "endAt",status FROM event_sessions WHERE event_id=$1
    ORDER BY start_at,id`, [id])).rows;
  const settings = await paymentSettings();
  const availableSeats = Math.max(0,details.capacity - row.reserved);
  return { ...details, id: row.id, status: row.status, version: row.version, cancellationReason: row.cancellation_reason,
    availableSeats, currentPrice: details.discountedPrice ?? details.basePrice,
    registrationOpen: row.status === 'published' && availableSeats > 0 && Date.parse(details.registrationDeadline)>Date.now() &&
      sessions.some(s => s.status==='scheduled' && new Date(s.startAt).getTime()>Date.now()),
    checkoutAvailable: settings.checkoutAvailable, checkoutMode: settings.providerMode, sessions };
}
export async function registrationView(id: string, client: EventDb = pool) {
  const row = (await client.query(`SELECT r.*,e.details->>'name' AS event_name,
    concat_ws(' ',u."firstName",u."lastName") AS guardian_name
    FROM event_registrations r JOIN religious_events e ON e.id=r.event_id JOIN users u ON u.id=r.guardian_id WHERE r.id=$1`, [id])).rows[0];
  if (!row) throw eventFail(404,'Registration not found');
  const expired = row.status === 'pending_payment' && new Date(row.hold_until).getTime()<=Date.now();
  const status = expired ? 'expired' : row.status;
  const payments = (await client.query(`SELECT type,amount_paise/100.0 AS amount,reference,created_at AS "createdAt"
    FROM event_payment_records WHERE registration_id=$1 ORDER BY created_at DESC,id DESC`, [id])).rows.map(item => ({ ...item, amount: Number(item.amount) }));
  return { id: row.id, eventId: row.event_id, eventName: row.event_name, guardianName: row.guardian_name,
    childName: row.child_name, childAge: row.child_age, status, paymentMethod: row.payment_method,
    fee: row.fee_paise/100, paid: row.paid_paise/100, refunded: row.refunded_paise/100,
    balanceDue: status==='cancelled'||status==='expired' ? 0 : Math.max(0,row.fee_paise-row.paid_paise)/100,
    refundDue: status==='cancelled' ? Math.max(0,row.paid_paise-row.refunded_paise)/100 : 0,
    isTest: row.is_test, holdUntil: row.hold_until, cancellationReason: row.cancellation_reason,
    createdAt: row.created_at, payments };
}
