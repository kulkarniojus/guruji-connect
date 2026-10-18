import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db';
import { clockMinutes, rulesBlockBooking } from '@workspace/portal-shared/gurujiAvailability';
import { parseBookingTime, validBookingDate } from './bookingSchedule';

export async function initializeGurujiAvailability() {
  await pool.query(`
    ALTER TABLE guruji_profiles ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE guruji_profiles ADD COLUMN IF NOT EXISTS "isOffline" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE guruji_profiles ADD COLUMN IF NOT EXISTS "isConsultation" BOOLEAN NOT NULL DEFAULT false;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guruji_availability_rules (
      id SERIAL PRIMARY KEY,
      guruji_id INTEGER NOT NULL REFERENCES guruji_profiles(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      start_time TEXT,
      end_time TEXT,
      is_available BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK ((start_time IS NULL AND end_time IS NULL) OR
        (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND
         end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND start_time < end_time))
    );
    CREATE INDEX IF NOT EXISTS guruji_availability_lookup
      ON guruji_availability_rules(guruji_id, date);
  `);
}

export async function getUnavailableGurujiIds(
  ids: number[], date: string, time: string, duration: number,
): Promise<Set<number>> {
  if (!ids.length) return new Set();
  const minute = parseBookingTime(time);
  if (!validBookingDate(date) || minute === null || !Number.isInteger(duration) ||
      duration < 0 || duration > 1440) throw new Error('Invalid booking schedule');
  const profiles = await pool.query(
    `SELECT id, "isAvailable" FROM guruji_profiles WHERE id=ANY($1::int[])`, [ids],
  );
  const rules = await pool.query(
    `SELECT guruji_id, date::text AS date, start_time AS "startTime",
      end_time AS "endTime", is_available AS "isAvailable"
     FROM guruji_availability_rules
     WHERE guruji_id=ANY($1::int[]) AND date BETWEEN $2::date AND $2::date + 1`,
    [ids, date],
  );
  const unavailable = new Set(ids.filter(id => !profiles.rows.some(p => p.id === id && p.isAvailable)));
  for (const id of ids) {
    if (rulesBlockBooking(rules.rows.filter(r => r.guruji_id === id), date, minute, duration)) {
      unavailable.add(id);
    }
  }
  return unavailable;
}

const rulePayload = z.object({
  date: z.string().refine(validBookingDate, 'Select a valid calendar date'),
  startTime: z.string().nullable().default(null),
  endTime: z.string().nullable().default(null),
  isAvailable: z.boolean(),
}).superRefine((r, ctx) => {
  if (r.startTime === null && r.endTime === null) return;
  const start = r.startTime === null ? null : clockMinutes(r.startTime);
  const end = r.endTime === null ? null : clockMinutes(r.endTime);
  if (start === null || end === null || start >= end) {
    ctx.addIssue({code: z.ZodIssueCode.custom, message: 'Use valid start/end times on the same day; end must be after start'});
  }
});

export const gurujiAvailabilityRouter = Router();
gurujiAvailabilityRouter.use(async (req, res, next) => {
  if (!req.session?.userId) return res.status(401).json({message: 'Please log in'});
  if (req.session.userRole !== 'guruji') return res.status(403).json({message: 'Only Gurujis can manage their availability'});
  try {
    const result = await pool.query(
      `SELECT gp.id, gp."isAvailable", u."isBlocked" FROM guruji_profiles gp
       JOIN users u ON u.id=gp."userId" WHERE gp."userId"=$1`, [req.session.userId],
    );
    if (!result.rows[0]) return res.status(404).json({message: 'Guruji profile not found'});
    if (result.rows[0].isBlocked) return res.status(403).json({message: 'Account blocked'});
    res.locals.guruji = result.rows[0];
    next();
  } catch {
    res.status(500).json({message: 'Unable to load Guruji profile'});
  }
});

gurujiAvailabilityRouter.get('/', async (req, res) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  const month = String(req.query.month || `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !validBookingDate(`${month}-01`)) {
    return res.status(400).json({message: 'Use month YYYY-MM'});
  }
  try {
    const id = res.locals.guruji.id;
    const rules = await pool.query(
      `SELECT id, date::text AS date, start_time AS "startTime", end_time AS "endTime",
         is_available AS "isAvailable" FROM guruji_availability_rules
       WHERE guruji_id=$1 AND date >= $2::date AND date < $2::date + INTERVAL '1 month'
       ORDER BY date,start_time NULLS FIRST`, [id, `${month}-01`],
    );
    const bookings = await pool.query(
      `SELECT b.id,b.date::text AS date,b.time,COALESCE(b.duration,p.duration) AS duration,
         b.status,p.name AS "pujaName" FROM bookings b JOIN pujas p ON p.id=b."pujaId"
       WHERE b."gurujiId"=$1 AND b.date >= $2::date AND b.date < $2::date + INTERVAL '1 month'
         AND b.status::text NOT IN ('cancelled','rejected')
       ORDER BY b.date,b.time`, [id, `${month}-01`],
    );
    res.json({isAvailable: res.locals.guruji.isAvailable, rules: rules.rows, bookings: bookings.rows});
  } catch {
    res.status(500).json({message: 'Unable to load availability calendar'});
  }
});

gurujiAvailabilityRouter.put('/', async (req, res) => {
  const parsed = z.object({isAvailable: z.boolean()}).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({message: 'Specify availability on or off'});
  try {
    await pool.query(`UPDATE guruji_profiles SET "isAvailable"=$1,"updatedAt"=NOW() WHERE id=$2`,
      [parsed.data.isAvailable, res.locals.guruji.id]);
    res.json(parsed.data);
  } catch {
    res.status(500).json({message: 'Unable to save availability'});
  }
});

gurujiAvailabilityRouter.post('/rules', async (req, res) => {
  const parsed = rulePayload.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({message: parsed.error.issues[0].message});
  const r = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = res.locals.guruji.id;
    await client.query('SELECT pg_advisory_xact_lock(8157,$1)', [id]);
    // Avoid contradictory overlapping time windows; allow an exact window to be updated.
    if (r.startTime !== null) {
      const conflicts = await client.query(
        `SELECT id FROM guruji_availability_rules WHERE guruji_id=$1 AND date=$2
         AND start_time IS NOT NULL AND start_time < $4 AND end_time > $3
         AND NOT (start_time=$3 AND end_time=$4)`, [id, r.date, r.startTime, r.endTime],
      );
      if (conflicts.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({message: 'This time overlaps an existing time rule. Remove that rule first.'});
      }
    }
    await client.query(
      `DELETE FROM guruji_availability_rules WHERE guruji_id=$1 AND date=$2
       AND start_time IS NOT DISTINCT FROM $3 AND end_time IS NOT DISTINCT FROM $4`,
      [id, r.date, r.startTime, r.endTime],
    );
    const saved = await client.query(
      `INSERT INTO guruji_availability_rules(guruji_id,date,start_time,end_time,is_available)
       VALUES ($1,$2,$3,$4,$5) RETURNING id,date::text AS date,start_time AS "startTime",
       end_time AS "endTime",is_available AS "isAvailable"`,
      [id,r.date,r.startTime,r.endTime,r.isAvailable],
    );
    await client.query('COMMIT');
    res.status(201).json(saved.rows[0]);
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({message: 'Unable to save availability rule'});
  } finally {
    client.release();
  }
});

gurujiAvailabilityRouter.delete('/rules/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({message: 'Invalid rule'});
  try {
    const deleted = await pool.query(
      `DELETE FROM guruji_availability_rules WHERE id=$1 AND guruji_id=$2 RETURNING id`,
      [id,res.locals.guruji.id],
    );
    if (!deleted.rowCount) return res.status(404).json({message: 'Rule not found'});
    res.json({deleted: true});
  } catch {
    res.status(500).json({message: 'Unable to remove availability rule'});
  }
});
