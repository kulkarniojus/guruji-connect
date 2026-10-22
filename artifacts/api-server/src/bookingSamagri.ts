import { Router, type RequestHandler, type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { pool } from './db';
import { isAuthenticated } from './middlewares/auth';
import { ObjectStorageService } from './lib/objectStorage';
import { logger } from './lib/logger';

const photoPath = /^\/api\/samagri\/images\/[0-9a-f-]{36}$/;
export const samagriItemSchema = z.object({
  name: z.string().trim().min(1).max(150),
  quantity: z.number().positive().max(100000),
  optional: z.boolean().default(false),
  price: z.number().min(0).max(1000000).default(0),
  unit: z.string().trim().max(40).optional(),
  imageUrl: z.string().regex(photoPath).or(z.literal('')).optional(),
});
export const samagriListSchema = z.array(samagriItemSchema).max(150);
export const whatsappSamagriReason = 'WhatsApp Business is not connected. No WhatsApp message has been sent.';
const storage = new ObjectStorageService();
const safe = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export async function initializeBookingSamagri() {
  await pool.query(`
    ALTER TABLE pujas ADD COLUMN IF NOT EXISTS samagri jsonb NOT NULL DEFAULT '[]'::jsonb;
    CREATE TABLE IF NOT EXISTS booking_samagri (
      booking_id integer PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
      puja_name text NOT NULL, items jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS samagri_deliveries (
      id bigserial PRIMARY KEY, booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      actor_id integer REFERENCES users(id) ON DELETE SET NULL,
      channel text NOT NULL, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS samagri_deliveries_booking ON samagri_deliveries(booking_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS samagri_images (
      id uuid PRIMARY KEY, object_path text NOT NULL UNIQUE,
      actor_id integer NOT NULL REFERENCES users(id), content_type text NOT NULL,
      completed boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE OR REPLACE FUNCTION snapshot_booking_samagri() RETURNS trigger AS $$
    DECLARE list jsonb; puja_title text;
    BEGIN
      SELECT coalesce(samagri,'[]'::jsonb),name INTO list,puja_title FROM pujas WHERE id=NEW."pujaId";
      IF puja_title IS NULL THEN RETURN NEW; END IF;
      INSERT INTO booking_samagri(booking_id,puja_name,items) VALUES(NEW.id,puja_title,list) ON CONFLICT DO NOTHING;
      IF jsonb_array_length(list)>0 THEN
        INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
        VALUES(NEW."customerId",'Your puja samagri list is ready',
          'View mandatory and optional items for '||puja_title||' in your booking: /booking/'||NEW.id,
          'booking',false,now());
        INSERT INTO samagri_deliveries(booking_id,channel,status)
        VALUES(NEW.id,'in_app','available'),(NEW.id,'whatsapp','not_connected');
      END IF;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS booking_samagri_insert ON bookings;
    CREATE TRIGGER booking_samagri_insert AFTER INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION snapshot_booking_samagri();
  `);
}

export async function readBookingSamagri(id: number, client: Pick<typeof pool, 'query'> = pool) {
  // Older bookings get their list on first access, without sending historical notifications.
  await client.query(`INSERT INTO booking_samagri(booking_id,puja_name,items)
    SELECT b.id,p.name,coalesce(p.samagri,'[]'::jsonb) FROM bookings b JOIN pujas p ON p.id=b."pujaId"
    WHERE b.id=$1 ON CONFLICT DO NOTHING`, [id]);
  const { rows } = await client.query('SELECT * FROM booking_samagri WHERE booking_id=$1', [id]);
  const history = (await client.query(`SELECT channel,status,created_at AS "createdAt" FROM samagri_deliveries
    WHERE booking_id=$1 ORDER BY created_at DESC,id DESC LIMIT 20`, [id])).rows;
  return { bookingId: id, pujaName: rows[0]?.puja_name ?? 'Puja', items: rows[0]?.items ?? [],
    whatsappStatus: 'not_connected', whatsappReason: whatsappSamagriReason, history };
}

export const bookingSamagriRouter = Router();
bookingSamagriRouter.use(['/bookings/:bookingId/samagri', '/admin/bookings/:bookingId/samagri', '/samagri'], isAuthenticated,
  (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET' && req.headers['sec-fetch-site'] === 'cross-site') { res.sendStatus(403); return; }
    next();
  });
bookingSamagriRouter.get('/bookings/:bookingId/samagri', safe(async (req, res) => {
  const id = Number(req.params.bookingId);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ message: 'Invalid booking' }); return; }
  const booking = (await pool.query('SELECT "customerId" FROM bookings WHERE id=$1', [id])).rows[0];
  if (!booking || (booking.customerId !== req.session.userId && req.session.userRole !== 'admin')) {
    res.status(404).json({ message: 'Booking not found' }); return;
  }
  res.json(await readBookingSamagri(id));
}));
bookingSamagriRouter.post('/admin/bookings/:bookingId/samagri/resend', safe(async (req, res) => {
  if (req.session.userRole !== 'admin') { res.sendStatus(403); return; }
  const id = Number(req.params.bookingId);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ message: 'Invalid booking' }); return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const booking = (await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!booking) { await client.query('ROLLBACK'); res.sendStatus(404); return; }
    if (['cancelled','rejected'].includes(booking.status)) {
      await client.query('ROLLBACK'); res.status(409).json({ message: 'Cannot resend for a cancelled booking' }); return;
    }
    // An explicit admin resend refreshes this booking from the latest saved list.
    await client.query(`INSERT INTO booking_samagri(booking_id,puja_name,items)
      SELECT b.id,p.name,coalesce(p.samagri,'[]'::jsonb) FROM bookings b JOIN pujas p ON p.id=b."pujaId"
      WHERE b.id=$1 ON CONFLICT(booking_id) DO UPDATE SET puja_name=excluded.puja_name,items=excluded.items`, [id]);
    const list = await readBookingSamagri(id, client);
    if (!list.items.length) {
      await client.query('ROLLBACK'); res.status(409).json({ message: 'Configure samagri for this puja first' }); return;
    }
    const recent = await client.query(`SELECT id FROM samagri_deliveries WHERE booking_id=$1
      AND actor_id IS NOT NULL AND created_at>now()-interval '1 minute' LIMIT 1`, [id]);
    if (recent.rowCount) { await client.query('ROLLBACK'); res.status(429).json({ message: 'Wait a minute before resending' }); return; }
    await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
      VALUES($1,'Your puja samagri list', $2,'booking',false,now())`,
      [booking.customerId, `The Sanatan Guruji support team resent your samagri list for ${list.pujaName}. View booking #${id} for mandatory and optional items.`]);
    await client.query(`INSERT INTO samagri_deliveries(booking_id,actor_id,channel,status)
      VALUES($1,$2,'in_app','resent'),($1,$2,'whatsapp','not_connected')`, [id, req.session.userId]);
    await client.query('COMMIT');
    res.json(await readBookingSamagri(id));
  } catch (error) {
    await client.query('ROLLBACK'); logger.error({ err: error }, 'Samagri resend failed');
    res.status(500).json({ message: 'Could not resend the samagri list' });
  } finally { client.release(); }
}));

bookingSamagriRouter.use('/samagri/uploads', (req, res, next) => {
  if (req.session.userRole !== 'admin') { res.sendStatus(403); return; } next();
});
bookingSamagriRouter.post('/samagri/uploads', async (req, res) => {
  const input = z.object({ name: z.string().min(1).max(200), size: z.number().int().positive().max(5*1024*1024),
    contentType: z.enum(['image/jpeg','image/png','image/webp']) }).safeParse(req.body);
  if (!input.success) { res.status(400).json({ message: 'Use a JPG, PNG or WebP image, maximum 5 MB' }); return; }
  try {
    const count = (await pool.query(`SELECT count(*)::int AS count FROM samagri_images
      WHERE actor_id=$1 AND created_at>now()-interval '1 hour'`, [req.session.userId])).rows[0].count;
    if (count >= 50) { res.status(429).json({ message: 'Photo upload limit reached. Please retry later.' }); return; }
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    const id = objectPath.split('/').pop()!;
    await pool.query('INSERT INTO samagri_images(id,object_path,actor_id,content_type) VALUES($1,$2,$3,$4)',
      [id, objectPath, req.session.userId, input.data.contentType]);
    res.json({ uploadURL, imageUrl: `/api/samagri/images/${id}` });
  } catch (error) { logger.error({ err: error }, 'Samagri upload unavailable'); res.status(503).json({ message: 'Photo storage is unavailable. Try again later.' }); }
});
bookingSamagriRouter.post('/samagri/uploads/complete', async (req, res) => {
  const parsed = z.object({ imageUrl: z.string().regex(photoPath) }).safeParse(req.body);
  if (!parsed.success) { res.sendStatus(400); return; }
  try {
    const id = parsed.data.imageUrl.split('/').pop();
    const image = (await pool.query('SELECT * FROM samagri_images WHERE id=$1 AND actor_id=$2', [id, req.session.userId])).rows[0];
    if (!image) { res.sendStatus(404); return; }
    const file = await storage.getObjectEntityFile(image.object_path);
    const [metadata] = await file.getMetadata();
    const [bytes] = await file.download({ start: 0, end: 15 });
    const mime = bytes.subarray(0,3).equals(Buffer.from([255,216,255])) ? 'image/jpeg'
      : bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
      : bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP' ? 'image/webp' : '';
    if (Number(metadata.size)>5*1024*1024 || mime!==image.content_type) {
      await file.delete(); res.status(400).json({ message: 'Invalid image or image exceeds 5 MB' }); return;
    }
    await pool.query('UPDATE samagri_images SET completed=true WHERE id=$1', [id]);
    res.json(parsed.data);
  } catch (error) { logger.warn({ err: error }, 'Samagri photo validation failed'); res.status(400).json({ message: 'Image upload is incomplete. Try again.' }); }
});
bookingSamagriRouter.get('/samagri/images/:id', async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) { res.sendStatus(404); return; }
  try {
    const image = (await pool.query('SELECT * FROM samagri_images WHERE id=$1 AND completed=true', [req.params.id])).rows[0];
    if (!image) { res.sendStatus(404); return; }
    const file = await storage.getObjectEntityFile(image.object_path);
    res.setHeader('Content-Type', image.content_type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    file.createReadStream().on('error', () => { if (!res.headersSent) res.sendStatus(404); else res.destroy(); }).pipe(res);
  } catch { res.sendStatus(404); }
});
bookingSamagriRouter.use(((error, _req, res, _next) => {
  logger.error({ err: error }, 'Samagri request failed');
  if (!res.headersSent) res.status(503).json({ message: 'Samagri is temporarily unavailable. Please retry.' });
}) as ErrorRequestHandler);
