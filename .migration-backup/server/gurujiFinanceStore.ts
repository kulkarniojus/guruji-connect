import { z } from 'zod';
import { pool } from './db';

export const financeError=(status:number,message:string)=>Object.assign(new Error(message),{status});
export const indiaToday=(now=new Date())=>new Date(now.getTime()+330*60000).toISOString().slice(0,10);
export const cents=(value:any)=>Math.round(Number(value)*100);
export const rupees=(value:number)=>Math.round(value)/100;
export const dateInput=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
  const date=new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value && value>='2000-01-01' && value<='2100-12-31';
},'Enter a valid calendar date');
const monthInput=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).refine(v=>v>='2000-01'&&v<='2100-12','Invalid month');
const money=z.coerce.number().finite().positive().max(100000000).refine(v=>Math.abs(v*100-Math.round(v*100))<0.00001,'Use at most two decimal places');
export const positiveId=z.coerce.number().int().positive();
const occurredOn=dateInput.refine(value=>value<=indiaToday(),'A recorded transaction cannot be future-dated');
export const entryInput=z.object({
  gurujiId:positiveId,category:z.enum(['fine','expense','extra_charge','reimbursement','adjustment','settlement']),
  direction:z.enum(['guruji_owes_portal','portal_owes_guruji']),amount:money,occurredOn,
  description:z.string().trim().min(5).max(2000),bookingId:positiveId.nullable().optional(),
  reference:z.string().trim().max(250).default(''),
}).refine(v=>v.category!=='settlement'||v.reference.length>=3,{path:['reference'],message:'Enter the reference for the actual settlement payment'});
export const receiptInput=z.object({
  bookingId:positiveId,receivedBy:z.enum(['portal','guruji']),amount:money,receivedOn:occurredOn,
  reference:z.string().trim().min(3).max(250),notes:z.string().trim().max(2000).default(''),
});
export const recurringInput=z.object({
  name:z.string().trim().min(3).max(150),amount:money,dayOfMonth:z.coerce.number().int().min(1).max(31),
  startMonth:monthInput,endMonth:monthInput.nullable().optional().default(null),
  gurujiIds:z.array(positiveId).min(1).max(1000).nullable(),isActive:z.boolean(),
}).refine(v=>!v.endMonth||v.endMonth>=v.startMonth,{path:['endMonth'],message:'End month must not precede start month'})
  .refine(v=>v.startMonth>=`${Number(indiaToday().slice(0,4))-10}-01`,{path:['startMonth'],message:'Start month cannot be more than ten years ago'});
export const caseInput=z.object({
  gurujiId:positiveId,title:z.string().trim().min(5).max(200),
  kind:z.enum(['fraud','withdrawals','payment','other']),severity:z.enum(['low','medium','high']),
  status:z.enum(['open','investigating','confirmed','dismissed','resolved']),bookingId:positiveId.nullable().optional(),
  notes:z.string().trim().min(5).max(5000),evidenceReference:z.string().trim().max(2000).default(''),
});
export const reasonInput=z.object({reason:z.string().trim().min(5).max(2000)});

export async function initializeGurujiFinance() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guruji_finance_recurring (
      id serial PRIMARY KEY,name text NOT NULL,amount numeric(14,2) NOT NULL CHECK(amount>0),
      day_of_month integer NOT NULL CHECK(day_of_month BETWEEN 1 AND 31),start_month text NOT NULL,end_month text,
      guruji_ids integer[],is_active boolean NOT NULL DEFAULT true,created_by integer REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT NOW(),updated_at timestamptz NOT NULL DEFAULT NOW(),archived_at timestamptz
    );
    CREATE TABLE IF NOT EXISTS guruji_finance_ledger (
      id serial PRIMARY KEY,guruji_id integer NOT NULL REFERENCES guruji_profiles(id),
      category text NOT NULL,direction text NOT NULL CHECK(direction IN ('guruji_owes_portal','portal_owes_guruji')),
      amount numeric(14,2) NOT NULL CHECK(amount>0),signed_amount numeric(14,2) NOT NULL,
      occurred_on date NOT NULL,description text NOT NULL,reference text NOT NULL DEFAULT '',
      booking_id integer REFERENCES bookings(id) ON DELETE SET NULL,source_type text NOT NULL DEFAULT 'manual',source_id text,
      recurring_rule_id integer REFERENCES guruji_finance_recurring(id),period text,
      reverses_id integer UNIQUE REFERENCES guruji_finance_ledger(id),
      created_by integer REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE(recurring_rule_id,guruji_id,period)
    );
    CREATE INDEX IF NOT EXISTS guruji_finance_ledger_date ON guruji_finance_ledger(guruji_id,occurred_on);
    CREATE TABLE IF NOT EXISTS guruji_finance_receipts (
      id serial PRIMARY KEY,booking_id integer NOT NULL REFERENCES bookings(id),
      guruji_id integer REFERENCES guruji_profiles(id),received_by text NOT NULL CHECK(received_by IN ('portal','guruji')),
      amount numeric(14,2) NOT NULL CHECK(amount>0),received_on date NOT NULL,reference text NOT NULL,
      notes text NOT NULL DEFAULT '',created_by integer REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT NOW(),
      voided_at timestamptz,voided_by integer REFERENCES users(id),void_reason text
    );
    CREATE INDEX IF NOT EXISTS guruji_finance_receipts_booking ON guruji_finance_receipts(booking_id);
    CREATE UNIQUE INDEX IF NOT EXISTS guruji_finance_receipt_reference
      ON guruji_finance_receipts(booking_id,received_by,reference) WHERE voided_at IS NULL;
    CREATE TABLE IF NOT EXISTS guruji_finance_recognitions (
      source_key text PRIMARY KEY,guruji_id integer NOT NULL REFERENCES guruji_profiles(id),
      signed_amount numeric(14,2) NOT NULL,updated_at timestamptz NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS guruji_finance_cases (
      id serial PRIMARY KEY,guruji_id integer NOT NULL REFERENCES guruji_profiles(id),title text NOT NULL,
      kind text NOT NULL,severity text NOT NULL,status text NOT NULL,
      booking_id integer REFERENCES bookings(id) ON DELETE SET NULL,notes text NOT NULL,evidence_reference text NOT NULL DEFAULT '',
      created_by integer REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT NOW(),updated_at timestamptz NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS guruji_finance_case_history (
      id serial PRIMARY KEY,case_id integer NOT NULL REFERENCES guruji_finance_cases(id),status text NOT NULL,notes text NOT NULL,
      actor_id integer REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT NOW()
    );
  `);
}
export async function requireGuruji(client:{query:any},id:number) {
  if(!(await client.query(`SELECT g.id FROM guruji_profiles g JOIN users u ON u.id=g."userId" WHERE g.id=$1 AND u.role='guruji'`,[id])).rows.length)
    throw financeError(404,'Guruji profile not found');
}
export async function requireBooking(client:{query:any},id:number,gurujiId?:number) {
  const booking=(await client.query('SELECT * FROM bookings WHERE id=$1',[id])).rows[0];
  if(!booking) throw financeError(404,'Booking not found');
  if(gurujiId && booking.gurujiId!==gurujiId &&
      !(await client.query('SELECT id FROM booking_cancellation_events WHERE booking_id=$1 AND previous_guruji_id=$2 LIMIT 1',[id,gurujiId])).rows.length)
    throw financeError(400,'That booking does not belong to this Guruji');
  return booking;
}
export async function postFinanceEntry(client:{query:any},input:{
  gurujiId:number;signedCents:number;category:string;occurredOn:string;description:string;reference?:string;
  bookingId?:number|null;sourceType?:string;sourceId?:string;ruleId?:number;period?:string;reversesId?:number;actorId?:number;
}) {
  if(!Number.isSafeInteger(input.signedCents)||input.signedCents===0) throw financeError(400,'Invalid transaction amount');
  return (await client.query(`INSERT INTO guruji_finance_ledger
    (guruji_id,category,direction,amount,signed_amount,occurred_on,description,reference,booking_id,source_type,source_id,recurring_rule_id,period,reverses_id,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [input.gurujiId,input.category,input.signedCents>0?'guruji_owes_portal':'portal_owes_guruji',
      rupees(Math.abs(input.signedCents)),rupees(input.signedCents),input.occurredOn,input.description,input.reference||'',
      input.bookingId??null,input.sourceType||'manual',input.sourceId??null,input.ruleId??null,input.period??null,
      input.reversesId??null,input.actorId??null])).rows[0];
}
export function savedAllocation(booking:any) {
  const snapshot=booking.commission_snapshot;
  if(!snapshot || !Number.isFinite(Number(snapshot.portalAmount)) || !Number.isFinite(Number(snapshot.gurujiAmount)) ||
    snapshot.portalAmount===null || snapshot.gurujiAmount===null) return null;
  const portal=cents(snapshot.portalAmount),guruji=cents(snapshot.gurujiAmount);
  if(portal<0||guruji<0||portal+guruji!==cents(booking.totalAmount))return null;
  return {portal,guruji,percentage:Number(snapshot.percentage)};
}
export function receiptSettlement(booking:any,receipts:any[]) {
  const active=receipts.filter(r=>!r.voided_at);
  const portal=active.filter(r=>r.received_by==='portal').reduce((n,r)=>n+cents(r.amount),0);
  const guruji=active.filter(r=>r.received_by==='guruji').reduce((n,r)=>n+cents(r.amount),0);
  const allocation=savedAllocation(booking),total=portal+guruji;
  const manual=active.some(r=>r.received_by==='guruji' && r.guruji_id!==booking.gurujiId);
  const status=manual?'manual_review_required':!allocation?'missing_allocation':booking.status!=='completed'?'not_completed':
    total===0?'unrecorded':total!==cents(booking.totalAmount)?'partial':'reconciled';
  return {portal,guruji,total,outstanding:Math.max(0,cents(booking.totalAmount)-total),status,allocation,
    signedTarget:status==='reconciled'?guruji-allocation!.guruji:0};
}
