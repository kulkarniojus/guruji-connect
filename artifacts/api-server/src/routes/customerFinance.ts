import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { isAuthenticated, checkRole } from '../middlewares/auth';
import { bookingCustomerFunds, customerActivity } from '../customerFinance';
import { moneyCents } from '../customerBalance';
import { indiaToday } from '../gurujiFinanceStore';

export const customerFinanceRouter = Router();
customerFinanceRouter.use('/api/admin/customers/:customerId/activity', isAuthenticated, checkRole(['admin']));
customerFinanceRouter.use('/api/admin/customers/:customerId/finance', isAuthenticated, checkRole(['admin']));
const idInput = z.coerce.number().int().positive();
const entryInput = z.object({
  bookingId: idInput, type: z.enum(['payment','refund','additional_charge','credit']),
  amount: z.number().finite().positive().max(100000000)
    .refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001, 'Use at most two decimal places'),
  reference: z.string().trim().max(200).default(''),
  reason: z.string().trim().min(5).max(2000), paidBy: z.enum(['portal','guruji']).default('portal'),
}).superRefine((v,ctx) => {
  if (['payment','refund'].includes(v.type) && v.reference.length < 3)
    ctx.addIssue({code:'custom',path:['reference'],message:'Enter the reference for the actual payment or refund'});
});
function sendError(res: any, error: any) {
  const status = error instanceof z.ZodError ? 400 : error.code === '23505' ? 409 : error.status || 500;
  res.status(status).json({message: error instanceof z.ZodError ? error.errors.map(e => e.message).join('; ')
    : error.code === '23505' ? 'This reference is already recorded for the booking.'
    : error.status ? error.message : 'Unable to load or save customer finance records'});
}
customerFinanceRouter.get('/api/admin/customers/:customerId/activity', async (req,res) => {
  try { res.json(await customerActivity(idInput.parse(req.params.customerId))); }
  catch(error) { sendError(res,error); }
});
customerFinanceRouter.post('/api/admin/customers/:customerId/finance', async (req,res) => {
  let client;
  try {
    const customerId = idInput.parse(req.params.customerId);
    const input = entryInput.parse(req.body);
    if (String(input.type)==='refund')
      throw Object.assign(new Error('Customer refunds must be approved in Payment → Refund approvals. Record a manual payout there after it has been sent.'), {status:409});
    client = await pool.connect();
    await client.query('BEGIN');
    // Same lock as cancellation: a receipt, cancellation and refund cannot race.
    await client.query('SELECT pg_advisory_xact_lock(8158,$1)', [input.bookingId]);
    const booking = (await client.query(`SELECT b.* FROM bookings b JOIN users u ON u.id=b."customerId"
      WHERE b.id=$1 AND b."customerId"=$2 AND u.role='customer' FOR UPDATE OF b`, [input.bookingId,customerId])).rows[0];
    if (!booking) throw Object.assign(new Error('Booking does not belong to this customer'), {status:404});
    const closed = ['cancelled','rejected'].includes(booking.status);
    if (closed && input.type !== 'refund')
      throw Object.assign(new Error('Only an owed refund can be recorded for a closed booking'), {status:409});
    const balance = await bookingCustomerFunds(client, booking);
    if (input.type === 'refund' && moneyCents(input.amount) > moneyCents(balance.refundOwed))
      throw Object.assign(new Error(`Refund exceeds the outstanding refundable amount of ₹${balance.refundOwed}`), {status:409});
    if (input.type === 'credit' && moneyCents(input.amount) >
        moneyCents(booking.totalAmount ?? booking.amount) + moneyCents(balance.adjustments))
      throw Object.assign(new Error('Credit exceeds the remaining booking obligation'), {status:409});
    if (input.type === 'payment') {
      if (input.paidBy === 'guruji' && !booking.gurujiId)
        throw Object.assign(new Error('No Guruji is assigned to receive this payment'), {status:409});
      await client.query(`INSERT INTO guruji_finance_receipts
        (booking_id,guruji_id,received_by,amount,received_on,reference,notes,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [booking.id,input.paidBy==='guruji'?booking.gurujiId:null,
        input.paidBy,input.amount,indiaToday(),input.reference,input.reason,req.session.userId]);
    } else await client.query(`INSERT INTO customer_finance_entries
      (booking_id,type,amount,reference,reason,paid_by,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [booking.id,input.type,input.amount,input.reference,input.reason,input.paidBy,req.session.userId]);
    await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
      VALUES($1,'Customer payment record',$2,'payment',false,NOW())`, [customerId,
      `Booking #${booking.id}: the Sanatan Guruji support team recorded ${input.type.replace(/_/g,' ')} of ₹${input.amount}. ` +
      (input.type==='refund' ? `Manual refund paid; reference ${input.reference}.` : 'Contact the support team for details.')]);
    await client.query('COMMIT');
    res.status(201).json({message: input.type==='refund' ? 'Manual refund recorded as paid. No money was transferred by this portal.'
      : 'Customer financial record saved. No money was transferred by this portal.'});
  } catch(error) {
    if (client) await client.query('ROLLBACK');
    sendError(res,error);
  } finally { client?.release(); }
});
