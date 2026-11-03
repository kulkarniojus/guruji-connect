import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { pool } from '../db';
import { cancellationQuote, cancellationRuleInput } from '../cancellationPolicy';
import { cancellationActor, performCancellation } from '../bookingCancellations';

export const cancellationsRouter = Router();
const idInput = z.coerce.number().int().positive();
const actionInput = z.object({
  reason: z.string().trim().min(5, 'Please provide a reason (at least 5 characters)').max(2000),
  quoteToken: z.string().optional(),
  action: z.enum(['cancel','reassign','approve','reject','review_withdrawal']).optional(),
  eventId: z.coerce.number().int().positive().optional(),
  chargeParty: z.enum(['none','customer','guruji']).optional(),
  chargeOverride: z.coerce.number().finite().min(0).max(100000000).optional(),
  searchOthers: z.boolean().optional(),
});
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });

async function authenticated(req: Request, admin = false, superAdmin = false) {
  const id = req.session.userId;
  if (!id) throw fail(401, 'Please sign in');
  const user = (await pool.query('SELECT id,role,"isBlocked",is_super_admin FROM users WHERE id=$1', [id])).rows[0];
  if (!user || user.isBlocked) throw fail(403, 'Not authorized');
  if (admin && user.role !== 'admin') throw fail(403, 'Admin access required');
  if (superAdmin && user.is_super_admin !== true) throw fail(403, 'Super admin access required');
  return user;
}
const endpoint = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { await fn(req,res); }
  catch (error: any) {
    if (error instanceof ZodError) return res.status(400).json({ message: error.errors.map(e => e.message).join('; ') });
    if (error.code === '23505') return res.status(409).json({message:'An active rule or cancellation request already exists.'});
    if (!error.status) console.error('Cancellation operation failed', error);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to process cancellation. Please try again.', ...(error.quote ? {quote:error.quote} : {}) });
  }
};

cancellationsRouter.get('/api/admin/cancellation-rules', endpoint(async (req,res) => {
  await authenticated(req,true);
  res.json((await pool.query('SELECT * FROM cancellation_rules ORDER BY user_type,time_basis,hours_threshold,id')).rows);
}));

async function saveRule(req: Request, res: Response, editing: boolean) {
  await authenticated(req,true);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize policy writes, including role switches, without changing existing policies.
    await client.query('SELECT pg_advisory_xact_lock(8160,0)');
    const id = editing ? idInput.parse(req.params.id) : null;
    const old = editing ? (await client.query('SELECT * FROM cancellation_rules WHERE id=$1 FOR UPDATE',[id])).rows[0] : null;
    if (editing && !old) throw fail(404,'Rule not found');
    const input = cancellationRuleInput.parse({
      ...(old ? {userType:old.user_type,name:old.name,hoursThreshold:old.hours_threshold,timeBasis:old.time_basis,
        chargeType:old.charge_type,chargeValue:old.charge_value,description:old.description || '',isActive:old.is_active,pujaId:old.puja_id} : {}),
      ...req.body,
    });
    if(input.pujaId && !(await client.query('SELECT id FROM pujas WHERE id=$1',[input.pujaId])).rows.length)
      throw fail(400,'Select an existing puja');
    if (input.isActive) {
      const duplicate = (await client.query(`SELECT id FROM cancellation_rules WHERE is_active=true
        AND user_type=$1 AND time_basis=$2 AND hours_threshold=$3 AND id<>COALESCE($4,0)
        AND puja_id IS NOT DISTINCT FROM $5`,
        [input.userType,input.timeBasis,input.hoursThreshold,id,input.pujaId])).rows[0];
      if (duplicate) throw fail(409,'An active rule already exists for this role, hourly threshold and timing basis. Edit or deactivate it first.');
    }
    const values = [input.userType,input.name,input.hoursThreshold,input.chargeType,
      ['free','full'].includes(input.chargeType) ? 0 : input.chargeValue,input.description,input.isActive,input.timeBasis,input.pujaId];
    const result = editing
      ? await client.query(`UPDATE cancellation_rules SET user_type=$1,name=$2,hours_threshold=$3,
          charge_type=$4,charge_value=$5,description=$6,is_active=$7,time_basis=$8,puja_id=$9 WHERE id=$10 RETURNING *`, [...values,id])
      : await client.query(`INSERT INTO cancellation_rules
          (user_type,name,hours_threshold,charge_type,charge_value,description,is_active,time_basis,puja_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, values);
    await client.query('COMMIT');
    res.status(editing ? 200 : 201).json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
cancellationsRouter.post('/api/admin/cancellation-rules', endpoint((req,res) => saveRule(req,res,false)));
cancellationsRouter.put('/api/admin/cancellation-rules/:id', endpoint((req,res) => saveRule(req,res,true)));
cancellationsRouter.delete('/api/admin/cancellation-rules/:id', endpoint(async (req,res) => {
  await authenticated(req,true);
  const result=await pool.query('DELETE FROM cancellation_rules WHERE id=$1 RETURNING id',[idInput.parse(req.params.id)]);
  if (!result.rows.length) throw fail(404,'Rule not found');
  res.json({message:'Rule deleted. Previously recorded cancellation charges are unchanged.'});
}));

cancellationsRouter.get('/api/admin/bookings/:id/cancellation-quote', endpoint(async(req,res)=>{
  await authenticated(req,true);
  const party=z.enum(['customer','guruji']).parse(req.query.chargeParty);
  const booking=(await pool.query('SELECT *,date::text AS calendar_date FROM bookings WHERE id=$1',[idInput.parse(req.params.id)])).rows[0];
  if(!booking) throw fail(404,'Booking not found');
  if(party==='guruji' && !booking.gurujiId) throw fail(409,'No Guruji is currently assigned');
  res.json(await cancellationQuote(pool,booking,party));
}));
cancellationsRouter.get('/api/bookings/:id/cancellation-preview', endpoint(async (req,res) => {
  const user=await authenticated(req);
  const booking=(await pool.query('SELECT b.*,b.date::text AS calendar_date FROM bookings b WHERE id=$1',[idInput.parse(req.params.id)])).rows[0];
  if (!booking) throw fail(404,'Booking not found');
  const actor=await cancellationActor(pool,user.id,booking);
  res.json(await cancellationQuote(pool,booking,actor));
}));

export const cancellationEndpoint = endpoint(async (req,res) => {
  const user=await authenticated(req);
  // Legacy Guruji route is an alias, not a route around policy enforcement.
  const input=actionInput.parse(req.body);
  if (user.role!=='admin' && (input.action || input.chargeOverride!==undefined || input.chargeParty || input.searchOthers!==undefined))
    throw fail(403,'Only the support team can override charges, cancellation or reassignment decisions');
  res.json(await performCancellation(idInput.parse(req.params.id),user.id,input));
});
cancellationsRouter.post('/api/bookings/:id/cancel',cancellationEndpoint);
cancellationsRouter.post('/api/guruji/bookings/:id/cancel',cancellationEndpoint);
cancellationsRouter.post('/api/bookings/:id/cancel-by-guruji',cancellationEndpoint);
cancellationsRouter.post('/api/admin/bookings/:id/cancellation-action', endpoint(async (req,res) => {
  await authenticated(req,true);
  await cancellationEndpoint(req,res);
}));

cancellationsRouter.get('/api/admin/cancellation-requests', endpoint(async (req,res) => {
  await authenticated(req,true,true);
  res.json((await pool.query(`SELECT e.*,b.status AS booking_status,b."customerId",
    p.name AS puja_name,u."firstName" AS customer_name
    FROM booking_cancellation_events e JOIN bookings b ON b.id=e.booking_id
    JOIN users u ON u.id=b."customerId" LEFT JOIN pujas p ON p.id=b."pujaId"
    ORDER BY (e.status='pending') DESC,e.created_at DESC LIMIT 500`)).rows);
}));
cancellationsRouter.get('/api/bookings/:id/cancellation-history', endpoint(async (req,res) => {
  const user=await authenticated(req);
  const id=idInput.parse(req.params.id);
  const booking=(await pool.query('SELECT * FROM bookings WHERE id=$1',[id])).rows[0];
  if (!booking) throw fail(404,'Booking not found');
  const ownsHistory=(await pool.query('SELECT id FROM booking_cancellation_events WHERE booking_id=$1 AND requested_by=$2',[id,user.id])).rows.length>0;
  if (!ownsHistory) await cancellationActor(pool,user.id,booking);
  const history=(await pool.query(`SELECT id,requested_by,user_type,kind,status,reason,charge,review_reason,created_at,reviewed_at
    FROM booking_cancellation_events WHERE booking_id=$1 ORDER BY created_at DESC`,[id])).rows;
  res.json(history.map(({requested_by,...entry}:any)=>
    user.role!=='admin' && requested_by!==user.id && ['customer','guruji'].includes(entry.user_type)
      ? {...entry,reason:'The Vaidik Dhara support team is handling this request. Contact the support team for details.',review_reason:null}
      : entry));
}));
cancellationsRouter.get('/api/guruji/cancellation-history',endpoint(async(req,res)=>{
  const user=await authenticated(req);
  if(!['guruji','customer'].includes(user.role)) throw fail(403,'Provider access required');
  if(user.role==='customer'){
    const profile=(await pool.query(`SELECT id,status,"isVerified" FROM guruji_profiles WHERE "userId"=$1`,[user.id])).rows[0];
    const approved=profile && (await pool.query(`SELECT 1 FROM other_category_applications a
      JOIN other_registration_categories c ON c.id=a.category_id AND c.is_active=true
      WHERE a.profile_id=$1 AND a.status='approved' LIMIT 1`,[profile.id])).rowCount;
    if(!approved || profile.status!=='approved' || !profile.isVerified) throw fail(403,'An approved Other-category application is required');
  }
  res.json((await pool.query(`SELECT e.id,e.booking_id,e.user_type,e.kind,e.status,
    CASE WHEN e.requested_by=$1 THEN e.reason ELSE 'Managed by the Vaidik Dhara support team.' END AS reason,e.charge,
    e.review_reason,e.created_at,e.reviewed_at FROM booking_cancellation_events e
    LEFT JOIN guruji_profiles g ON g.id=e.previous_guruji_id
    WHERE e.requested_by=$1 OR (g."userId"=$1 AND e.user_type IN ('guruji','none'))
    ORDER BY e.created_at DESC LIMIT 100`,[user.id])).rows);
}));
