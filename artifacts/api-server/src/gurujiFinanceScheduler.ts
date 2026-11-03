import { pool } from './db';
import { cents,indiaToday,postFinanceEntry,receiptSettlement,rupees } from './gurujiFinanceStore';

export function recurringDueDate(period:string,day:number) {
  const [year,month]=period.split('-').map(Number);
  const last=new Date(Date.UTC(year,month,0)).getUTCDate();
  return `${period}-${String(Math.min(day,last)).padStart(2,'0')}`;
}
export function duePeriods(start:string,end:string|null,day:number,today:string) {
  const result:{period:string;date:string}[]=[];
  let period=start;
  while(period<=today.slice(0,7) && (!end||period<=end)) {
    const date=recurringDueDate(period,day);
    if(date<=today)result.push({period,date});
    const [y,m]=period.split('-').map(Number);
    period=m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`;
    if(result.length>1300)throw new Error('Recurring schedule is too long');
  }
  return result;
}
async function recognize(client:any,key:string,gurujiId:number,signedCents:number,category:string,bookingId:number,today:string,description:string) {
  const old=(await client.query('SELECT * FROM guruji_finance_recognitions WHERE source_key=$1',[key])).rows[0];
  const previous=old?cents(old.signed_amount):0;
  if(old && old.guruji_id!==gurujiId && previous!==0) {
    await postFinanceEntry(client,{gurujiId:old.guruji_id,signedCents:-previous,category,occurredOn:today,description:`Correction: ${description}`,
      bookingId,sourceType:category,sourceId:key});
  }
  const delta=signedCents-(old?.guruji_id===gurujiId?previous:0);
  if(delta)await postFinanceEntry(client,{gurujiId,signedCents:delta,category,occurredOn:today,description,bookingId,sourceType:category,sourceId:key});
  await client.query(`INSERT INTO guruji_finance_recognitions(source_key,guruji_id,signed_amount) VALUES($1,$2,$3)
    ON CONFLICT(source_key) DO UPDATE SET guruji_id=EXCLUDED.guruji_id,signed_amount=EXCLUDED.signed_amount,updated_at=NOW()`,
    [key,gurujiId,rupees(signedCents)]);
  return delta!==0;
}
export async function runGurujiFinanceMaintenance(now=new Date()) {
  const client=await pool.connect(),today=indiaToday(now);
  let posted=0,reconciled=0;
  try {
    await client.query('BEGIN');
    const lock=(await client.query('SELECT pg_try_advisory_xact_lock(8172,0) AS acquired')).rows[0];
    if(!lock.acquired){await client.query('ROLLBACK');return{posted,reconciled,busy:true};}
    const rules=(await client.query('SELECT * FROM guruji_finance_recurring WHERE is_active=true AND archived_at IS NULL ORDER BY id')).rows;
    for(const rule of rules) {
      const targets=(await client.query(`SELECT g.id,g."createdAt" FROM guruji_profiles g JOIN users u ON u.id=g."userId"
        WHERE (u.role='guruji' OR EXISTS(
          SELECT 1 FROM other_category_applications a WHERE a.profile_id=g.id AND a.status='approved'
        )) AND (CASE WHEN $1::integer[] IS NULL THEN
          u.role='guruji' AND g.status='approved' AND u."isBlocked"=false
          ELSE g.id=ANY($1::integer[]) END)`,
        [rule.guruji_ids])).rows;
      for(const period of duePeriods(rule.start_month,rule.end_month,rule.day_of_month,today)) {
        for(const target of targets) {
          if(target.createdAt && period.period<indiaToday(new Date(target.createdAt)).slice(0,7))continue;
          if((await client.query('SELECT id FROM guruji_finance_ledger WHERE recurring_rule_id=$1 AND guruji_id=$2 AND period=$3',
            [rule.id,target.id,period.period])).rows.length)continue;
          await postFinanceEntry(client,{gurujiId:target.id,signedCents:cents(rule.amount),category:'monthly_deduction',
            occurredOn:period.date,description:`${rule.name} — ${period.period}`,sourceType:'recurring',
            sourceId:String(rule.id),ruleId:rule.id,period:period.period});
          posted++;
        }
      }
    }
    // Proposed withdrawal fees do not become liabilities before admin review.
    const events=(await client.query(`SELECT * FROM booking_cancellation_events WHERE user_type='guruji'
      AND previous_guruji_id IS NOT NULL AND (status IN ('reviewed','approved') OR (status='recorded' AND reviewed_by IS NOT NULL))
      AND kind IN ('guruji_withdrawal','admin_reassignment','admin_cancel') ORDER BY id`)).rows;
    for(const event of events) {
      if(await recognize(client,`cancellation:${event.id}`,event.previous_guruji_id,cents(event.charge),'cancellation_charge',
        event.booking_id,today,`Reviewed cancellation charge for booking #${event.booking_id} (review #${event.id})`))reconciled++;
    }
    // Only actual recorded receipts and a saved allocation can create a cash
    // settlement. No receipt, unknown allocation or partial payment => no guess.
    const bookings=(await client.query(`SELECT b.* FROM bookings b WHERE b."gurujiId" IS NOT NULL AND
      (EXISTS(SELECT 1 FROM guruji_finance_receipts r WHERE r.booking_id=b.id) OR
       EXISTS(SELECT 1 FROM guruji_finance_recognitions x WHERE x.source_key='booking:'||b.id::text))
      ORDER BY b.id FOR UPDATE`)).rows;
    const receipts=(await client.query('SELECT * FROM guruji_finance_receipts')).rows;
    for(const booking of bookings) {
      const settlement=receiptSettlement(booking,receipts.filter(r=>r.booking_id===booking.id));
      if(await recognize(client,`booking:${booking.id}`,booking.gurujiId,settlement.signedTarget,'booking_settlement',booking.id,today,
        `Recorded customer collections reconciled against saved shares for booking #${booking.id}`))reconciled++;
    }
    await client.query('COMMIT');
    return{posted,reconciled,busy:false};
  }catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}
let started=false;
export function startGurujiFinanceScheduler() {
  if(started)return;
  started=true;
  const run=()=>void runGurujiFinanceMaintenance().catch(error=>console.error('Guruji finance maintenance failed:',error.message));
  run();
  // Catch up missed due dates on startup; runs are idempotent across servers.
  const timer=setInterval(run,60*60*1000);
  timer.unref();
}
