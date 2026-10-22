import { Router, type RequestHandler, type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { pool } from './db';
import { isAuthenticated } from './middlewares/auth';
import { ObjectStorageService } from './lib/objectStorage';
import { eventMediaSchema, eventFail } from './eventsModel';
import { logger } from './lib/logger';

const storage = new ObjectStorageService();
const safe = (handler: RequestHandler): RequestHandler => (req,res,next) => { Promise.resolve(handler(req,res,next)).catch(next); };
export const eventMediaRouter = Router();
eventMediaRouter.use('/admin/event-media',isAuthenticated,(req,res,next) => {
  res.setHeader('Cache-Control','no-store');
  if (req.session.userRole!=='admin' || req.headers['sec-fetch-site']==='cross-site') { res.sendStatus(403); return; } next();
});
eventMediaRouter.post('/admin/event-media',safe(async (req,res) => {
  const input = z.object({ name:z.string().trim().min(1).max(200), size:z.number().int().positive().max(25*1024*1024),
    contentType:z.enum(['image/jpeg','image/png','image/webp','video/mp4','application/pdf']) }).parse(req.body);
  if (input.contentType.startsWith('image/') && input.size>5*1024*1024) throw eventFail(400,'Images must be 5 MB or smaller');
  const count = (await pool.query(`SELECT count(*)::int AS count FROM event_media WHERE actor_id=$1 AND created_at>now()-interval '1 hour'`,
    [req.session.userId])).rows[0].count;
  if (count>=50) throw eventFail(429,'Upload limit reached. Please try later.');
  const uploadURL = await storage.getObjectEntityUploadURL();
  const objectPath = storage.normalizeObjectEntityPath(uploadURL), id = objectPath.split('/').pop()!;
  await pool.query('INSERT INTO event_media(id,object_path,actor_id,content_type) VALUES($1,$2,$3,$4)',
    [id,objectPath,req.session.userId,input.contentType]);
  res.json({ uploadURL,url:`/api/event-media/${id}` });
}));
eventMediaRouter.post('/admin/event-media/complete',safe(async (req,res) => {
  const input = eventMediaSchema.parse(req.body), id = input.url.split('/').pop();
  const row = (await pool.query('SELECT * FROM event_media WHERE id=$1 AND actor_id=$2',[id,req.session.userId])).rows[0];
  if (!row) throw eventFail(404,'Upload not found');
  const file = await storage.getObjectEntityFile(row.object_path);
  const [metadata] = await file.getMetadata(), [bytes] = await file.download({ start:0,end:15 });
  const detected = bytes.subarray(0,3).equals(Buffer.from([255,216,255]))?'image/jpeg'
    :bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png'
    :bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'image/webp'
    :bytes.toString('ascii',4,8)==='ftyp'?'video/mp4'
    :bytes.toString('ascii',0,5)==='%PDF-'?'application/pdf':'';
  const validKind = ['banner','photo'].includes(input.kind)?detected.startsWith('image/')
    :input.kind==='video'?detected==='video/mp4':detected==='application/pdf';
  if (row.content_type!==detected || !validKind || Number(metadata.size)>(detected.startsWith('image/')?5:25)*1024*1024) {
    await file.delete(); throw eventFail(400,'Upload is not a valid file for this media category or exceeds the size limit');
  }
  await pool.query('UPDATE event_media SET completed=true WHERE id=$1',[id]);
  res.json(input);
}));
eventMediaRouter.get('/event-media/:id',safe(async (req,res) => {
  const id = z.string().uuid().parse(req.params.id);
  const row = (await pool.query('SELECT * FROM event_media WHERE id=$1 AND completed=true',[id])).rows[0];
  if (!row) throw eventFail(404,'Media not found');
  let admin = false;
  if (req.session?.userId) admin = !!(await pool.query(`SELECT id FROM users WHERE id=$1 AND role='admin' AND NOT "isBlocked"`,[req.session.userId])).rowCount;
  const published = (await pool.query(`SELECT id FROM religious_events WHERE status='published'
    AND details->'media' @> $1::jsonb LIMIT 1`,[JSON.stringify([{ url:`/api/event-media/${id}` }])])).rowCount;
  if (!admin && !published) throw eventFail(404,'Media not found');
  const file = await storage.getObjectEntityFile(row.object_path);
  const [metadata] = await file.getMetadata(), size = Number(metadata.size);
  res.setHeader('Content-Type',row.content_type);
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Accept-Ranges','bytes');
  res.setHeader('Cache-Control','private, max-age=300');
  const range = req.headers.range;
  let start = 0, end = size-1;
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) { res.status(416).setHeader('Content-Range',`bytes */${size}`); res.end(); return; }
    start = Number(match[1]); end = match[2]?Number(match[2]):size-1;
    if (start>end || start>=size || end>=size) { res.status(416).setHeader('Content-Range',`bytes */${size}`); res.end(); return; }
    res.status(206).setHeader('Content-Range',`bytes ${start}-${end}/${size}`);
  }
  res.setHeader('Content-Length',end-start+1);
  file.createReadStream({ start,end }).on('error',() => {
    if (!res.headersSent) res.sendStatus(404); else res.destroy();
  }).pipe(res);
}));
eventMediaRouter.use(((error,_req,res,_next) => {
  if (error instanceof z.ZodError) { res.status(400).json({ message:'Choose a supported file and valid media details' }); return; }
  if (error?.status) { res.status(error.status).json({ message:error.message }); return; }
  logger.error({ err:error },'Event media unavailable');
  res.status(503).json({ message:'Media upload or download is unavailable. Please retry.' });
}) as ErrorRequestHandler);
