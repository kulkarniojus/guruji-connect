import { Router,type Request,type Response } from 'express';
import { ZodError } from 'zod';
import { pool } from '../db';
import { caseInput,cents,entryInput,financeError,indiaToday,positiveId,postFinanceEntry,reasonInput,receiptInput,recurringInput,requireBooking,requireGuruji } from '../gurujiFinanceStore';
import { gurujiFinanceReport,financeCsv } from '../gurujiFinanceReports';
import { runGurujiFinanceMaintenance } from '../gurujiFinanceScheduler';

export const gurujiFinanceRouter=Router();
const root='/api/admin/guruji-finance';
async function admin(req:Request) {
  if(!req.session.userId)throw financeError(401,'Please sign in');
  const user=(await pool.query('SELECT id,role,"isBlocked" FROM users WHERE id=$1',[req.session.userId])).rows[0];
  if(!user||user.role!=='admin'||user.isBlocked)throw financeError(403,'Admin access required');
  return user.id as number;
}
const endpoint=(fn:(req:Request,res:Response,actor:number)=>Promise<any>)=>async(req:Request,res:Response)=>{
  try{const actor=await admin(req);await fn(req,res,actor);}
  catch(error:any){
    if(error instanceof ZodError)return res.status(400).json({message:error.errors.map(e=>`${e.path.join('.')}: ${e.message}`).join('; ')});
    if(error.code==='23505')return res.status(409).json({message:'This record already exists or was already corrected. Refresh before retrying.'});
    if(!error.status)console.error('Guruji finance operation failed:',error.code||error.message);
    res.status(error.status||500).json({message:error.status?error.message:'Could not save or load the financial record. Please retry.'});
  }
};
async function transaction<T>(fn:(client:any)=>Promise<T>) {
  const client=await pool.connect();
  try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}
  catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}
gurujiFinanceRouter.get(root,endpoint(async(req,res)=>{
  await runGurujiFinanceMaintenance();
  res.json(await gurujiFinanceReport(req.query));
}));
gurujiFinanceRouter.get(`${root}/export`,endpoint(async(req,res)=>{
  await runGurujiFinanceMaintenance();
  const section=String(req.query.section||'gurujis');
  if(!['gurujis','ledger','bookings','weekly','monthly','cases'].includes(section))throw financeError(400,'Invalid export section');
  const report=await gurujiFinanceReport(req.query);
  res.type('text/csv').set('Content-Disposition',`attachment; filename="guruji-finance-${section}-${report.range.from}-${report.range.to}.csv"`)
    .send(financeCsv((report as any)[section]));
}));
gurujiFinanceRouter.post(`${root}/run`,endpoint(async(_req,res)=>{res.json(await runGurujiFinanceMaintenance());}));
gurujiFinanceRouter.post(`${root}/entries`,endpoint(async(req,res,actor)=>{
  const input=entryInput.parse(req.body);
  const result=await transaction(async client=>{
    await requireGuruji(client,input.gurujiId);
    if(input.bookingId)await requireBooking(client,input.bookingId,input.gurujiId);
    return postFinanceEntry(client,{...input,signedCents:cents(input.amount)*(input.direction==='guruji_owes_portal'?1:-1),actorId:actor});
  });
  res.status(201).json(result);
}));
gurujiFinanceRouter.post(`${root}/entries/:id/reverse`,endpoint(async(req,res,actor)=>{
  const id=positiveId.parse(req.params.id),{reason}=reasonInput.parse(req.body);
  res.status(201).json(await transaction(async client=>{
    const old=(await client.query('SELECT * FROM guruji_finance_ledger WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!old)throw financeError(404,'Ledger entry not found');
    if(old.reverses_id||!['manual','recurring'].includes(old.source_type))
      throw financeError(400,'Correct system charges in cancellation review or correct the customer receipt. Reversal records cannot be reversed.');
    if((await client.query('SELECT id FROM guruji_finance_ledger WHERE reverses_id=$1',[id])).rows.length)
      throw financeError(409,'This ledger entry has already been reversed');
    return postFinanceEntry(client,{gurujiId:old.guruji_id,signedCents:-cents(old.signed_amount),category:'reversal',
      occurredOn:indiaToday(),description:`Reversal of entry #${id}: ${reason}`,reference:old.reference,
      bookingId:old.booking_id,sourceType:'reversal',sourceId:String(id),reversesId:id,actorId:actor});
  }));
}));
gurujiFinanceRouter.post(`${root}/receipts`,endpoint(async(req,res,actor)=>{
  const input=receiptInput.parse(req.body);
  const result=await transaction(async client=>{
    await client.query('SELECT pg_advisory_xact_lock(8158,$1)',[input.bookingId]);
    const booking=await requireBooking(client,input.bookingId);
    if(booking.status==='cancelled')throw financeError(409,'Do not add a new receipt to a cancelled booking. Review refunds or corrections separately.');
    if(input.receivedBy==='guruji' && !booking.gurujiId)throw financeError(400,'Assign a Guruji before recording direct Guruji collections');
    const collected=cents((await client.query('SELECT COALESCE(SUM(amount),0) AS total FROM guruji_finance_receipts WHERE booking_id=$1 AND voided_at IS NULL',[input.bookingId])).rows[0].total);
    if(collected+cents(input.amount)>cents(booking.totalAmount))throw financeError(400,'Recorded customer receipts cannot exceed the saved booking total');
    return (await client.query(`INSERT INTO guruji_finance_receipts(booking_id,guruji_id,received_by,amount,received_on,reference,notes,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [input.bookingId,input.receivedBy==='guruji'?booking.gurujiId:null,input.receivedBy,input.amount,input.receivedOn,input.reference,input.notes,actor])).rows[0];
  });
  await runGurujiFinanceMaintenance();
  res.status(201).json(result);
}));
gurujiFinanceRouter.post(`${root}/receipts/:id/void`,endpoint(async(req,res,actor)=>{
  const id=positiveId.parse(req.params.id),{reason}=reasonInput.parse(req.body);
  await transaction(async client=>{
    const old=(await client.query('SELECT * FROM guruji_finance_receipts WHERE id=$1',[id])).rows[0];
    if(!old)throw financeError(404,'Receipt not found');
    await client.query('SELECT pg_advisory_xact_lock(8158,$1)',[old.booking_id]);
    if ((await client.query(`SELECT id FROM portal_checkout_orders WHERE booking_id=$1 AND stripe_payment_intent_id=$2`,
      [old.booking_id,old.reference])).rows.length)
      throw financeError(409,'This is a verified Stripe collection and cannot be voided. Record an actual refund separately in Customer Activity.');
    if ((await client.query(`SELECT id FROM customer_finance_entries WHERE booking_id=$1 AND type='refund' LIMIT 1`,
      [old.booking_id])).rows.length)
      throw financeError(409,'This booking has a recorded paid refund. Its source receipt cannot be voided without an audited refund correction.');
    const changed=await client.query('UPDATE guruji_finance_receipts SET voided_at=NOW(),voided_by=$2,void_reason=$3 WHERE id=$1 AND voided_at IS NULL RETURNING id',[id,actor,reason]);
    if(!changed.rows.length)throw financeError(409,'Receipt was already voided');
  });
  await runGurujiFinanceMaintenance();
  res.json({message:'Receipt corrected. No refund or money transfer was made.'});
}));
async function saveRecurring(req:Request,res:Response,actor:number,editing:boolean) {
  const input=recurringInput.parse(req.body),id=editing?positiveId.parse(req.params.id):null;
  const result=await transaction(async client=>{
    // Use the same lock as posting to prevent an edit/archive racing a due run.
    await client.query('SELECT pg_advisory_xact_lock(8172,0)');
    if(input.gurujiIds)for(const target of Array.from(new Set(input.gurujiIds)))await requireGuruji(client,target);
    if(editing && !(await client.query('SELECT id FROM guruji_finance_recurring WHERE id=$1 AND archived_at IS NULL FOR UPDATE',[id])).rows.length)
      throw financeError(404,'Active recurring schedule not found');
    const values=[input.name,input.amount,input.dayOfMonth,input.startMonth,input.endMonth,input.gurujiIds?Array.from(new Set(input.gurujiIds)):null,input.isActive,actor];
    return editing?(await client.query(`UPDATE guruji_finance_recurring SET name=$1,amount=$2,day_of_month=$3,start_month=$4,end_month=$5,
      guruji_ids=$6,is_active=$7,created_by=COALESCE(created_by,$8),updated_at=NOW() WHERE id=$9 RETURNING id`,[...values,id])).rows[0]:
      (await client.query(`INSERT INTO guruji_finance_recurring(name,amount,day_of_month,start_month,end_month,guruji_ids,is_active,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,values)).rows[0];
  });
  await runGurujiFinanceMaintenance();
  res.status(editing?200:201).json(result);
}
gurujiFinanceRouter.post(`${root}/recurring`,endpoint((req,res,actor)=>saveRecurring(req,res,actor,false)));
gurujiFinanceRouter.put(`${root}/recurring/:id`,endpoint((req,res,actor)=>saveRecurring(req,res,actor,true)));
gurujiFinanceRouter.delete(`${root}/recurring/:id`,endpoint(async(req,res)=>{
  const id=positiveId.parse(req.params.id);
  await transaction(async client=>{
    await client.query('SELECT pg_advisory_xact_lock(8172,0)');
    if(!(await client.query('UPDATE guruji_finance_recurring SET is_active=false,archived_at=NOW(),updated_at=NOW() WHERE id=$1 AND archived_at IS NULL RETURNING id',[id])).rows.length)
      throw financeError(404,'Schedule not found or already archived');
  });
  res.json({message:'Schedule archived; existing postings retained'});
}));
async function saveCase(req:Request,res:Response,actor:number,editing:boolean) {
  const input=caseInput.parse(req.body),id=editing?positiveId.parse(req.params.id):null;
  const result=await transaction(async client=>{
    await requireGuruji(client,input.gurujiId);
    if(input.bookingId)await requireBooking(client,input.bookingId,input.gurujiId);
    if(editing && !(await client.query('SELECT id FROM guruji_finance_cases WHERE id=$1 FOR UPDATE',[id])).rows.length)throw financeError(404,'Case not found');
    const values=[input.gurujiId,input.title,input.kind,input.severity,input.status,input.bookingId??null,input.notes,input.evidenceReference,actor];
    const row=editing?(await client.query(`UPDATE guruji_finance_cases SET guruji_id=$1,title=$2,kind=$3,severity=$4,status=$5,
      booking_id=$6,notes=$7,evidence_reference=$8,updated_at=NOW() WHERE id=$10 AND $9::integer IS NOT NULL RETURNING id`,[...values,id])).rows[0]:
      (await client.query(`INSERT INTO guruji_finance_cases(guruji_id,title,kind,severity,status,booking_id,notes,evidence_reference,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,values)).rows[0];
    await client.query(`INSERT INTO guruji_finance_case_history(case_id,status,notes,actor_id) VALUES($1,$2,$3,$4)`,
      [row.id,input.status,`Guruji #${input.gurujiId}; ${input.kind}; ${input.severity}\n${input.title}\n${input.notes}${input.evidenceReference?`\nEvidence: ${input.evidenceReference}`:''}`,actor]);
    return row;
  });
  res.status(editing?200:201).json(result);
}
gurujiFinanceRouter.post(`${root}/cases`,endpoint((req,res,actor)=>saveCase(req,res,actor,false)));
gurujiFinanceRouter.put(`${root}/cases/:id`,endpoint((req,res,actor)=>saveCase(req,res,actor,true)));
