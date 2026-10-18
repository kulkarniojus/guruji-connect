import { pool } from '../server/db';
import { DBStorage } from '../server/dbStorage';
import { getBusyGurujiIds } from '../server/bookingSchedule';
import { hoursBeforeBooking } from '../server/cancellationPolicy';

// Explicit, idempotent repair for an existing automatic-search booking.
// Never reopen declined requests or override an admin cancellation/reassignment.
const id=Number(process.argv[2]);
if(!Number.isSafeInteger(id)||id<=0) throw new Error('Provide a positive booking ID');
const storage=new DBStorage();
const client=await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(8158,$1)',[id]);
  const booking=(await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!booking || booking.gurujiId || !['pending','pending_approval'].includes(booking.status))
    throw new Error('Only an active unassigned booking can be repaired');
  if(hoursBeforeBooking(booking)<=0) throw new Error('Do not send requests for an elapsed schedule');
  const decisions=await client.query(`SELECT id FROM booking_cancellation_events WHERE booking_id=$1
    AND (status='pending' OR kind IN ('admin_reassignment','admin_cancel'))`,[id]);
  if(decisions.rows.length) throw new Error('Support-team review or reassignment must not be overridden');
  const previous=(await client.query('SELECT "gurujiId" FROM booking_requests WHERE "bookingId"=$1',[id])).rows;
  if(!previous.length) throw new Error('Confirm original automatic-search intent before repairing a booking with no requests');
  const alreadyRequested=new Set(previous.map(r=>r.gurujiId));
  const nearby=await storage.getNearbyGurujis(booking.city||'',booking.pujaId,20,booking.pincode);
  const busy=await getBusyGurujiIds(nearby.map(g=>g.id),new Date(booking.date).toISOString().slice(0,10),booking.time,booking.duration??0);
  const missing=nearby.filter(g=>g.aadharVerified&&g.documentsVerified&&!busy.has(g.id)&&!alreadyRequested.has(g.id));
  for(const guruji of missing) {
    await client.query(`INSERT INTO booking_requests ("bookingId","gurujiId",status,"createdAt","updatedAt")
      VALUES ($1,$2,'pending',NOW(),NOW())`,[id,guruji.id]);
    await client.query(`INSERT INTO notifications ("userId",title,message,type,"isRead","createdAt")
      VALUES ($1,'New Puja Request',$2,'booking_request',false,NOW())`,
      [guruji.userId,`Booking #${id}: new puja request in ${booking.city}. Open your booking requests to accept or decline.`]);
  }
  if(missing.length) await client.query(`UPDATE bookings SET status='pending_approval',"updatedAt"=NOW() WHERE id=$1`,[id]);
  await client.query('COMMIT');
  console.log(JSON.stringify({bookingId:id,additionalRequestsAndNotifications:missing.length}));
} catch(error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
