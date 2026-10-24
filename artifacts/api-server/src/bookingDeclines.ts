import { pool } from './db';
import { hoursBeforeBooking } from './cancellationPolicy';

type Client = {query: (sql: string, values?: any[]) => Promise<{rows: any[]}>};
const closed = (message: string) => Object.assign(new Error(message), {status: 409});

async function persistAdminAlert(client: Client, type: string, title: string, message: string, prefix: string) {
  await client.query(`
    INSERT INTO notifications ("userId",title,message,type,"isRead","createdAt")
    SELECT u.id,$1,$2,$3,false,NOW() FROM users u
    WHERE u.role='admin' AND u."isBlocked"=false
      AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n."userId"=u.id
        AND n.type=$3 AND n.message LIKE $4)`,
    [title,message,type,`${prefix}%`],
  );
}

async function reconcileLockedBooking(client: Client, bookingId: number) {
  const booking = (await client.query(`
    SELECT b.*,p.name AS puja_name FROM bookings b LEFT JOIN pujas p ON p.id=b."pujaId"
    WHERE b.id=$1 FOR UPDATE OF b`,[bookingId])).rows[0];
  if (!booking || !['pending','pending_approval'].includes(booking.status)) return false;
  const requests = (await client.query(`
    SELECT r.*,u."firstName" AS guruji_name FROM booking_requests r
    LEFT JOIN guruji_profiles g ON g.id=r."gurujiId" LEFT JOIN users u ON u.id=g."userId"
    WHERE r."bookingId"=$1`,[bookingId])).rows;
  if (requests.some(r=>r.status==='accepted')) return false;
  const declined = requests.filter(r=>r.status==='declined');
  if (!declined.length) return false;
  const pendingCount = requests.filter(r=>r.status==='pending').length;
  // A selected Guruji is not an accepted assignment. Clear it once they decline.
  if (!pendingCount || declined.some(r=>r.gurujiId===booking.gurujiId)) {
    const status=pendingCount ? 'pending_approval' : 'pending';
    if (booking.gurujiId != null || booking.status!==status) {
      await client.query(`UPDATE bookings SET "gurujiId"=NULL,status=$2,"updatedAt"=NOW() WHERE id=$1`,
        [bookingId,status]);
    }
    booking.gurujiId=null;
  }
  for (const request of declined) {
    const prefix = `Booking #${bookingId}: Request #${request.id} rejected at ${new Date(request.updatedAt ?? request.createdAt).toISOString()}. `;
    const message = `${prefix}${request.guruji_name || `Guruji #${request.gurujiId}`} declined ${booking.puja_name || 'the puja'} in ${booking.city || 'the selected location'}.${request.message ? ` Reason: ${request.message}` : ''} ${pendingCount ? `${pendingCount} other Guruji request(s) remain open.` : 'No open Guruji requests remain. Please review Unassigned bookings and assign or resend.'}`;
    await persistAdminAlert(client,'booking_declined','Guruji Rejected Puja Request',message,prefix);
  }
  if (!booking.gurujiId) {
    const prefix=`Booking #${bookingId}: `;
    const message=`${prefix}${booking.puja_name || 'Puja'} in ${booking.city || 'the selected location'}. ${pendingCount ? `${pendingCount} Guruji request(s) remain open after a rejection.` : 'All Guruji requests are closed without acceptance. Admin attention required: assign or resend to eligible Gurujis.'} Review unassigned requests in Bookings.`;
    // Refresh existing active alerts rather than leaving an outdated "awaiting acceptance" message.
    await client.query(`UPDATE notifications SET message=$2 WHERE type='unassigned_booking'
      AND "isRead"=false AND message LIKE $1`,[`${prefix}%`,message]);
    await client.query(`
      INSERT INTO notifications ("userId",title,message,type,"isRead","createdAt")
      SELECT u.id,'Unassigned Puja Request',$2,'unassigned_booking',false,NOW() FROM users u
      WHERE u.role='admin' AND u."isBlocked"=false AND NOT EXISTS (
        SELECT 1 FROM notifications n WHERE n."userId"=u.id AND n.type='unassigned_booking'
        AND n."isRead"=false AND n.message LIKE $1)`,[`${prefix}%`,message]);
  }
  return !pendingCount;
}

export async function declineBookingRequest(bookingId: number, requestId: number, gurujiId: number, message?: string) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(8158,$1)',[bookingId]);
    const booking=(await client.query(`SELECT status,date::text AS calendar_date,time
      FROM bookings WHERE id=$1 FOR UPDATE`,[bookingId])).rows[0];
    if (booking?.status!=='pending_approval') throw closed('This booking is no longer awaiting acceptance');
    if (hoursBeforeBooking(booking) <= 0) {
      throw closed('The scheduled puja time has passed. Accepting or declining this request is no longer available.');
    }
    const updated=await client.query(`UPDATE booking_requests SET status='declined',message=$4,"updatedAt"=NOW()
      WHERE id=$1 AND "bookingId"=$2 AND "gurujiId"=$3 AND status='pending' RETURNING id`,
      [requestId,bookingId,gurujiId,message || null]);
    if (!updated.rows.length) throw closed('This booking request is no longer open');
    const allDeclined=await reconcileLockedBooking(client,bookingId);
    await client.query('COMMIT');
    return allDeclined;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {client.release();}
}

// Idempotent repair of older rejected requests. Never modify accepted or terminal bookings.
export async function reconcileDeclinedBookings(bookingIds?: number[]) {
  if (bookingIds && !bookingIds.length) return;
  const candidates=(await pool.query(`SELECT DISTINCT b.id FROM bookings b
    JOIN booking_requests r ON r."bookingId"=b.id AND r.status='declined'
    WHERE b.status IN ('pending','pending_approval') AND ($1::int[] IS NULL OR b.id=ANY($1))`,
    [bookingIds ?? null])).rows;
  for (const booking of candidates) {
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(8158,$1)',[booking.id]);
      await reconcileLockedBooking(client,booking.id);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {client.release();}
  }
}
