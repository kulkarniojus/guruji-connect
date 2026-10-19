import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db';
import { logger } from './lib/logger';
import { isAuthenticated } from './middlewares/auth';

// Separate, additive tables: no changes to booking, notification or acceptance rules.
// The trigger only queues deliveries for devices already opted in at request creation.
export async function initializeGurujiPush() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guruji_push_devices (
      id SERIAL PRIMARY KEY,
      installation_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      platform TEXT NOT NULL CHECK (platform IN ('ios','android')),
      project_id UUID NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS guruji_push_deliveries (
      id BIGSERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
      device_id INTEGER NOT NULL REFERENCES guruji_push_devices(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      token TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      ticket_id TEXT,
      receipt_checked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      attempted_at TIMESTAMPTZ,
      UNIQUE(request_id,device_id)
    );
    CREATE INDEX IF NOT EXISTS guruji_push_queued_idx ON guruji_push_deliveries(status,created_at);
    CREATE OR REPLACE FUNCTION queue_guruji_request_push() RETURNS trigger AS $$
    BEGIN
      IF NEW.status='pending' THEN
        INSERT INTO guruji_push_deliveries(request_id,device_id,user_id,session_id,token)
        SELECT NEW.id,d.id,d.user_id,d.session_id,d.token
        FROM guruji_push_devices d
        JOIN guruji_profiles g ON g."userId"=d.user_id AND g.id=NEW."gurujiId"
        JOIN users u ON u.id=d.user_id AND u.role='guruji' AND NOT COALESCE(u."isBlocked",FALSE)
        JOIN user_sessions s ON s.sid=d.session_id AND s.expire>NOW()
          AND (s.sess->>'userId')=d.user_id::text
        WHERE d.enabled
        ON CONFLICT(request_id,device_id) DO NOTHING;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='guruji_request_push_insert') THEN
        CREATE TRIGGER guruji_request_push_insert AFTER INSERT ON booking_requests
          FOR EACH ROW EXECUTE FUNCTION queue_guruji_request_push();
      END IF;
    END $$;
  `);
}

const installationId = z.string().regex(/^[a-zA-Z0-9_-]{20,100}$/);
const deviceInput = z.object({
  installationId,
  token: z.string().max(250).regex(/^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/),
  platform: z.enum(['android','ios']),
  projectId: z.string().uuid(),
  accountId:z.number().int().positive(),
}).strict();

export const gurujiPushRouter = Router();
gurujiPushRouter.use(isAuthenticated);
// Prevent cross-origin writes while allowing native WebView's first-party fetch.
gurujiPushRouter.use((req,res,next) => {
  res.setHeader('Cache-Control','no-store');
  if (req.session.userRole !== 'guruji') return res.status(403).json({message:'Guruji login required'});
  if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({message:'First-party portal request required'});
  return next();
});
gurujiPushRouter.put('/', async (req,res) => {
  const parsed = deviceInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({message:'Invalid mobile notification registration'});
  const d = parsed.data;
  if(d.accountId!==req.session.userId)return res.status(409).json({message:'Your account changed. Please enable alerts again.'});
  try {
    // The same installation can follow an account switch; the worker also checks
    // session, owner AND token snapshots, so its former owner's alerts are suppressed.
    await pool.query(`INSERT INTO guruji_push_devices
      (installation_id,user_id,session_id,token,platform,project_id)
      VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(installation_id) DO UPDATE SET
        user_id=EXCLUDED.user_id,session_id=EXCLUDED.session_id,token=EXCLUDED.token,
        platform=EXCLUDED.platform,project_id=EXCLUDED.project_id,enabled=TRUE,updated_at=NOW()`,
      [d.installationId,req.session.userId,req.sessionID,d.token,d.platform,d.projectId]);
    return res.json({enabled:true});
  } catch (error) {
    // Never log device tokens, sessions or request bodies.
    const conflict = (error as {code?:string}).code==='23505';
    return res.status(conflict?409:503).json({message:conflict
      ?'This device token is already registered. Reopen the app and try again.'
      :'Unable to register alerts. Please try again.'});
  }
});
gurujiPushRouter.delete('/',async(req,res) => {
  const parsed = z.object({installationId}).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({message:'Invalid device'});
  try {
    await pool.query(`UPDATE guruji_push_devices SET enabled=FALSE,updated_at=NOW()
      WHERE installation_id=$1 AND user_id=$2 AND session_id=$3`,
      [parsed.data.installationId,req.session.userId,req.sessionID]);
    return res.json({enabled:false});
  } catch { return res.status(503).json({message:'Unable to disable alerts. Please try again.'}); }
});

type Delivery = {id:string; token:string; request_id:number; device_id:number; booking_id:number;user_id:number};
type PushTicket = {status:'ok'|'error';id?:string;details?:{error?:string}};
export function gurujiPushMessage(d: Delivery) {
  return {
    to:d.token, sound:'default', priority:'high', channelId:'guruji-puja-requests',
    title:'New puja request',
    body:'A puja request is waiting for you. Open Sanatan Guruji to accept or decline.',
    ttl:300,
    data:{type:'guruji_puja_request',requestId:d.request_id,bookingId:d.booking_id,userId:d.user_id},
  };
}
type Send = (messages:ReturnType<typeof gurujiPushMessage>[])=>Promise<PushTicket[]>;
async function sendToExpo(messages:ReturnType<typeof gurujiPushMessage>[]):Promise<PushTicket[]> {
  const response=await fetch('https://exp.host/--/api/v2/push/send',{
    method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify(messages),signal:AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Push provider rejected the batch');
  const result=await response.json() as {data?:PushTicket[]};
  if (!Array.isArray(result.data) || result.data.length!==messages.length) throw new Error('Invalid push provider response');
  return result.data;
}

// Claim once before contacting Expo. An ambiguous network failure is NOT retried:
// avoiding repeated alarming notifications is more important than a duplicate retry.
// Expo/APNs/FCM remain best-effort services; "sent" means provider accepted, not device delivery.
export async function dispatchGurujiPush(send:Send=sendToExpo,database=pool) {
  const client=await database.connect();
  let rows:Delivery[]=[];
  try {
    await client.query('BEGIN');
    const claimed=await client.query(`SELECT q.id,q.token,q.request_id,q.device_id,q.user_id,b.id AS booking_id
      FROM guruji_push_deliveries q
      JOIN guruji_push_devices d ON d.id=q.device_id AND d.enabled
        AND d.user_id=q.user_id AND d.session_id=q.session_id AND d.token=q.token
      JOIN user_sessions s ON s.sid=d.session_id AND s.expire>NOW()
        AND s.sess->>'userId'=d.user_id::text
      JOIN users u ON u.id=d.user_id AND u.role='guruji' AND NOT COALESCE(u."isBlocked",FALSE)
      JOIN booking_requests r ON r.id=q.request_id AND r.status='pending'
      JOIN guruji_profiles g ON g.id=r."gurujiId" AND g."userId"=d.user_id
      JOIN bookings b ON b.id=r."bookingId" AND b.status IN ('pending','pending_approval')
      WHERE q.status='queued' AND q.created_at>NOW()-INTERVAL '5 minutes'
      ORDER BY q.id LIMIT 50 FOR UPDATE OF q SKIP LOCKED`);
    rows=claimed.rows;
    if (rows.length) await client.query(`UPDATE guruji_push_deliveries SET status='attempted',attempted_at=NOW()
      WHERE id=ANY($1::bigint[])`,[rows.map(d=>d.id)]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK');throw error; }
  finally { client.release(); }
  if (!rows.length) return 0;
  try {
    const tickets=await send(rows.map(gurujiPushMessage));
    for(let i=0;i<rows.length;i++) {
      const ticket=tickets[i];
      await database.query(`UPDATE guruji_push_deliveries SET status=$2,ticket_id=$3 WHERE id=$1`,
        [rows[i].id,ticket?.status==='ok'?'sent':'failed',ticket?.id??null]);
      if(ticket?.details?.error==='DeviceNotRegistered') await database.query(
        `UPDATE guruji_push_devices SET enabled=FALSE WHERE id=$1 AND token=$2`,[rows[i].device_id,rows[i].token]);
    }
  } catch {
    await database.query(`UPDATE guruji_push_deliveries SET status='unknown' WHERE id=ANY($1::bigint[])`,
      [rows.map(d=>d.id)]);
    logger.warn('Guruji push batch could not be confirmed; not retried to avoid duplicate alerts');
  }
  return rows.length;
}

async function reconcileReceipts() {
  const {rows}=await pool.query(`SELECT id,ticket_id,device_id,token FROM guruji_push_deliveries
    WHERE status='sent' AND NOT receipt_checked AND ticket_id IS NOT NULL
      AND attempted_at<NOW()-INTERVAL '15 minutes' AND attempted_at>NOW()-INTERVAL '24 hours'
    ORDER BY id LIMIT 100`);
  if(!rows.length)return;
  const response=await fetch('https://exp.host/--/api/v2/push/getReceipts',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ids:rows.map(r=>r.ticket_id)}),signal:AbortSignal.timeout(15000),
  });
  if(!response.ok)return;
  const result=await response.json() as {data?:Record<string,PushTicket>};
  for(const row of rows) {
    const receipt=result.data?.[row.ticket_id];
    if(!receipt)continue;
    await pool.query(`UPDATE guruji_push_deliveries SET receipt_checked=TRUE,status=$2 WHERE id=$1`,
      [row.id,receipt.status==='ok'?'sent':'failed']);
    if(receipt.details?.error==='DeviceNotRegistered')await pool.query(
      'UPDATE guruji_push_devices SET enabled=FALSE WHERE id=$1 AND token=$2',[row.device_id,row.token]);
  }
}
let timer:ReturnType<typeof setInterval>|undefined;
export function startGurujiPushWorker() {
  if(timer)return;
  let busy=false,tick=0;
  timer=setInterval(async()=>{
    if(busy)return;
    busy=true;
    try {
      await dispatchGurujiPush();
      if(++tick%60===0) {
        await reconcileReceipts();
        await pool.query(`UPDATE guruji_push_deliveries SET status='skipped'
          WHERE status='queued' AND created_at<NOW()-INTERVAL '5 minutes'`);
        await pool.query("DELETE FROM guruji_push_deliveries WHERE created_at<NOW()-INTERVAL '7 days'");
        await pool.query("DELETE FROM guruji_push_devices WHERE updated_at<NOW()-INTERVAL '30 days'");
      }
    } catch {logger.warn('Guruji push worker unavailable; existing portal notifications remain unchanged');}
    finally {busy=false;}
  },5000);
  timer.unref();
}
