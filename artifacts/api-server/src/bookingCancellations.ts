import { pool } from './db';
import { DBStorage } from './dbStorage';
import { getBusyGurujiIds } from './bookingSchedule';
import { cancellationQuote } from './cancellationPolicy';
import { bookingCustomerFunds } from './customerFinance';
import { createBookingRefundRequest } from './customerRefunds';

const storage = new DBStorage();
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
type Client = { query: any };

export async function cancellationActor(client: Client, userId: number, booking: any) {
  const user = (await client.query('SELECT role,"isBlocked" FROM users WHERE id=$1', [userId])).rows[0];
  if (!user || user.isBlocked) throw fail(403, 'Not authorized');
  if (user.role === 'admin') return 'admin';
  if (user.role === 'customer' && booking.customerId === userId) return 'customer';
  if (user.role === 'guruji') {
    const guruji = (await client.query('SELECT id FROM guruji_profiles WHERE "userId"=$1', [userId])).rows[0];
    if (guruji && guruji.id === booking.gurujiId) return 'guruji';
  }
  throw fail(403, 'Not authorized for this booking');
}

async function notify(client: Client, ids: number[], title: string, message: string, type: string) {
  for (const id of Array.from(new Set(ids.filter(Boolean))))
    await client.query(`INSERT INTO notifications ("userId",title,message,type,"isRead","createdAt")
      VALUES ($1,$2,$3,$4,false,NOW())`, [id,title,message,type]);
}

async function admins(client: Client) {
  return (await client.query(`SELECT id FROM users WHERE role='admin' AND "isBlocked"=false`)).rows.map((u: any) => u.id);
}

async function closeBooking(client: Client, booking: any, reason: string, party: string, charge: number, origin = 'admin') {
  const requestedGurujis=(await client.query(`SELECT DISTINCT g."userId" AS user_id FROM booking_requests r
    JOIN guruji_profiles g ON g.id=r."gurujiId" WHERE r."bookingId"=$1 AND r.status IN ('pending','accepted')`,
    [booking.id])).rows;
  await client.query(`UPDATE bookings SET status='cancelled',cancellation_reason=$2,
    cancelled_by=$3,cancellation_charge=$4,"updatedAt"=NOW() WHERE id=$1`, [booking.id,reason,party,charge]);
  const cancelledBooking = { ...booking, status:'cancelled', cancelled_by:party, cancellation_charge:charge };
  const customerFunds = await bookingCustomerFunds(client,cancelledBooking);
  const refundRequest = await createBookingRefundRequest(client,cancelledBooking,reason,customerFunds);
  await client.query(`UPDATE booking_requests SET status='cancelled',"updatedAt"=NOW()
    WHERE "bookingId"=$1 AND status IN ('pending','accepted')`, [booking.id]);
  await client.query(`UPDATE booking_completion_challenges SET code_cipher=NULL,otp_digest=NULL
    WHERE booking_id=$1`, [booking.id]);
  await client.query(`UPDATE notifications SET "isRead"=true WHERE type IN
    ('unassigned_booking','booking_declined','guruji_withdrawal','cancellation_request')
    AND message LIKE $1`, [`Booking #${booking.id}: %`]);
  const guruji = booking.gurujiId ? (await client.query(
    'SELECT "userId" FROM guruji_profiles WHERE id=$1', [booking.gurujiId],
  )).rows[0] : null;
  await notify(client, [booking.customerId,...await admins(client)], 'Booking Cancelled',
    `Booking #${booking.id}: cancelled by ${origin === 'customer' ? 'the customer' : 'the Vaidik Dhara support team'}. Reason: ${reason}. ` +
    (customerFunds.refundOwed > 0
      ? `Recorded payments ₹${customerFunds.recordedPaid}; policy retention ₹${customerFunds.retainedCharge}; refund owed ₹${customerFunds.refundOwed}. ` +
        (refundRequest ? `Refund request #${refundRequest.id} is awaiting admin approval.` : 'The refund request is already recorded.')
      : charge ? `Recorded ${party} cancellation charge: ₹${charge}. No money has been deducted.` : 'No cancellation charge.'), 'booking_cancelled');
  await notify(client,[guruji?.userId,...requestedGurujis.map((g:any)=>g.user_id)],'Booking Cancelled',
    `Booking #${booking.id}: the booking is cancelled. Contact the Vaidik Dhara support team for details. `+
    (party==='guruji' && charge ? `Recorded Guruji charge: ₹${charge}. No money has been deducted.` : 'No Guruji cancellation charge.'),'booking_cancelled');
}

async function dispatchReplacement(client: Client, booking: any, excluded: number[]) {
  const profiles = await storage.getNearbyGurujis(booking.city || '', booking.pujaId, 20, booking.pincode);
  const puja = booking.pujaId ? await storage.getPuja(booking.pujaId) : null;
  // getNearbyGurujis already enforces verified/approved/unblocked/available in SQL.
  // Its mapped profile exposes document verification, not the raw isVerified column.
  const eligible = profiles.filter(g => g.aadharVerified && g.documentsVerified && !excluded.includes(g.id));
  const busy = await getBusyGurujiIds(eligible.map(g => g.id), String(booking.calendar_date),
    booking.time, Number(booking.duration ?? puja?.duration ?? 0));
  let count = 0;
  for (const guruji of eligible.filter(g => !busy.has(g.id))) {
    const request = (await client.query(`SELECT id,status FROM booking_requests
      WHERE "bookingId"=$1 AND "gurujiId"=$2 ORDER BY id DESC LIMIT 1`, [booking.id,guruji.id])).rows[0];
    if (request?.status === 'declined' || request?.status === 'accepted') continue;
    if (request) {
      if (request.status !== 'pending') await client.query(`UPDATE booking_requests SET status='pending',
        message=NULL,"updatedAt"=NOW() WHERE id=$1`, [request.id]);
    } else await client.query(`INSERT INTO booking_requests
      ("bookingId","gurujiId",status,"createdAt","updatedAt") VALUES ($1,$2,'pending',NOW(),NOW())`,
      [booking.id,guruji.id]);
    if(request?.status!=='pending') await notify(client, [guruji.userId], 'Replacement Guruji Request',
      `Booking #${booking.id}: a replacement Guruji is needed for ${puja?.name || 'the puja'} in ${booking.city}. Please review and accept only if available.`, 'booking_request');
    count++;
  }
  await client.query(`UPDATE bookings SET status=$2,"updatedAt"=NOW() WHERE id=$1`,
    [booking.id,count ? 'pending_approval' : 'pending']);
  await notify(client, await admins(client), 'Unassigned Puja Request',
    `Booking #${booking.id}: reassignment required. ${count} eligible replacement Guruji request(s) sent. Review Unassigned bookings.`, 'unassigned_booking');
  return count;
}

export async function performCancellation(bookingId: number, userId: number, input: {
  reason: string; quoteToken?: string; action?: string; eventId?: number;
  chargeParty?: string; chargeOverride?: number; searchOthers?: boolean;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(8158,$1)', [bookingId]);
    const booking = (await client.query(`SELECT b.*,b.date::text AS calendar_date
      FROM bookings b WHERE id=$1 FOR UPDATE`, [bookingId])).rows[0];
    if (!booking) throw fail(404, 'Booking not found');
    const actor = await cancellationActor(client, userId, booking);
    const action = actor === 'admin' ? input.action || 'cancel' : actor === 'customer' ? 'cancel' : 'withdraw';
    if (!['pending','pending_approval','confirmed','in_progress'].includes(booking.status) && !(actor==='admin' && action==='review_withdrawal'))
      throw fail(409, 'This booking is closed and cannot be cancelled or reassigned');
    let quote = await cancellationQuote(client, booking, actor);
    if (actor !== 'admin') {
      if (!quote.canCancel) throw fail(409, quote.pendingRequestId
        ? 'A cancellation request is already awaiting the Vaidik Dhara support team.'
        : 'This booking cannot be cancelled at this stage. Contact the Vaidik Dhara support team.');
      if (input.quoteToken !== quote.quoteToken) throw Object.assign(
        fail(409, 'The cancellation quote changed. Review the updated charge before confirming.'), { quote });
    }
    let charge = quote.charge;
    let party = actor;
    let kind = actor === 'customer' ? 'customer_cancel' : actor === 'guruji' ? 'guruji_withdrawal' : 'admin_cancel';
    let eventId: number;
    if (actor==='admin' && action==='review_withdrawal') {
      const event=(await client.query(`SELECT * FROM booking_cancellation_events WHERE id=$1 AND booking_id=$2
        AND kind IN ('guruji_withdrawal','admin_reassignment') AND user_type='guruji' AND status='recorded' FOR UPDATE`,
        [input.eventId,bookingId])).rows[0];
      if(!event) throw fail(409,'This withdrawal was already reviewed or does not exist');
      charge=input.chargeOverride ?? Number(event.charge);
      quote=event.quote;party='guruji';eventId=event.id;
      await client.query(`UPDATE booking_cancellation_events SET status='reviewed',reviewed_by=$2,
        review_reason=$3,reviewed_at=NOW(),charge=$4 WHERE id=$1`,[event.id,userId,input.reason,charge]);
      const oldGuruji=(await client.query('SELECT "userId" FROM guruji_profiles WHERE id=$1',[event.previous_guruji_id])).rows[0];
      if(oldGuruji) await notify(client,[oldGuruji.userId],'Withdrawal Charge Reviewed',
        `Booking #${bookingId}: the Vaidik Dhara support team reviewed your withdrawal. Recorded charge ₹${charge}. ${input.reason}. No money has been deducted.`,'cancellation_charge');
    } else if (actor === 'admin' && ['approve','reject'].includes(action)) {
      const event = (await client.query(`SELECT * FROM booking_cancellation_events
        WHERE id=$1 AND booking_id=$2 AND kind='customer_request' AND status='pending' FOR UPDATE`,
        [input.eventId,bookingId])).rows[0];
      if (!event) throw fail(409, 'This cancellation request was already handled or does not exist');
      charge = input.chargeOverride ?? Number(event.charge);
      party = 'customer';
      quote = event.quote;
      eventId = event.id;
      await client.query(`UPDATE booking_cancellation_events SET status=$2,reviewed_by=$3,
        review_reason=$4,reviewed_at=NOW(),charge=$5 WHERE id=$1`,
        [event.id,action === 'approve' ? 'approved' : 'rejected',userId,input.reason,charge]);
      if (action === 'approve') await closeBooking(client, booking, event.reason, party, charge);
      else {
        await notify(client, [booking.customerId], 'Cancellation Request Reviewed',
          `Booking #${booking.id}: the Vaidik Dhara support team did not approve your cancellation request. ${input.reason}. Your booking remains open. No cancellation charge has been applied.`, 'booking_update');
        if (!booking.gurujiId) {
          const excluded = (await client.query(`SELECT "gurujiId" FROM booking_requests WHERE "bookingId"=$1 AND status='declined'`,[bookingId])).rows;
          await dispatchReplacement(client,booking,excluded.map((r:any)=>r.gurujiId));
        }
      }
      await client.query(`UPDATE notifications SET "isRead"=true WHERE type='cancellation_request'
        AND message LIKE $1`, [`Booking #${booking.id}: cancellation request #${event.id}.%`]);
    } else {
      if (actor === 'admin') {
        if (!['cancel','reassign'].includes(action)) throw fail(400, 'Invalid cancellation action');
        party = input.chargeParty || 'none';
        if (!['none','customer','guruji'].includes(party)) throw fail(400, 'Invalid charge party');
        if (party === 'guruji' && !booking.gurujiId) throw fail(409, 'No assigned Guruji to charge');
        quote = await cancellationQuote(client, booking, party === 'none' ? 'admin' : party);
        if(party!=='none' && input.chargeOverride===undefined && input.quoteToken && input.quoteToken!==quote.quoteToken)
          throw fail(409,'The cancellation quote changed. Review the updated charge before confirming.');
        charge = input.chargeOverride ?? quote.charge;
        if (party === 'none' && charge) throw fail(400, 'Select who is responsible for a non-zero charge');
        kind = action === 'reassign' ? 'admin_reassignment' : 'admin_cancel';
      }
      const event = (await client.query(`INSERT INTO booking_cancellation_events
        (booking_id,requested_by,user_type,kind,status,reason,charge,quote,previous_guruji_id,reviewed_by,reviewed_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [bookingId,userId,party,kind,'recorded',input.reason,charge,
          JSON.stringify(quote),booking.gurujiId,actor === 'admin' ? userId : null,actor === 'admin' ? new Date() : null])).rows[0];
      eventId = event.id;
      if (actor === 'customer') {
        await closeBooking(client, booking, input.reason, party, charge, 'customer');
        await client.query(`UPDATE booking_cancellation_events SET status='superseded',reviewed_by=$2,
          review_reason='Customer cancelled directly',reviewed_at=NOW()
          WHERE booking_id=$1 AND kind='customer_request' AND status='pending'`, [bookingId,userId]);
      } else if (actor === 'guruji' || action === 'reassign') {
        const oldGuruji = booking.gurujiId;
        await client.query(`UPDATE booking_requests SET status=$2,message=$3,"updatedAt"=NOW()
          WHERE "bookingId"=$1 AND status IN ('accepted','pending') AND "gurujiId"=$4`,
          [bookingId,actor === 'guruji' ? 'declined' : 'cancelled',input.reason,oldGuruji]);
        await client.query(`UPDATE bookings SET "gurujiId"=NULL,status='pending',"updatedAt"=NOW() WHERE id=$1`, [bookingId]);
        await client.query(`UPDATE booking_completion_challenges SET started_at=NULL,requested_at=NULL,
          code_cipher=NULL,otp_digest=NULL WHERE booking_id=$1`,[bookingId]);
        const declines = (await client.query(`SELECT "gurujiId" FROM booking_requests WHERE "bookingId"=$1 AND status='declined'`, [bookingId])).rows;
        const searchPaused=input.searchOthers===false || Boolean(quote.pendingRequestId) || quote.hoursUntil<=0;
        const replacementCount = searchPaused ? 0 : await dispatchReplacement(client, booking,
          [oldGuruji,...declines.map((r: any) => r.gurujiId)].filter(Boolean));
        if (searchPaused) await notify(client, await admins(client), 'Unassigned Puja Request',
          `Booking #${bookingId}: reassignment required. Automatic search is paused${quote.pendingRequestId ? ' while a customer cancellation request is under review' : quote.hoursUntil<=0 ? ' because the scheduled start has passed; review the schedule' : ' by admin'}. Review Unassigned bookings.`, 'unassigned_booking');
        await notify(client, [booking.customerId,...await admins(client)], 'Guruji Reassignment Required',
        `Booking #${bookingId}: the assigned Guruji was released. Reason: ${input.reason}. The booking is NOT cancelled. ${replacementCount} replacement request(s) sent; the Vaidik Dhara support team can manage reassignment.`, 'guruji_withdrawal');
      } else {
        await closeBooking(client, booking, input.reason, party, charge);
        await client.query(`UPDATE booking_cancellation_events SET status='superseded',reviewed_by=$2,
          review_reason=$3,reviewed_at=NOW() WHERE booking_id=$1 AND status='pending'`, [bookingId,userId,input.reason]);
      }
    }
    if (charge && actor !== 'customer' && !['reject','review_withdrawal'].includes(action)) {
      const recipient = party === 'customer' ? booking.customerId : party === 'guruji' && booking.gurujiId
        ? (await client.query('SELECT "userId" FROM guruji_profiles WHERE id=$1', [booking.gurujiId])).rows[0]?.userId : null;
      if (recipient) await notify(client, [recipient], 'Cancellation Charge Recorded',
        `Booking #${bookingId}: ${party} charge ₹${charge} recorded. Payments are disabled; no money has been deducted.`, 'cancellation_charge');
    }
    await client.query('COMMIT');
    return { eventId, charge, action, customerFunds: quote.customerFunds, message: actor === 'customer'
      ? `Booking cancelled. Refund owed: ₹${quote.customerFunds?.refundOwed ?? 0}. Any refund requires admin approval.`
      : action === 'withdraw' || action === 'reassign' ? 'Booking reopened for reassignment; not cancelled'
      : action === 'reject' ? 'Cancellation request rejected; booking remains open'
      : action === 'review_withdrawal' ? 'Withdrawal charge reviewed; booking unchanged' : 'Booking cancelled by the support team' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
