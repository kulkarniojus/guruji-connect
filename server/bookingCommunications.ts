import { pool } from './db';
import { changeBookingCompletion, readCompletionCode } from './bookingCompletion';
import { redactPhoneText } from './bookingPrivacy';

export async function initializeBookingCommunications() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_address_releases (
      booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      guruji_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_user_id integer REFERENCES users(id) ON DELETE SET NULL,
      released_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (booking_id,guruji_user_id)
    );
    CREATE TABLE IF NOT EXISTS booking_communications (
      id serial PRIMARY KEY,
      booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      actor_user_id integer REFERENCES users(id) ON DELETE SET NULL,
      recipient_user_id integer REFERENCES users(id) ON DELETE SET NULL,
      recipient_role text NOT NULL, kind text NOT NULL, channel text NOT NULL,
      status text NOT NULL, title text NOT NULL, summary text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS booking_communications_booking_idx ON booking_communications(booking_id,created_at DESC);
  `);
}
export const communicationChannels = {
  in_app: { available: true },
  whatsapp: { available: false, reason: 'Connect WhatsApp Business to enable sending. No WhatsApp message has been sent.' },
  email: { available: false, reason: 'Connect an email sender to enable sending. No email has been sent.' },
};
export async function communicationHistory(id: number, client: Pick<typeof pool, 'query'> = pool) {
  return (await client.query(
    `SELECT c.*, concat_ws(' ',u."firstName",u."lastName") AS "actorName"
     FROM booking_communications c LEFT JOIN users u ON u.id=c.actor_user_id
     WHERE c.booking_id=$1 ORDER BY c.created_at DESC,c.id DESC LIMIT 100`, [id])).rows;
}
export async function adminBookingParticipants(id: number) {
  return (await pool.query(
    `SELECT b.*,c.id AS customer_user_id,c."firstName" AS customer_first,c."lastName" AS customer_last,
      c.email AS customer_email,c.mobile AS customer_mobile,g."userId" AS guruji_user_id,
      u."firstName" AS guruji_first,u."lastName" AS guruji_last,u.email AS guruji_email,u.mobile AS guruji_mobile
     FROM bookings b JOIN users c ON c.id=b."customerId"
     LEFT JOIN guruji_profiles g ON g.id=b."gurujiId" LEFT JOIN users u ON u.id=g."userId"
     WHERE b.id=$1`, [id])).rows[0];
}
export type CommunicationInput = {
  recipient: 'customer' | 'guruji' | 'both';
  kind: 'address' | 'otp' | 'notification' | 'message';
  channel: 'in_app' | 'whatsapp' | 'email';
  title?: string;
  text?: string;
};
export async function sendBookingCommunication(id: number, adminId: number, input: CommunicationInput) {
  const user = (await pool.query('SELECT role FROM users WHERE id=$1', [adminId])).rows[0];
  if (user?.role !== 'admin') return { status: 403, body: { message: 'Forbidden' } };
  if (!communicationChannels[input.channel].available) return {
    status: 503, body: { message: (communicationChannels[input.channel] as { reason: string }).reason },
  };
  if (redactPhoneText(input.title || '') !== (input.title || '') ||
      redactPhoneText(input.text || '') !== (input.text || '')) {
    return { status: 400, body: { message: 'Phone numbers cannot be shared with booking participants. Remove the phone number and retry.' } };
  }
  const initial = await adminBookingParticipants(id);
  if (!initial) return { status: 404, body: { message: 'Booking not found' } };
  if (input.recipient !== 'customer' && !initial.guruji_user_id) return {
    status: 409, body: { message: 'There is no assigned Guruji for this booking. Select the customer instead.' },
  };
  if (input.kind === 'otp') {
    const ready = await changeBookingCompletion(id, { id: adminId, role: 'admin' }, 'request');
    if (ready.status !== 200) return ready;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const finish = async (status: number, body: any) => { await client.query('COMMIT'); return { status, body }; };
    const booking = (await client.query(
      `SELECT b.*,g."userId" AS guruji_user_id FROM bookings b
       LEFT JOIN guruji_profiles g ON g.id=b."gurujiId" WHERE b.id=$1 FOR UPDATE OF b`, [id])).rows[0];
    if (!booking) return await finish(404, { message: 'Booking not found' });
    if (input.recipient !== 'customer' && !booking.guruji_user_id) return await finish(409, { message: 'The assigned Guruji is no longer available.' });
    const recipients: Array<{ role: string; id: number }> = [];
    if (input.recipient !== 'guruji') recipients.push({ role: 'customer', id: booking.customerId });
    if (input.recipient !== 'customer') recipients.push({ role: 'guruji', id: booking.guruji_user_id });
    const title = input.title?.trim() || `Booking #${id}: ${input.kind === 'address' ? 'exact address' : input.kind === 'otp' ? 'completion OTP' : input.kind}`;
    let message = input.text?.trim() || '';
    let summary = message;
    if (input.kind === 'address') {
      if (!booking.address?.trim()) return await finish(409, { message: 'This booking has no exact address to send.' });
      message = `Booking #${id} exact address: ${[booking.address, booking.city, booking.state, booking.pincode].filter(Boolean).join(', ')}. Shared by admin.`;
      summary = message;
    } else if (input.kind === 'otp') {
      const challenge = (await client.query('SELECT * FROM booking_completion_challenges WHERE booking_id=$1 FOR UPDATE', [id])).rows[0];
      if (booking.status !== 'in_progress' || !readCompletionCode(challenge)) return await finish(409, { message: 'The completion code is no longer active. Request a new code and retry.' });
      // Keep the code encrypted in challenge storage. The notification directs each
      // authorized recipient to its live, expiring code in the booking screen.
      const expiry = new Date(challenge.expires_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      message = `Admin shared your completion OTP for booking #${id}. Open the booking details to view it. Share or use it only after the ceremony has finished. Valid until ${expiry} IST.`;
      summary = 'Completion OTP access sent; the code is not stored in the audit history.';
      if (recipients.some(r => r.role === 'guruji')) {
        await client.query('UPDATE booking_completion_challenges SET admin_shared_with_guruji_at=NOW() WHERE booking_id=$1', [id]);
        await client.query(
          `INSERT INTO booking_completion_events (booking_id,actor_user_id,actor_role,action,reason)
           VALUES ($1,$2,'admin','completion_code_shared_with_guruji','Admin provided code access to the Guruji; independent customer confirmation is bypassed.')`, [id, adminId]);
      }
    } else if (!message) return await finish(400, { message: 'Enter a message to send.' });
    // Admin controls must not accidentally undo the mutual phone-number restriction.
    if (redactPhoneText(message) !== message || redactPhoneText(title) !== title) {
      return await finish(400, { message: 'Phone numbers cannot be shared with booking participants. Remove the phone number and retry.' });
    }
    for (const recipient of recipients) {
      await client.query(
        `INSERT INTO notifications ("userId",title,message,type,"isRead","createdAt")
         VALUES ($1,$2,$3,'booking_update',false,NOW())`, [recipient.id, title, message]);
      await client.query(
        `INSERT INTO booking_communications
         (booking_id,actor_user_id,recipient_user_id,recipient_role,kind,channel,status,title,summary)
         VALUES ($1,$2,$3,$4,$5,$6,'sent',$7,$8)`,
        [id, adminId, recipient.id, recipient.role, input.kind, input.channel, title, summary]);
      if (input.kind === 'address' && recipient.role === 'guruji') await client.query(
        `INSERT INTO booking_address_releases (booking_id,guruji_user_id,actor_user_id)
         VALUES ($1,$2,$3) ON CONFLICT (booking_id,guruji_user_id)
         DO UPDATE SET actor_user_id=EXCLUDED.actor_user_id,released_at=NOW()`, [id, recipient.id, adminId]);
    }
    const history = await communicationHistory(id, client);
    return await finish(200, { message: `Sent in-app to ${recipients.map(r => r.role).join(' and ')}.`, history });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}