import type { Request, Response, NextFunction } from 'express';
import { pool } from './db';
import { parseBookingTime, validBookingDate } from './bookingSchedule';

export function bookingStartIndia(date: unknown, time: unknown): number | null {
  const day = date instanceof Date ? date.toISOString().slice(0, 10) : String(date ?? '').slice(0, 10);
  if (!validBookingDate(day) || typeof time !== 'string') return null;
  let minutes = parseBookingTime(time);
  if (minutes === null) {
    const match = /^(\d{1,2}):([0-5]\d)$/.exec(time.trim());
    if (!match || Number(match[1]) > 23) return null;
    minutes = Number(match[1]) * 60 + Number(match[2]);
  }
  // Bookings use Indian calendar dates and local wall-clock times, not UTC hours.
  return Date.parse(`${day}T00:00:00.000Z`) + minutes * 60000 - 330 * 60000;
}
export function addressWindow(booking: any, now = Date.now()) {
  const start = bookingStartIndia(booking.date, booking.time);
  return {
    visible: start !== null && ['confirmed', 'in_progress'].includes(booking.status) &&
      now >= start - 4 * 3600000 && now < start,
    availableAt: start === null ? null : new Date(start - 4 * 3600000).toISOString(),
    until: start === null ? null : new Date(start).toISOString(),
  };
}

const phoneField = /(?:mobile(?:number)?|phone(?:number)?|telephone(?:number)?|contactnumber)$/i;
const privateAddressFields = /^(?:address|homeaddress|exactaddress|streetaddress|customeraddress|pincode|postalcode|latitude|longitude|coordinates|locationdetails)$/i;
export function redactPhoneText(text: string) {
  return text.replace(/(?<!\d)(?:\+?91[\s-]*)?[6-9](?:[\s-]*\d){9}(?!\d)/g, '[phone hidden]');
}
const normalize = (key: string) => key.replace(/[_-]/g, '');
const bookingId = (object: any) =>
  object && object.customerId !== undefined && object.date !== undefined && Number.isSafeInteger(object.id) ? object.id : null;

export async function privateResponse(body: any, actor: { id?: number; role?: string }) {
  if (actor.role === 'admin') return body;
  const ids = new Set<number>();
  function collect(value: any) {
    if (!value || typeof value !== 'object' || value instanceof Date) return;
    const id = bookingId(value);
    if (id !== null) ids.add(id);
    Object.values(value).forEach(collect);
  }
  if (actor.role === 'guruji') collect(body);
  const visible = new Map<number, any>();
  if (ids.size) {
    const rows = (await pool.query(
      `SELECT b.id,b.date,b.time,b.status,g."userId" AS guruji_user_id,
        r.booking_id IS NOT NULL AS admin_released
       FROM bookings b LEFT JOIN guruji_profiles g ON g.id=b."gurujiId"
       LEFT JOIN booking_address_releases r ON r.booking_id=b.id AND r.guruji_user_id=g."userId"
       WHERE b.id=ANY($1::int[])`, [Array.from(ids)])).rows;
    for (const row of rows) {
      const window = addressWindow(row);
      const assigned = row.guruji_user_id === actor.id;
      const released = assigned && row.admin_released;
      visible.set(row.id, {
        ...window, visible: assigned && (window.visible || released),
        source: released ? 'admin_release' : assigned && window.visible ? 'scheduled_window' : 'hidden',
      });
    }
  }
  function sanitize(value: any, own = false, bookingContext: any = null): any {
    if (typeof value === 'string') return own ? value : redactPhoneText(value);
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    if (Array.isArray(value)) return value.map(item => sanitize(item, own, bookingContext));
    const id = bookingId(value);
    const context = id !== null ? visible.get(id) ?? { visible: false, source: 'hidden', availableAt: null, until: null } : bookingContext;
    const self = Number.isSafeInteger(actor.id) && actor.id! > 0 && (value.userId !== undefined
      ? value.userId === actor.id && value.experience !== undefined
      : id === null && value.id === actor.id && value.firstName !== undefined &&
        (!value.role || value.role === actor.role));
    const isOwn = self || (own && value.id === undefined && value.userId === undefined && value.customerId === undefined);
    const result: any = {};
    for (const [key, item] of Object.entries(value)) {
      const field = normalize(key);
      // Server-generated SHA-256 quote identifiers are not display text.
      // Redacting digit runs inside a digest invalidates the confirmation,
      // even when the booking and cancellation charge have not changed.
      if (field === 'quoteToken' && typeof item === 'string' && /^[a-f0-9]{64}$/.test(item)) {
        result[key] = item;
        continue;
      }
      if (!isOwn && phoneField.test(field) && (typeof item === 'string' || typeof item === 'number')) continue;
      if (actor.role === 'guruji' && !isOwn &&
          (privateAddressFields.test(field) || (field === 'notes' && context && !context.visible))) {
        // Customer profile addresses never substitute for the booking's authorized address.
        result[key] = context?.visible && id !== null ? sanitize(item, false, context) : null;
      } else {
        result[key] = sanitize(item, isOwn, context);
      }
    }
    if (id !== null && actor.role === 'guruji') result.addressVisibility = context;
    return result;
  }
  return sanitize(body);
}

export function bookingPrivacyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api/')) return next();
  const original = res.json;
  res.json = function(body: any) {
    if (req.session?.userId) res.set('Cache-Control', 'no-store, private');
    void privateResponse(body, { id: req.session?.userId, role: req.session?.userRole })
      .then(safe => original.call(res, safe))
      .catch(() => {
        // Never fall back to the unfiltered body if the privacy lookup fails.
        res.status(500);
        original.call(res, { message: 'Could not safely load these details. Please retry.' });
      });
    return res;
  };
  next();
}