import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { PoolClient } from '@neondatabase/serverless';
import { pool } from './db';

export type CompletionActor = { id: number; role: string };
type Action = 'start' | 'request' | 'verify' | 'override';
const EXPIRY_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is required for secure completion codes');
  return createHash('sha256').update(`puja-completion-v1:${secret}`).digest();
}
function encrypt(code: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64')).join('.');
}
function decrypt(value: string) {
  const [iv, tag, data] = value.split('.').map(part => Buffer.from(part, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
function digest(bookingId: number, code: string) {
  return createHmac('sha256', key()).update(`${bookingId}:${code}`).digest();
}

export async function initializeBookingCompletion() {
  key(); // Fail explicitly if the encryption secret is not configured.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_completion_challenges (
      booking_id integer PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
      code_cipher text, otp_digest text,
      requested_at timestamptz, expires_at timestamptz,
      attempt_count integer NOT NULL DEFAULT 0,
      verified_at timestamptz, started_at timestamptz, completed_at timestamptz,
      completion_method text
    );
    CREATE TABLE IF NOT EXISTS booking_completion_events (
      id serial PRIMARY KEY,
      booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      actor_user_id integer REFERENCES users(id) ON DELETE SET NULL,
      actor_role text NOT NULL, action text NOT NULL, reason text,
      created_at timestamptz NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS booking_completion_events_booking_idx
      ON booking_completion_events(booking_id, created_at DESC, id DESC);
    ALTER TABLE booking_completion_challenges ADD COLUMN IF NOT EXISTS admin_shared_with_guruji_at timestamptz;
  `);
}

function allowed(booking: any, actor: CompletionActor) {
  return actor.role === 'admin' ||
    (actor.role === 'customer' && booking.customerId === actor.id) ||
    (actor.role === 'guruji' && booking.gurujiUserId === actor.id);
}
async function bookingRecord(client: Pick<PoolClient, 'query'>, id: number, lock = false) {
  const result = await client.query(
    `SELECT b.*, g."userId" AS "gurujiUserId"
     FROM bookings b LEFT JOIN guruji_profiles g ON g.id=b."gurujiId"
     WHERE b.id=$1 ${lock ? 'FOR UPDATE OF b' : ''}`, [id]);
  return result.rows[0];
}
function metadata(booking: any, challenge: any) {
  return {
    bookingId: booking.id, status: booking.status,
    requestedAt: challenge?.requested_at ?? null,
    expiresAt: challenge?.expires_at ?? null,
    canResendAt: challenge?.requested_at ? new Date(new Date(challenge.requested_at).getTime() + COOLDOWN_MS) : null,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - (challenge?.attempt_count ?? 0)),
    verifiedAt: challenge?.verified_at ?? null,
    startedAt: challenge?.started_at ?? null,
    completedAt: challenge?.completed_at ?? null,
    completionMethod: challenge?.completion_method ?? null,
    adminSharedWithGurujiAt: challenge?.admin_shared_with_guruji_at ?? null,
  };
}
async function event(client: PoolClient, id: number, actor: CompletionActor, action: string, reason?: string) {
  await client.query(
    `INSERT INTO booking_completion_events (booking_id,actor_user_id,actor_role,action,reason)
     VALUES ($1,$2,$3,$4,$5)`, [id, actor.id, actor.role, action, reason ?? null]);
}
async function notify(client: PoolClient, userIds: Array<number | null>, title: string, message: string) {
  for (const id of Array.from(new Set(userIds.filter((id): id is number => !!id)))) {
    await client.query(
      `INSERT INTO notifications ("userId",title,message,type,"isRead","createdAt")
       VALUES ($1,$2,$3,'booking_update',false,NOW())`, [id, title, message]);
  }
}

export async function getBookingCompletion(id: number, actor: CompletionActor) {
  // Read the booking, code and audit from one consistent database snapshot.
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const user = (await client.query('SELECT role FROM users WHERE id=$1', [actor.id])).rows[0];
    if (!user || user.role !== actor.role) {
      await client.query('COMMIT');
      return { status: 403, body: { message: 'Your account authorization has changed. Please sign in again.' } };
    }
    const booking = await bookingRecord(client, id);
    if (!booking) { await client.query('COMMIT'); return { status: 404, body: { message: 'Booking not found' } }; }
    if (!allowed(booking, actor)) { await client.query('COMMIT'); return { status: 403, body: { message: 'Forbidden' } }; }
    const challenge = (await client.query('SELECT * FROM booking_completion_challenges WHERE booking_id=$1', [id])).rows[0];
    const body: any = metadata(booking, challenge);
    if ((actor.role === 'customer' || (actor.role === 'guruji' && challenge?.admin_shared_with_guruji_at)) &&
        booking.status === 'in_progress' && challenge?.code_cipher &&
        !challenge.completed_at && challenge.attempt_count < MAX_ATTEMPTS &&
        new Date(challenge.expires_at).getTime() > Date.now()) {
      body.otp = decrypt(challenge.code_cipher);
    }
    if (actor.role === 'admin') {
      body.history = (await client.query(
        `SELECT e.id,e.action,e.actor_role AS "actorRole",e.actor_user_id AS "actorUserId",
                NULLIF(concat_ws(' ',u."firstName",u."lastName"),'') AS "actorName",
                e.reason,e.created_at AS "createdAt"
         FROM booking_completion_events e LEFT JOIN users u ON u.id=e.actor_user_id
         WHERE e.booking_id=$1 ORDER BY e.created_at DESC,e.id DESC LIMIT 100`, [id])).rows;
    }
    await client.query('COMMIT');
    return { status: 200, body };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function changeBookingCompletion(id: number, actor: CompletionActor, action: Action, input: { otp?: string; reason?: string; resend?: boolean } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const booking = await bookingRecord(client, id, true);
    const finish = async (status: number, body: any) => { await client.query('COMMIT'); return { status, body }; };
    const user = (await client.query('SELECT role FROM users WHERE id=$1', [actor.id])).rows[0];
    if (!user || user.role !== actor.role) return await finish(403, { message: 'Your account authorization has changed. Please sign in again.' });
    if (!booking) return await finish(404, { message: 'Booking not found' });
    if (!allowed(booking, actor)) return await finish(403, { message: 'Forbidden' });
    if ((action === 'start' && !['admin', 'guruji'].includes(actor.role)) ||
        (action === 'verify' && actor.role !== 'guruji') ||
        (action === 'override' && actor.role !== 'admin')) {
      return await finish(403, { message: 'Forbidden' });
    }
    if (action === 'start') {
      if (booking.status !== 'confirmed') return await finish(409, { message: 'Only an accepted booking can be started' });
      const cancellationPending = (await client.query(`SELECT id FROM booking_cancellation_events
        WHERE booking_id=$1 AND kind='customer_request' AND status='pending'`,[id])).rows.length>0;
      if (cancellationPending && actor.role!=='admin') return await finish(409,{
        message:'The Sanatan Guruji support team must review the pending cancellation request before this puja starts.',
      });
      const accepted = await client.query(
        `SELECT id FROM booking_requests WHERE "bookingId"=$1 AND "gurujiId"=$2 AND status='accepted' LIMIT 1`,
        [id, booking.gurujiId]);
      if (!booking.gurujiId || !accepted.rowCount) return await finish(409, { message: 'The assigned Guruji must genuinely accept before starting' });
      await client.query(`UPDATE bookings SET status='in_progress',"updatedAt"=NOW() WHERE id=$1`, [id]);
      await client.query(
        `INSERT INTO booking_completion_challenges (booking_id,started_at) VALUES ($1,NOW())
         ON CONFLICT (booking_id) DO UPDATE SET started_at=COALESCE(booking_completion_challenges.started_at,NOW())`, [id]);
      await event(client, id, actor, 'puja_started');
      await notify(client, [booking.customerId, booking.gurujiUserId], 'Puja started', `Booking #${id} is now in progress. No start OTP is required.`);
      booking.status = 'in_progress';
    } else {
      if (booking.status !== 'in_progress') return await finish(409, { message: 'Completion verification is available only for an in-progress puja' });
      await client.query(`INSERT INTO booking_completion_challenges (booking_id) VALUES ($1) ON CONFLICT DO NOTHING`, [id]);
      const challenge = (await client.query(`SELECT * FROM booking_completion_challenges WHERE booking_id=$1 FOR UPDATE`, [id])).rows[0];
      const now = Date.now();
      if (action === 'request') {
        const valid = challenge.code_cipher && new Date(challenge.expires_at).getTime() > now && challenge.attempt_count < MAX_ATTEMPTS;
        if (valid && !input.resend) return await finish(200, metadata(booking, challenge));
        if (actor.role !== 'admin' && challenge.requested_at && now < new Date(challenge.requested_at).getTime() + COOLDOWN_MS) {
          return await finish(429, { message: 'Please wait 60 seconds between code requests', ...metadata(booking, challenge) });
        }
        const code = randomInt(0, 1000000).toString().padStart(6, '0');
        // Force a replacement code to differ from the previous one.
        const sameCode = challenge.otp_digest === digest(id, code).toString('hex');
        const nextCode = sameCode ? ((Number(code) + 1) % 1000000).toString().padStart(6, '0') : code;
        await client.query(
          `UPDATE booking_completion_challenges SET code_cipher=$2,otp_digest=$3,requested_at=NOW(),
            expires_at=NOW()+INTERVAL '10 minutes',attempt_count=0,verified_at=NULL,admin_shared_with_guruji_at=NULL WHERE booking_id=$1`,
          [id, encrypt(nextCode), digest(id, nextCode).toString('hex')]);
        await event(client, id, actor, challenge.requested_at ? 'completion_code_resent' : 'completion_code_requested');
        await notify(client, [booking.customerId], 'Puja completion code ready',
          `Open My Bookings for booking #${id} to see your completion OTP. Share it with your Guruji only after the ceremony has finished. It expires in 10 minutes.`);
      } else if (action === 'verify') {
        if (!challenge.otp_digest || !challenge.code_cipher) return await finish(409, { message: 'Request a completion code from the customer first' });
        if (challenge.attempt_count >= MAX_ATTEMPTS) return await finish(429, { message: 'This code is locked after five incorrect attempts. Request a new code.' });
        if (new Date(challenge.expires_at).getTime() <= now) return await finish(410, { message: 'The completion code has expired. Request a new code.' });
        const stored = Buffer.from(challenge.otp_digest, 'hex');
        const submitted = digest(id, input.otp || '');
        if (stored.length !== submitted.length || !timingSafeEqual(stored, submitted)) {
          const attempts = challenge.attempt_count + 1;
          await client.query(`UPDATE booking_completion_challenges SET attempt_count=$2 WHERE booking_id=$1`, [id, attempts]);
          await event(client, id, actor, attempts >= MAX_ATTEMPTS ? 'completion_code_locked' : 'completion_code_incorrect');
          return await finish(attempts >= MAX_ATTEMPTS ? 429 : 400, {
            message: attempts >= MAX_ATTEMPTS ? 'Code locked after five incorrect attempts. Request a new code.' : `Incorrect completion code. ${MAX_ATTEMPTS - attempts} attempts remaining.`,
          });
        }
        await client.query(
          `UPDATE booking_completion_challenges SET verified_at=NOW(),completed_at=NOW(),
            completion_method=$2,code_cipher=NULL,otp_digest=NULL WHERE booking_id=$1`,
          [id, challenge.admin_shared_with_guruji_at ? 'admin_shared_otp' : 'customer_otp']);
        await event(client, id, actor, 'completion_otp_verified');
      } else if (action === 'override') {
        if (!input.reason || input.reason.trim().length < 10) return await finish(400, { message: 'An override reason of at least 10 characters is required' });
        await client.query(
          `UPDATE booking_completion_challenges SET completed_at=NOW(),completion_method='admin_override',
           code_cipher=NULL,otp_digest=NULL WHERE booking_id=$1`, [id]);
        await event(client, id, actor, 'completion_admin_override', input.reason.trim());
      }
      if (action === 'verify' || action === 'override') {
        await client.query(`UPDATE bookings SET status='completed',"updatedAt"=NOW() WHERE id=$1`, [id]);
        booking.status = 'completed';
        await notify(client, [booking.customerId, booking.gurujiUserId], 'Puja completed',
          `Booking #${id} was completed ${action === 'verify' ? challenge.admin_shared_with_guruji_at ? 'using an OTP shared by the Sanatan Guruji support team (independent customer confirmation bypassed)' : 'using the customer’s completion OTP' : 'manually by the Sanatan Guruji support team (not OTP verified)'}.`);
      }
    }
    const finalChallenge = (await client.query(`SELECT * FROM booking_completion_challenges WHERE booking_id=$1`, [id])).rows[0];
    return await finish(200, metadata(booking, finalChallenge));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export function readCompletionCode(challenge: any) {
  if (!challenge?.code_cipher || challenge.completed_at || challenge.attempt_count >= MAX_ATTEMPTS ||
      !challenge.expires_at || new Date(challenge.expires_at).getTime() <= Date.now()) return null;
  return decrypt(challenge.code_cipher);
}