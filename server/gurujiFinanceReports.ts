import { pool } from './db';
import { cents,dateInput,financeError,indiaToday,receiptSettlement,rupees,savedAllocation } from './gurujiFinanceStore';

export function financeRange(query:any) {
  const to=dateInput.parse(query.to||indiaToday()),from=dateInput.parse(query.from||`${to.slice(0,7)}-01`);
  if(from>to)throw financeError(400,'From date must not follow To date');
  const gurujiId=query.gurujiId?Number(query.gurujiId):null;
  if(gurujiId!==null && (!Number.isSafeInteger(gurujiId)||gurujiId<=0))throw financeError(400,'Invalid Guruji selection');
  return{from,to,gurujiId,search:String(query.search||'').trim().slice(0,200)};
}
const person=(row:any)=>`${row.firstName||''} ${row.lastName||''}`.trim();
const day=(value:any)=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10);
const indianDay=(value:any)=>new Date(new Date(value).getTime()+330*60000).toISOString().slice(0,10);
const within=(value:string,range:any)=>value>=range.from && value<=range.to;
export async function gurujiFinanceReport(query:any) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const result=await buildFinanceReport(client,query);
    await client.query('COMMIT');
    return result;
  }catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}
async function buildFinanceReport(db:Pick<typeof pool,'query'>,query:any) {
  const range=financeRange(query);
  const directory=(await db.query(`SELECT g.id,g."userId",g.city,g.status,u."firstName",u."lastName"
    FROM guruji_profiles g JOIN users u ON u.id=g."userId" WHERE u.role='guruji'
    ORDER BY u."firstName",u."lastName",g.id`)).rows;
  const profiles=directory.filter(p=>(!range.gurujiId||p.id===range.gurujiId) &&
    (!range.search||`${p.firstName} ${p.lastName} ${p.city} ${p.id}`.toLowerCase().includes(range.search.toLowerCase())));
  const ids=profiles.map(p=>p.id),nameById=new Map(profiles.map(p=>[p.id,person(p)]));
  const [ledgerResult,receiptResult,bookingResult,eventResult,recurringResult,caseResult,historyResult]=await Promise.all([
    db.query(`SELECT l.*,l.occurred_on::text AS day,EXISTS(SELECT 1 FROM guruji_finance_ledger r WHERE r.reverses_id=l.id) AS reversed
      FROM guruji_finance_ledger l WHERE l.guruji_id=ANY($1::integer[]) AND l.occurred_on<=$2 ORDER BY l.occurred_on DESC,l.id DESC`,[ids,range.to]),
    db.query(`SELECT r.*,r.received_on::text AS day,b."gurujiId" AS current_guruji_id FROM guruji_finance_receipts r
      JOIN bookings b ON b.id=r.booking_id WHERE (b."gurujiId"=ANY($1::integer[]) OR r.guruji_id=ANY($1::integer[])
      OR ($2::boolean AND b."gurujiId" IS NULL)) ORDER BY r.received_on DESC,r.id DESC`,[ids,!range.gurujiId&&!range.search]),
    db.query(`SELECT b.*,b.date::text AS day,p.name AS puja_name FROM bookings b LEFT JOIN pujas p ON p.id=b."pujaId"
      WHERE b.date BETWEEN $1 AND $2 AND (b."gurujiId"=ANY($3::integer[]) OR ($4::boolean AND b."gurujiId" IS NULL))
      ORDER BY b.date DESC,b.id DESC`,[range.from,range.to,ids,!range.gurujiId&&!range.search]),
    db.query(`SELECT * FROM booking_cancellation_events WHERE user_type='guruji' AND previous_guruji_id=ANY($1::integer[])`,[ids]),
    db.query(`SELECT r.*,(SELECT COUNT(*)::integer FROM guruji_finance_ledger l WHERE l.recurring_rule_id=r.id) AS posted_count
      FROM guruji_finance_recurring r ORDER BY r.id DESC`),
    db.query('SELECT * FROM guruji_finance_cases WHERE guruji_id=ANY($1::integer[]) ORDER BY updated_at DESC,id DESC',[ids]),
    db.query(`SELECT h.*,CONCAT(u."firstName",' ',u."lastName") AS actor_name FROM guruji_finance_case_history h
      LEFT JOIN users u ON u.id=h.actor_id JOIN guruji_finance_cases c ON c.id=h.case_id WHERE c.guruji_id=ANY($1::integer[]) ORDER BY h.id`,[ids]),
  ]);
  const ledger=ledgerResult.rows.map(l=>({id:l.id,gurujiId:l.guruji_id,gurujiName:nameById.get(l.guruji_id)||'',
    category:l.category,direction:l.direction,amount:Number(l.amount),signedAmount:Number(l.signed_amount),
    occurredOn:l.day,description:l.description,reference:l.reference,bookingId:l.booking_id,
    sourceType:l.source_type,sourceId:l.source_id,period:l.period,reversesId:l.reverses_id,isReversed:l.reversed,createdAt:l.created_at}));
  const receipts=receiptResult.rows.map(r=>({id:r.id,bookingId:r.booking_id,gurujiId:r.received_by==='guruji'?r.guruji_id:r.current_guruji_id,
    gurujiName:nameById.get(r.received_by==='guruji'?r.guruji_id:r.current_guruji_id)||'Unassigned',receivedBy:r.received_by,
    amount:Number(r.amount),receivedOn:r.day,reference:r.reference,notes:r.notes,voidedAt:r.voided_at,voidReason:r.void_reason}));
  const bookings=bookingResult.rows.map(b=>{
    const settlement=receiptSettlement(b,receiptResult.rows.filter(r=>r.booking_id===b.id && r.day<=range.to));
    const allocation=savedAllocation(b);
    return{id:b.id,gurujiId:b.gurujiId,gurujiName:nameById.get(b.gurujiId)||'Unassigned',pujaName:b.puja_name||'Puja',date:b.day,
      status:b.status,amount:Number(b.totalAmount),portalAllocation:allocation?rupees(allocation.portal):null,
      gurujiAllocation:allocation?rupees(allocation.guruji):null,commissionPercentage:allocation?.percentage??null,
      portalReceipts:rupees(settlement.portal),gurujiReceipts:rupees(settlement.guruji),
      customerOutstanding:rupees(settlement.outstanding),settlementStatus:settlement.status,
      postedSettlementSignedAmount:rupees(ledger.filter(l=>l.sourceType==='booking_settlement'&&l.bookingId===b.id).reduce((n,l)=>n+cents(l.signedAmount),0))};
  });
  const cases=caseResult.rows.map(c=>({id:c.id,gurujiId:c.guruji_id,gurujiName:nameById.get(c.guruji_id)||'',title:c.title,
    kind:c.kind,severity:c.severity,status:c.status,bookingId:c.booking_id,notes:c.notes,evidenceReference:c.evidence_reference,
    createdAt:c.created_at,updatedAt:c.updated_at,history:historyResult.rows.filter(h=>h.case_id===c.id)
      .map(h=>({status:h.status,notes:h.notes,createdAt:h.created_at,actorName:h.actor_name}))}));
  const gurujis=profiles.map(p=>{
    const own=bookings.filter(b=>b.gurujiId===p.id),completed=own.filter(b=>b.status==='completed');
    const events=eventResult.rows.filter(e=>e.previous_guruji_id===p.id && within(indianDay(e.created_at),range));
    const pending=eventResult.rows.filter(e=>e.previous_guruji_id===p.id && !e.reviewed_by && e.status==='recorded');
    const reviewed=events.filter(e=>e.reviewed_by!=null||e.status==='reviewed');
    const ownCases=cases.filter(c=>c.gurujiId===p.id),ownReceipts=receipts.filter(r=>r.gurujiId===p.id&&!r.voidedAt&&within(r.receivedOn,range));
    const sum=(rows:any[],key:string)=>rupees(rows.reduce((n,r)=>n+cents(r[key]??0),0));
    return{id:p.id,userId:p.userId,firstName:p.firstName,lastName:p.lastName,city:p.city,status:p.status,
      bookingCount:own.length,completedCount:completed.length,withdrawalCount:events.filter(e=>e.kind==='guruji_withdrawal').length,
      bookedAmount:sum(own,'amount'),portalAllocation:sum(completed,'portalAllocation'),gurujiAllocation:sum(completed,'gurujiAllocation'),
      unallocatedCount:completed.filter(b=>b.portalAllocation===null).length,
      portalReceipts:sum(ownReceipts.filter(r=>r.receivedBy==='portal'),'amount'),gurujiReceipts:sum(ownReceipts.filter(r=>r.receivedBy==='guruji'),'amount'),
      customerOutstanding:sum(own.filter(b=>b.status!=='cancelled'),'customerOutstanding'),
      proposedCancellationCharges:sum(pending,'charge'),reviewedCancellationCharges:sum(reviewed,'charge'),
      netBalance:sum(ledger.filter(l=>l.gurujiId===p.id),'signedAmount'),
      openCases:ownCases.filter(c=>['open','investigating'].includes(c.status)).length,
      confirmedFraudCases:ownCases.filter(c=>c.kind==='fraud'&&c.status==='confirmed').length};
  });
  const summaries=['bookingCount','completedCount','withdrawalCount','bookedAmount','portalAllocation','gurujiAllocation',
    'unallocatedCount','portalReceipts','gurujiReceipts','customerOutstanding','proposedCancellationCharges','reviewedCancellationCharges','netBalance','openCases','confirmedFraudCases'];
  const summary:any={};
  for(const key of summaries)summary[key]=rupees(gurujis.reduce((n,g:any)=>n+cents(g[key]),0));
  summary.gurujiOwesPortal=rupees(gurujis.reduce((n,g)=>n+Math.max(0,cents(g.netBalance)),0));
  summary.portalOwesGuruji=rupees(gurujis.reduce((n,g)=>n+Math.max(0,-cents(g.netBalance)),0));
  const grouped=(weekly:boolean)=>{
    const groups=new Map<string,any>();
    function group(date:string) {
      const d=new Date(`${date}T00:00:00Z`);
      if(weekly)d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
      const key=weekly?d.toISOString().slice(0,10):date.slice(0,7);
      if(!groups.has(key))groups.set(key,{period:key,completedCount:0,withdrawalCount:0,portalAllocation:0,gurujiAllocation:0,charges:0,settlementsReceived:0,settlementsPaid:0});
      return groups.get(key);
    }
    for(const b of bookings)if(b.status==='completed'){
      const g=group(b.date);g.completedCount++;g.portalAllocation+=cents(b.portalAllocation??0);g.gurujiAllocation+=cents(b.gurujiAllocation??0);
    }
    for(const event of eventResult.rows)if(event.kind==='guruji_withdrawal'&&within(indianDay(event.created_at),range))group(indianDay(event.created_at)).withdrawalCount++;
    for(const entry of ledger)if(within(entry.occurredOn,range)){
      const g=group(entry.occurredOn);
      const original=entry.reversesId?ledger.find(l=>l.id===entry.reversesId):entry;
      if(original?.category==='settlement') {
        if(original.signedAmount<0)g.settlementsReceived-=cents(entry.signedAmount);else g.settlementsPaid+=cents(entry.signedAmount);
      }else if(entry.sourceType!=='booking_settlement')g.charges+=cents(entry.signedAmount);
    }
    return Array.from(groups.values()).sort((a,b)=>b.period.localeCompare(a.period)).map(g=>({...g,
      ...Object.fromEntries(['portalAllocation','gurujiAllocation','charges','settlementsReceived','settlementsPaid'].map(k=>[k,rupees(g[k])]))}));
  };
  return{range:{from:range.from,to:range.to},summary,gurujis,directory,ledger:ledger.filter(l=>within(l.occurredOn,range)),
    receipts:receipts.filter(r=>within(r.receivedOn,range)),bookings,cases,
    recurringRules:recurringResult.rows.map(r=>({id:r.id,name:r.name,amount:Number(r.amount),dayOfMonth:r.day_of_month,
      startMonth:r.start_month,endMonth:r.end_month,gurujiIds:r.guruji_ids,isActive:r.is_active,archivedAt:r.archived_at,postedCount:r.posted_count})),
    weekly:grouped(true),monthly:grouped(false),
    notice:'Records only: no money is collected, transferred or deducted. Customer advance belongs to the portal; the balance is paid directly to Guruji. Enter actual receipts, not assumed 20–25% payments. Positive balance: Guruji owes portal; negative: portal owes Guruji. Balances include all postings through To date; booking performance uses scheduled service dates in the selected period. Unreviewed withdrawal fees are proposed only. Unknown historical allocations are excluded, never estimated.'};
}
export function financeCsv(rows:any[]) {
  const keys=Array.from(new Set(rows.flatMap(r=>Object.keys(r).filter(k=>!['history'].includes(k)))));
  const cell=(value:any)=>{
    let text=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);
    if(typeof value==='string' && (/^[\s]*[=+\-@]/.test(text)||/^[\t\r]/.test(text)))text=`'${text}`;
    return `"${text.replace(/"/g,'""')}"`;
  };
  return '\ufeff'+[keys.map(cell).join(','),...rows.map(row=>keys.map(k=>cell(row[k])).join(','))].join('\r\n');
}
