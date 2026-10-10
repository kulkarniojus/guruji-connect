import { pool } from './db';
import { getUnavailableGurujiIds } from './gurujiAvailability';

export function parseBookingTime(time: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  if (hour < 1 || hour > 12) return null;
  return (hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(match[2]);
}

export function validBookingDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function bookingWindowsOverlap(
  requestedStart: number,
  requestedDuration: number,
  existingStart: number,
  existingDuration: number,
): boolean {
  return requestedStart < existingStart + Math.max(existingDuration, 1) * 60_000 &&
    existingStart < requestedStart + Math.max(requestedDuration, 1) * 60_000;
}

// A zero-hour puja does not reserve an extended block, but its chosen
// starting minute still cannot be booked twice.
export async function getBusyGurujiIds(
  gurujiIds: number[],
  date: string,
  time: string,
  durationMinutes: number,
): Promise<Set<number>> {
  if (!gurujiIds.length) return new Set();
  if (!validBookingDate(date) || parseBookingTime(time) === null ||
      !Number.isInteger(durationMinutes) || durationMinutes < 0 || durationMinutes > 1440) {
    throw new Error('Invalid booking schedule');
  }

  const requestedStart = Date.parse(`${date}T00:00:00.000Z`) + parseBookingTime(time)! * 60_000;
  const result = await pool.query(
    `SELECT b."gurujiId" AS "gurujiId", b.date::text AS date, b.time,
            COALESCE(b.duration, p.duration) AS duration
       FROM bookings b
       JOIN pujas p ON p.id = b."pujaId"
      WHERE b."gurujiId" = ANY($1::int[])
        AND b.date BETWEEN $2::date - 1 AND $2::date + 1
        AND b.status::text IN ('confirmed', 'in_progress')`,
    [gurujiIds, date],
  );
  const busy = await getUnavailableGurujiIds(gurujiIds, date, time, durationMinutes);
  for (const row of result.rows) {
    const startMinute = parseBookingTime(row.time);
    if (startMinute === null) continue;
    const existingStart = Date.parse(`${row.date}T00:00:00.000Z`) + startMinute * 60_000;
    if (bookingWindowsOverlap(requestedStart, durationMinutes, existingStart, Number(row.duration))) {
      busy.add(Number(row.gurujiId));
    }
  }
  return busy;
}