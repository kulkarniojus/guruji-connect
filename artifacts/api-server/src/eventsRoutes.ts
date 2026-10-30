import { Router, type RequestHandler, type ErrorRequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { pool } from './db';
import { isAuthenticated } from './middlewares/auth';
import { logger } from './lib/logger';
import { DBStorage } from './dbStorage';
import { eventFail, eventInputSchema, eventSchedule, eventView, registrationView, notifyEventGuardians,
  syncEventSessions, reservedSeatsSql } from './eventsModel';
import { startEventPayment, reconcileEventPayment } from './eventPayments';
import { createEventRefundRequest } from './customerRefunds';

const safe = (handler: RequestHandler): RequestHandler => (req,res,next) => { Promise.resolve(handler(req,res,next)).catch(next); };
const idOf = (value: unknown) => z.coerce.number().int().positive().parse(value);
const uuidOf = (value: unknown) => z.string().uuid().parse(value);
const adminOnly: RequestHandler = (req,res,next) => {
  if (req.session.userRole!=='admin') { res.status(403).json({ message: 'Admin access required' }); return; } next();
};
async function optionalViewer(userId?: number) {
  if (!userId) return { id: undefined, admin: false, role: undefined as string | undefined, city: '', state: '' };
  const user = (await pool.query('SELECT role,"isBlocked",city,state FROM users WHERE id=$1', [userId])).rows[0];
  return user && !user.isBlocked
    ? { id: userId, admin: user.role==='admin', role: user.role, city: user.city || '', state: user.state || '' }
    : { id: undefined, admin: false, role: undefined, city: '', state: '' };
}
const normalizeCityPart = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('en-IN');
function viewerMatchesEventCity(viewer: Awaited<ReturnType<typeof optionalViewer>>, event: any) {
  return viewer.role === 'customer' && !!viewer.city && !!viewer.state &&
    normalizeCityPart(viewer.city) === normalizeCityPart(event.city) &&
    normalizeCityPart(viewer.state) === normalizeCityPart(event.state);
}
async function validateEventCity(input: z.infer<typeof eventInputSchema>) {
  const cities = await new DBStorage().getAllCities();
  const city = cities.find(item => item.isActive !== false &&
    normalizeCityPart(item.name) === normalizeCityPart(input.city) &&
    normalizeCityPart(item.state) === normalizeCityPart(input.state));
  if (!city) throw eventFail(400, 'Select an active city from the city list');
  return { city: city.name, state: city.state };
}
const registrationInput = z.object({
  requestId: z.string().uuid(), childName: z.string().trim().min(2).max(150),
  childAge: z.number().int().min(1).max(18), guardianConsent: z.literal(true),
  paymentMethod: z.enum(['online','manual']), eventVersion: z.number().int().positive(),
});
const reasonInput = z.object({ reason: z.string().trim().min(3).max(1000) });
export const eventsRouter = Router();
eventsRouter.use(['/admin/events','/admin/event-registrations','/event-registrations','/events/:eventId/register'],
  isAuthenticated, (req,res,next) => {
    res.setHeader('Cache-Control','no-store');
    if (req.method!=='GET' && req.headers['sec-fetch-site']==='cross-site') { res.sendStatus(403); return; }
    next();
  });
eventsRouter.use(['/admin/events','/admin/event-registrations'],adminOnly);

eventsRouter.get('/events', safe(async (req,res) => {
  const viewer = await optionalViewer(req.session.userId);
  if (!viewer.admin && (viewer.role !== 'customer' || !viewer.city || !viewer.state)) {
    res.json([]);
    return;
  }
  const q = String(req.query.q ?? '').trim().slice(0,150);
  const ids = (await pool.query(`SELECT id FROM religious_events WHERE status='published'
    AND ($1='' OR details->>'name' ILIKE '%'||$1||'%' OR details->>'classType' ILIKE '%'||$1||'%')
    AND ($2::boolean OR (lower(trim(details->>'city'))=lower(trim($3))
      AND lower(trim(details->>'state'))=lower(trim($4))))
    ORDER BY details->>'startDate',id DESC`, [q,viewer.admin,viewer.city,viewer.state])).rows;
  const result = [];
  for (let i=0;i<ids.length;i+=10) result.push(...await Promise.all(ids.slice(i,i+10).map(row => eventView(row.id))));
  res.json(result);
}));
eventsRouter.get('/events/:eventId', safe(async (req,res) => {
  const viewer = await optionalViewer(req.session?.userId);
  const id = idOf(req.params.eventId);
  const event = (await pool.query('SELECT status,details FROM religious_events WHERE id=$1',[id])).rows[0];
  if (!event || (!viewer.admin && (event.status !== 'published' || !viewerMatchesEventCity(viewer,event.details)))) {
    throw eventFail(404,'Event not found');
  }
  res.setHeader('Cache-Control','no-store');
  res.json(await eventView(id,viewer.id,viewer.admin));
}));
eventsRouter.get('/admin/events', safe(async (_req,res) => {
  const ids = (await pool.query(`SELECT id FROM religious_events ORDER BY created_at DESC LIMIT 200`)).rows;
  const result = [];
  for (let i=0;i<ids.length;i+=10) result.push(...await Promise.all(ids.slice(i,i+10).map(row => eventView(row.id,undefined,true))));
  res.json(result);
}));
async function validateMedia(items: z.infer<typeof eventInputSchema>['media']) {
  for (const item of items) {
    const mediaId = item.url.split('/').pop();
    const row = (await pool.query('SELECT content_type FROM event_media WHERE id=$1 AND completed=true', [mediaId])).rows[0];
    if (!row) throw eventFail(400,'Complete the event media upload before saving');
    if ((['photo','banner'].includes(item.kind) && !row.content_type.startsWith('image/')) ||
        (item.kind==='video' && row.content_type!=='video/mp4') ||
        (item.kind==='document' && row.content_type!=='application/pdf')) throw eventFail(400,'Media category does not match the uploaded file');
  }
}
eventsRouter.post('/admin/events', safe(async (req,res) => {
  const input = eventInputSchema.parse(req.body);
  await validateEventCity(input);
  eventSchedule(input);
  await validateMedia(input.media);
  const client = await pool.connect();
  let id: number;
  try {
    await client.query('BEGIN');
    id = (await client.query('INSERT INTO religious_events(details,actor_id) VALUES($1,$2) RETURNING id',
      [JSON.stringify(input),req.session.userId])).rows[0].id;
    await syncEventSessions(id,input,1,client);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  res.status(201).json(await eventView(id!,undefined,true));
}));
eventsRouter.put('/admin/events/:eventId', safe(async (req,res) => {
  const id = idOf(req.params.eventId), input = eventInputSchema.parse(req.body);
  await validateEventCity(input);
  eventSchedule(input);
  await validateMedia(input.media);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const event = (await client.query('SELECT * FROM religious_events WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if (!event) throw eventFail(404,'Event not found');
    if (event.status==='cancelled') throw eventFail(409,'Cancelled events cannot be changed. Create a new event instead.');
    const occupied = (await client.query(`SELECT ${reservedSeatsSql} AS occupied FROM religious_events e WHERE id=$1`,[id])).rows[0].occupied;
    if (input.capacity<occupied) throw eventFail(409,'Capacity cannot be reduced below current registrations and payment reservations');
    const scheduleKeys = ['startDate','endDate','startTime','durationMinutes','frequency','weekdays'] as const;
    const rescheduled = scheduleKeys.some(key => JSON.stringify(input[key])!==JSON.stringify(event.details[key]));
    if (rescheduled && !eventSchedule(input).some(session => session.start.getTime()>Date.now()))
      throw eventFail(400,'A rescheduled event needs an upcoming class');
    const version = event.version+1;
    await client.query('UPDATE religious_events SET details=$2,version=$3,actor_id=$4,updated_at=now() WHERE id=$1',
      [id,JSON.stringify(input),version,req.session.userId]);
    if (rescheduled) await syncEventSessions(id,input,version,client);
    if (event.status==='published') await notifyEventGuardians(client,id,rescheduled?'Event rescheduled':'Event details updated',
      `${input.name}: ${rescheduled ? `The schedule changed to ${input.startDate}, ${input.startTime} IST (${input.frequency}).` : 'Please review the updated details.'} Your agreed registration fee remains unchanged. View /services/events/${id}`);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  res.json(await eventView(id,undefined,true));
}));
eventsRouter.post('/admin/events/:eventId/action', safe(async (req,res) => {
  const id = idOf(req.params.eventId);
  const input = z.object({ action:z.enum(['publish','unpublish','cancel']), reason:z.string().trim().max(1000) }).parse(req.body);
  if (input.action==='cancel' && input.reason.length<3) throw eventFail(400,'Enter a cancellation reason');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query('SELECT * FROM religious_events WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if (!row) throw eventFail(404,'Event not found');
    if (row.status==='cancelled') throw eventFail(409,'This event has already been cancelled');
    if (input.action==='publish') {
      const details = eventInputSchema.parse(row.details);
      if (Date.parse(details.registrationDeadline)<=Date.now() || !eventSchedule(details).some(s => s.start.getTime()>Date.now()))
        throw eventFail(400,'Set a future registration deadline and upcoming schedule before publishing');
      await validateMedia(details.media);
    }
    const state = input.action==='publish'?'published':input.action==='unpublish'?'draft':'cancelled';
    if (input.action==='cancel') {
      const registrations = (await client.query(`SELECT * FROM event_registrations WHERE event_id=$1
        AND status IN ('registered','pending_payment','pending_confirmation') FOR UPDATE`,[id])).rows;
      for (const registration of registrations)
        await createEventRefundRequest(client,registration,input.reason);
      await notifyEventGuardians(client,id,'Event cancelled',
        `${row.details.name} has been cancelled: ${input.reason}. Any refundable payment is awaiting admin review. Online refunds are returned through the original payment method; manual payments are paid and recorded by the support team. View your event registrations.`);
      await client.query(`UPDATE event_registrations SET status='cancelled',cancellation_reason=$2,hold_until=null
        WHERE event_id=$1 AND status IN ('registered','pending_payment','pending_confirmation')`,[id,input.reason]);
      await client.query(`UPDATE event_sessions SET status='cancelled' WHERE event_id=$1 AND start_at>now()`,[id]);
    } else if (input.action==='unpublish') {
      await notifyEventGuardians(client,id,'Event temporarily unpublished',
        `${row.details.name} is temporarily unavailable to new registrations. Your existing registration remains recorded; contact the Vaidik Dhara support team for details.`);
    }
    await client.query('UPDATE religious_events SET status=$2,version=version+1,cancellation_reason=$3,updated_at=now(),actor_id=$4 WHERE id=$1',
      [id,state,input.action==='cancel'?input.reason:'',req.session.userId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  res.json(await eventView(id,undefined,true));
}));
eventsRouter.post('/events/:eventId/register', safe(async (req,res) => {
  const viewer = await optionalViewer(req.session.userId);
  if (viewer.role!=='customer') throw eventFail(403,'Only a signed-in parent/customer can register a child');
  const id = idOf(req.params.eventId), input = registrationInput.parse(req.body);
  const client = await pool.connect();
  let registrationId: string;
  try {
    await client.query('BEGIN');
    const event = (await client.query('SELECT * FROM religious_events WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if (!event) throw eventFail(404,'Event not found');
    if (event.status!=='published' || !viewerMatchesEventCity(viewer,event.details)) throw eventFail(404,'Event not found');
    const prior = (await client.query('SELECT id,event_id FROM event_registrations WHERE guardian_id=$1 AND request_id=$2',
      [req.session.userId,input.requestId])).rows[0];
    if (prior) {
      if (prior.event_id!==id) throw eventFail(409,'Registration request belongs to another event');
      await client.query('COMMIT'); res.status(201).json(await registrationView(prior.id)); return;
    }
    const details = event.details as z.infer<typeof eventInputSchema>;
    if (event.status!=='published' || Date.parse(details.registrationDeadline)<=Date.now() ||
        !eventSchedule(details).some(s => s.start.getTime()>Date.now())) throw eventFail(409,'Registration for this event is closed');
    if (event.version!==input.eventVersion) throw eventFail(409,'Event details or pricing changed. Refresh and confirm the latest event before registering.');
    if (input.childAge<details.ageMin || input.childAge>details.ageMax) throw eventFail(400,'The child’s age is outside this event’s age group');
    const duplicate = (await client.query(`SELECT id FROM event_registrations WHERE event_id=$1 AND guardian_id=$2
      AND lower(child_name)=lower($3) AND child_age=$4 AND
      (status IN ('registered','pending_confirmation') OR (status='pending_payment' AND hold_until>now())) LIMIT 1`,
      [id,req.session.userId,input.childName,input.childAge])).rowCount;
    if (duplicate) throw eventFail(409,'This child already has an active registration. Check My event registrations.');
    const occupied = (await client.query(`SELECT ${reservedSeatsSql} AS count FROM religious_events e WHERE id=$1`,[id])).rows[0].count;
    if (occupied>=details.capacity) throw eventFail(409,'This event is full');
    const fee = Math.round((details.discountedPrice??details.basePrice)*100);
    if (fee>0 && details.paymentMode!=='both' && input.paymentMethod!==details.paymentMode)
      throw eventFail(400,'Choose a payment method enabled for this event');
    const method = fee===0?'free':input.paymentMethod;
    if (method==='online' && !(await eventView(id,undefined,false,client)).checkoutAvailable)
      throw eventFail(503,'Online checkout is unavailable. No registration payment has been taken.');
    registrationId = randomUUID();
    await client.query(`INSERT INTO event_registrations(id,event_id,guardian_id,request_id,child_name,child_age,status,
      payment_method,fee_paise,hold_until,event_name)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [registrationId,id,req.session.userId,input.requestId,input.childName,input.childAge,
        method==='online'?'pending_payment':method==='manual'?'pending_confirmation':'registered',
        method,fee,method==='online'?new Date(Date.now()+35*60000):null,details.name]);
    await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt") VALUES($1,$2,$3,'event',false,now())`,
      [req.session.userId,method==='online'?'Event seat reserved':'Event registration recorded',
        `${details.name}: ${method==='online'?'Complete online payment within the reservation window to confirm the seat.':method==='manual'?'Your manual-payment registration is awaiting confirmation by the Vaidik Dhara support team. It is not confirmed yet.':'Your free registration is confirmed.'} View your event registrations.`]);
    await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
      SELECT id,'New event registration',$1,'event',false,now() FROM users WHERE role='admin' AND NOT "isBlocked"`,
      [`${details.name}: ${method==='online'?'a new online payment reservation':method==='manual'?'a manual registration is awaiting confirmation':'a free registration'} was recorded. Open Services → Events → Registrations & payments to review.`]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  res.status(201).json(await registrationView(registrationId!));
}));
eventsRouter.get('/event-registrations', safe(async (req,res) => {
  const rows = (await pool.query('SELECT id FROM event_registrations WHERE guardian_id=$1 ORDER BY created_at DESC',[req.session.userId])).rows;
  res.json(await Promise.all(rows.map(row => registrationView(row.id))));
}));
eventsRouter.get('/admin/events/:eventId/participants', safe(async (req,res) => {
  const rows = (await pool.query('SELECT id FROM event_registrations WHERE event_id=$1 ORDER BY created_at DESC',[idOf(req.params.eventId)])).rows;
  res.json(await Promise.all(rows.map(row => registrationView(row.id))));
}));
eventsRouter.post('/admin/event-registrations/:registrationId/confirm', safe(async (req,res) => {
  const id = uuidOf(req.params.registrationId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lookup = (await client.query('SELECT event_id FROM event_registrations WHERE id=$1',[id])).rows[0];
    if (!lookup) throw eventFail(404,'Registration not found');
    const event = (await client.query('SELECT * FROM religious_events WHERE id=$1 FOR UPDATE',[lookup.event_id])).rows[0];
    const row = (await client.query('SELECT * FROM event_registrations WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if (row.payment_method!=='manual') throw eventFail(409,'Only manual-payment registrations can be confirmed here');
    if (row.status==='registered') {
      await client.query('COMMIT');
      res.json(await registrationView(id));
      return;
    }
    if (row.status!=='pending_confirmation') throw eventFail(409,'This registration is not awaiting manual confirmation');
    if (event.status==='cancelled') throw eventFail(409,'A cancelled event cannot accept confirmed registrations');
    await client.query(`UPDATE event_registrations SET status='registered',hold_until=null WHERE id=$1`,[id]);
    const remaining = Math.max(0,row.fee_paise-row.paid_paise)/100;
    await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
      VALUES($1,'Event registration confirmed',$2,'event',false,now())`,
      [row.guardian_id,`${event.details.name}: the Vaidik Dhara support team confirmed your manual-payment registration. ${remaining>0?`Recorded balance remaining: ₹${remaining}. `:''}View My event registrations for payment records and schedule.`]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  res.json(await registrationView(id));
}));
eventsRouter.post('/event-registrations/:registrationId/checkout', safe(async (req,res) => {
  res.json(await startEventPayment(uuidOf(req.params.registrationId),req.session.userId!,req.headers.origin));
}));
eventsRouter.post('/event-registrations/:registrationId/reconcile', safe(async (req,res) => {
  res.json(await reconcileEventPayment(uuidOf(req.params.registrationId),req.session.userId!));
}));
eventsRouter.post('/event-registrations/:registrationId/cancel', safe(async (req,res) => {
  const id = uuidOf(req.params.registrationId), input = reasonInput.parse(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lookup = (await client.query('SELECT event_id FROM event_registrations WHERE id=$1',[id])).rows[0];
    if (!lookup) throw eventFail(404,'Registration not found');
    await client.query('SELECT id FROM religious_events WHERE id=$1 FOR UPDATE',[lookup.event_id]);
    const row = (await client.query('SELECT * FROM event_registrations WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if (row.guardian_id!==req.session.userId && req.session.userRole!=='admin') throw eventFail(404,'Registration not found');
    if (row.status!=='cancelled') {
      await client.query(`UPDATE event_registrations SET status='cancelled',cancellation_reason=$2,hold_until=null WHERE id=$1`,[id,input.reason]);
      await createEventRefundRequest(client,row,input.reason);
      await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
        VALUES($1,'Event registration cancelled',$2,'event',false,now())`,
        [row.guardian_id,`Your event registration was cancelled: ${input.reason}. Any refundable payment is awaiting admin review. Online refunds are returned through the original payment method; manual payments are paid and recorded by the support team.`]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  res.json(await registrationView(id));
}));
eventsRouter.post('/admin/event-registrations/:registrationId/payments', safe(async (req,res) => {
  const id = uuidOf(req.params.registrationId);
  const input = z.object({ type:z.enum(['payment','refund']), amount:z.number().positive().max(1000000).multipleOf(0.01),
    reference:z.string().trim().min(2).max(200), note:z.string().trim().max(1500) }).parse(req.body);
  if (String(input.type)==='refund')
    throw eventFail(409,'Refunds must be approved in Payment → Refund approvals. Record manual payouts there after they have been sent.');
  const amount = Math.round(input.amount*100), client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query('SELECT * FROM event_registrations WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if (!row) throw eventFail(404,'Registration not found');
    const prior = (await client.query('SELECT amount_paise FROM event_payment_records WHERE registration_id=$1 AND type=$2 AND reference=$3',
      [id,input.type,input.reference])).rows[0];
    if (prior) {
      if (prior.amount_paise!==amount) throw eventFail(409,'This payment reference was already recorded with another amount');
      await client.query('COMMIT'); res.json(await registrationView(id)); return;
    }
    if (input.type==='payment' && (row.payment_method!=='manual' || !['registered','pending_confirmation'].includes(row.status)))
      throw eventFail(409,'Only active manual registrations accept manually recorded payments');
    if (input.type==='payment' && amount>row.fee_paise-row.paid_paise) throw eventFail(400,'Amount exceeds the remaining event fee');
    if (input.type==='refund' && (row.status!=='cancelled' || amount>row.paid_paise-row.refunded_paise))
      throw eventFail(400,'Refund exceeds the amount owed for this cancelled registration');
    await client.query(`INSERT INTO event_payment_records(registration_id,type,amount_paise,reference,note,actor_id)
      VALUES($1,$2,$3,$4,$5,$6)`,[id,input.type,amount,input.reference,input.note,req.session.userId]);
    await client.query(`UPDATE event_registrations SET ${input.type==='payment'?'paid_paise=paid_paise':'refunded_paise=refunded_paise'}+$2 WHERE id=$1`,[id,amount]);
    await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
      VALUES($1,$2,$3,'event',false,now())`,[row.guardian_id,'Event payment record updated',
      `The Vaidik Dhara support team recorded a ${input.type} of ₹${input.amount}. View My event registrations for your balance and payment history.`]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  res.json(await registrationView(id));
}));
eventsRouter.get('/admin/events/:eventId/attendance/:sessionId', safe(async (req,res) => {
  const eventId = idOf(req.params.eventId), sessionId = idOf(req.params.sessionId);
  const rows = (await pool.query(`SELECT a.session_id AS "sessionId",a.registration_id AS "registrationId",a.status,a.recorded_at AS "recordedAt"
    FROM event_attendance a JOIN event_sessions s ON s.id=a.session_id WHERE s.event_id=$1 AND s.id=$2`,[eventId,sessionId])).rows;
  res.json(rows);
}));
eventsRouter.post('/admin/events/:eventId/attendance', safe(async (req,res) => {
  const eventId = idOf(req.params.eventId);
  const input = z.object({ sessionId:z.number().int().positive(), registrationId:z.string().uuid(),
    status:z.enum(['present','absent','excused']) }).parse(req.body);
  const allowed = (await pool.query(`SELECT r.id FROM event_registrations r JOIN event_sessions s ON s.event_id=r.event_id
    JOIN religious_events e ON e.id=r.event_id WHERE r.event_id=$1 AND r.id=$2 AND r.status='registered'
    AND s.id=$3 AND s.status='scheduled' AND e.status<>'cancelled'`,[eventId,input.registrationId,input.sessionId])).rowCount;
  if (!allowed) throw eventFail(409,'Attendance requires an active registration and a non-cancelled session of the same event');
  const row = (await pool.query(`INSERT INTO event_attendance(session_id,registration_id,status,actor_id)
    VALUES($1,$2,$3,$4) ON CONFLICT(session_id,registration_id) DO UPDATE SET status=excluded.status,actor_id=excluded.actor_id,recorded_at=now()
    RETURNING session_id AS "sessionId",registration_id AS "registrationId",status,recorded_at AS "recordedAt"`,
    [input.sessionId,input.registrationId,input.status,req.session.userId])).rows[0];
  res.json(row);
}));
eventsRouter.post('/admin/events/:eventId/notify', safe(async (req,res) => {
  const id = idOf(req.params.eventId), input = z.object({ message:z.string().trim().min(3).max(3000) }).parse(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const event = (await client.query('SELECT * FROM religious_events WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if (!event) throw eventFail(404,'Event not found');
    const recent = (await client.query(`SELECT id FROM event_notices WHERE event_id=$1 AND created_at>now()-interval '1 minute'`,[id])).rowCount;
    if (recent) throw eventFail(429,'Please wait a minute before sending another notice');
    const count = await notifyEventGuardians(client,id,`${event.details.name}: support team update`,input.message);
    await client.query('INSERT INTO event_notices(event_id,actor_id,message,recipients) VALUES($1,$2,$3,$4)',
      [id,req.session.userId,input.message,count]);
    await client.query('COMMIT'); res.json({ notified:count });
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
eventsRouter.use(((error,_req,res,_next) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ message:error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') }); return;
  }
  if (error?.status) { res.status(error.status).json({ message:error.message }); return; }
  logger.error({ err:error },'Event operation failed');
  res.status(503).json({ message:'Events are temporarily unavailable. Please try again.' });
}) as ErrorRequestHandler);
