import { Router, type Request, type Response } from 'express';
import { ZodError, z } from 'zod';
import { pool } from '../db';
import { isAuthenticated, checkRole } from '../middlewares/auth';
import { approveRefundRequest, getAdminRefundRequests, getCustomerRefundRequests, reconcileRefundRequest, settleManualRefund } from '../customerRefunds';
import { logger } from '../lib/logger';

export const refundsRouter = Router();
const positiveId = z.coerce.number().int().positive();
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });

async function requireAdmin(req: Request) {
  if (!req.session.userId) throw fail(401,'Please sign in');
  const user = (await pool.query('SELECT role,"isBlocked",is_super_admin FROM users WHERE id=$1',[req.session.userId])).rows[0];
  if (!user || user.role!=='admin' || user.isBlocked || user.is_super_admin !== true) throw fail(403,'Super admin access required');
  return req.session.userId;
}

const endpoint = (fn: (req: Request, res: Response, adminId: number) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try { await fn(req,res,await requireAdmin(req)); }
    catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message:error.errors.map(issue=>issue.message).join('; ') });
        return;
      }
      if (error.code==='23505') {
        res.status(409).json({ message:'That refund reference is already recorded. Refresh the request.' });
        return;
      }
      if (!error.status) logger.error({ error },'Refund operation failed');
      res.status(error.status||500).json({ message:error.status?error.message:'Unable to process the refund request. Please retry.' });
    }
  };

refundsRouter.get('/api/customer/refunds', isAuthenticated, checkRole(['customer']), async(req,res) => {
  try {
    res.setHeader('Cache-Control','no-store');
    res.json(await getCustomerRefundRequests(req.session.userId!));
  } catch (error) {
    logger.error({ error },'Unable to load customer refund progress');
    res.status(500).json({ message:'Unable to load refund progress. Please retry.' });
  }
});

refundsRouter.get('/api/admin/refunds',endpoint(async(_req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.json(await getAdminRefundRequests());
}));

refundsRouter.post('/api/admin/refunds/:id/approve',endpoint(async(req,res,adminId)=>{
  const result=await approveRefundRequest(positiveId.parse(req.params.id),adminId);
  res.json(result);
}));

refundsRouter.post('/api/admin/refunds/:id/reconcile',endpoint(async(req,res)=>{
  const result=await reconcileRefundRequest(positiveId.parse(req.params.id));
  res.json(result);
}));

refundsRouter.post('/api/admin/refunds/:id/settle',endpoint(async(req,res,adminId)=>{
  const input=z.object({
    reference:z.string().trim().min(2).max(200),
    note:z.string().trim().max(1500).default(''),
  }).parse(req.body);
  const result=await settleManualRefund(positiveId.parse(req.params.id),adminId,input.reference,input.note);
  res.json(result);
}));
