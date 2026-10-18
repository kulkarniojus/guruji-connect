import { pool } from './db';
import type { IStorage } from './storage';
import { isUnassignedBooking } from '@workspace/portal-shared/isUnassignedBooking';

export async function resolveUnassignedBookingAlerts(bookingId: number, db: Pick<typeof pool,'query'>=pool): Promise<void> {
  await db.query(
    `UPDATE notifications SET "isRead" = true WHERE (type IN ('unassigned_booking','booking_declined')
      OR (type='guruji_withdrawal' AND "userId" IN (SELECT id FROM users WHERE role='admin'))) AND message LIKE $1`,
    [`Booking #${bookingId}: %`],
  );
}

export async function notifyAdminsOfUnassignedBooking(
  booking: { id: number; pujaId: number; gurujiId?: number | null; status?: string | null; city?: string | null; date: Date | string; time?: string | null },
  eligibleGurujiCount: number,
  storage: Pick<IStorage, 'getPuja' | 'createNotification'>,
): Promise<void> {
  if (!isUnassignedBooking(booking)) return;
  const [admins, puja] = await Promise.all([
    pool.query(`SELECT id FROM users WHERE role = 'admin' AND "isBlocked" = false`),
    storage.getPuja(booking.pujaId),
  ]);
  const date = booking.date instanceof Date ? booking.date.toISOString().slice(0, 10) : String(booking.date).slice(0, 10);
  const matching = eligibleGurujiCount > 0
    ? `${eligibleGurujiCount} eligible Guruji${eligibleGurujiCount === 1 ? ' has' : 's have'} been requested; awaiting acceptance.`
    : 'No eligible Guruji was found in this location. Admin attention required.';
  await Promise.all(admins.rows.map(admin => storage.createNotification({
    userId: admin.id,
    title: 'Unassigned Puja Request',
    message: `Booking #${booking.id}: ${puja?.name || 'Puja'} in ${booking.city || 'an unspecified location'} on ${date}${booking.time ? ` at ${booking.time}` : ''}. ${matching} Review unassigned requests in Bookings.`,
    type: 'unassigned_booking',
  })));
}