import { randomUUID } from 'node:crypto';
import { pool } from './db';
import { bookingCustomerFunds } from './customerFinance';
import { createCashfreeRefund, getCashfreeRefund } from './cashfreeClient';

type DbClient = { query: (sql: string, values?: unknown[]) => Promise<any> };
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });

export async function initializeCustomerRefunds() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_refund_requests (
      id serial PRIMARY KEY,
      booking_id integer UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
      event_registration_id uuid UNIQUE REFERENCES event_registrations(id) ON DELETE CASCADE,
      customer_id integer NOT NULL REFERENCES users(id),
      amount_paise bigint NOT NULL CHECK(amount_paise > 0),
      source_kind text NOT NULL CHECK(source_kind IN ('stripe','cashfree','manual','mixed')),
      stripe_amount_paise bigint NOT NULL DEFAULT 0 CHECK(stripe_amount_paise >= 0),
      cashfree_amount_paise bigint NOT NULL DEFAULT 0 CHECK(cashfree_amount_paise >= 0),
      manual_amount_paise bigint NOT NULL DEFAULT 0 CHECK(manual_amount_paise >= 0),
      stripe_payment_intent_id text,
      stripe_session_id text,
      cashfree_order_id text,
      cashfree_refund_id text,
      cashfree_failure text,
      status text NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','processing','manual_pending','paid','failed')),
      reason text NOT NULL,
      stripe_refund_id text,
      stripe_failure text,
      manual_reference text,
      approved_by integer REFERENCES users(id),
      approved_at timestamptz,
      settled_by integer REFERENCES users(id),
      settled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK (num_nonnulls(booking_id,event_registration_id) = 1),
      CHECK (stripe_amount_paise + cashfree_amount_paise + manual_amount_paise = amount_paise)
    );
    ALTER TABLE customer_refund_requests
      ADD COLUMN IF NOT EXISTS cashfree_amount_paise bigint NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cashfree_order_id text,
      ADD COLUMN IF NOT EXISTS cashfree_refund_id text,
      ADD COLUMN IF NOT EXISTS cashfree_failure text;
    DO $$ DECLARE item record; BEGIN
      FOR item IN SELECT conname FROM pg_constraint
        WHERE conrelid='customer_refund_requests'::regclass AND contype='c'
          AND (pg_get_constraintdef(oid) ILIKE '%source_kind%'
            OR pg_get_constraintdef(oid) ILIKE '%stripe_amount_paise%manual_amount_paise%')
      LOOP EXECUTE format('ALTER TABLE customer_refund_requests DROP CONSTRAINT %I',item.conname); END LOOP;
    END $$;
    ALTER TABLE customer_refund_requests
      ADD CONSTRAINT customer_refund_source_kind_check CHECK(source_kind IN ('stripe','cashfree','manual','mixed')),
      ADD CONSTRAINT customer_refund_amount_split_check
        CHECK(stripe_amount_paise + cashfree_amount_paise + manual_amount_paise = amount_paise);
    CREATE INDEX IF NOT EXISTS customer_refund_requests_status ON customer_refund_requests(status,created_at);
  `);
}

function asPaise(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw fail(409, 'The recorded refund amount is invalid. Review the booking payment records.');
  return Math.round(amount * 100);
}

async function notifyAdmins(client: DbClient, title: string, message: string) {
  await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
    SELECT id,$1,$2,'payment',false,now() FROM users WHERE role='admin' AND NOT "isBlocked"`, [title,message]);
}

export async function createBookingRefundRequest(client: DbClient, booking: any, reason: string, funds?: any) {
  funds ??= await bookingCustomerFunds(client, booking);
  const amountPaise = asPaise(funds.refundOwed);
  if (amountPaise <= 0) return null;

  const order = (await client.query(`SELECT o.cashfree_order_id,o.payment_provider,o.livemode,
      COALESCE(SUM(CASE WHEN p.status IN ('paid','partial') AND p.method='cashfree' THEN p.amount ELSE 0 END),0) AS cashfree_paid
    FROM portal_checkout_orders o LEFT JOIN payments p ON p."bookingId"=o.booking_id
    WHERE o.booking_id=$1 GROUP BY o.id`, [booking.id])).rows[0];
  const cashfreeAmountPaise = order?.payment_provider==='cashfree' && order.livemode && order.cashfree_order_id
    ? Math.min(amountPaise,asPaise(order.cashfree_paid)) : 0;
  const manualAmountPaise = amountPaise - cashfreeAmountPaise;
  const sourceKind = cashfreeAmountPaise && manualAmountPaise ? 'mixed' : cashfreeAmountPaise ? 'cashfree' : 'manual';
  const customerId = booking.customerId ?? booking.customer_id;
  const inserted = (await client.query(`INSERT INTO customer_refund_requests
    (booking_id,customer_id,amount_paise,source_kind,stripe_amount_paise,cashfree_amount_paise,manual_amount_paise,
      cashfree_order_id,reason)
    VALUES($1,$2,$3,$4,0,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id`,
    [booking.id,customerId,amountPaise,sourceKind,cashfreeAmountPaise,manualAmountPaise,
      cashfreeAmountPaise ? order.cashfree_order_id : null,reason])).rows[0];
  if (!inserted) return null;

  const message = `Booking #${booking.id}: ₹${(amountPaise/100).toFixed(2)} refund is awaiting admin approval. ` +
    (cashfreeAmountPaise ? `₹${(cashfreeAmountPaise/100).toFixed(2)} can be returned through Cashfree to the original payment method. ` : '') +
    (manualAmountPaise ? `₹${(manualAmountPaise/100).toFixed(2)} requires an offline/manual payout and recorded reference. ` : '');
  await notifyAdmins(client, 'Refund approval required', message);
  return { id: inserted.id, amount: amountPaise / 100, stripeAmount: 0,
    cashfreeAmount:cashfreeAmountPaise/100,manualAmount: manualAmountPaise / 100 };
}

export async function createEventRefundRequest(client: DbClient, registration: any, reason: string) {
  const amountPaise = Math.max(0, Number(registration.paid_paise) - Number(registration.refunded_paise));
  if (amountPaise <= 0 || registration.is_test) return null;
  const online = registration.payment_method === 'online';
  const cashfreeOnline=online && registration.payment_provider==='cashfree' && registration.cashfree_order_id;
  const cashfreeAmountPaise=cashfreeOnline?amountPaise:0;
  const manualAmountPaise=amountPaise-cashfreeAmountPaise;
  const sourceKind = cashfreeAmountPaise ? (manualAmountPaise ? 'mixed' : 'cashfree') : 'manual';
  const inserted = (await client.query(`INSERT INTO customer_refund_requests
    (event_registration_id,customer_id,amount_paise,source_kind,stripe_amount_paise,cashfree_amount_paise,manual_amount_paise,
      cashfree_order_id,reason)
    VALUES($1,$2,$3,$4,0,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id`,
    [registration.id,registration.guardian_id,amountPaise,sourceKind,cashfreeAmountPaise,manualAmountPaise,
      cashfreeAmountPaise ? registration.cashfree_order_id : null,reason])).rows[0];
  if (!inserted) return null;
  const message = `Event registration ${registration.id}: ₹${(amountPaise/100).toFixed(2)} refund is awaiting admin approval. ` +
    (cashfreeAmountPaise ? 'It can be returned through Cashfree to the original payment method.' :
     'It requires an offline/manual payout and recorded reference.');
  await notifyAdmins(client, 'Event refund approval required', message);
  return { id: inserted.id, amount: amountPaise / 100 };
}

export async function getAdminRefundRequests() {
  return (await pool.query(`SELECT r.id,r.booking_id AS "bookingId",r.event_registration_id AS "eventRegistrationId",
      r.customer_id AS "customerId",concat_ws(' ',u."firstName",u."lastName") AS "customerName",
      r.amount_paise/100.0 AS amount,r.stripe_amount_paise/100.0 AS "stripeAmount",
      r.cashfree_amount_paise/100.0 AS "cashfreeAmount",
      r.manual_amount_paise/100.0 AS "manualAmount",r.source_kind AS "sourceKind",r.status,r.reason,
      r.stripe_refund_id AS "stripeRefundId",r.stripe_failure AS "stripeFailure",
      r.cashfree_refund_id AS "cashfreeRefundId",r.cashfree_failure AS "cashfreeFailure",
      r.manual_reference AS "manualReference",r.approved_at AS "approvedAt",r.settled_at AS "settledAt",
      r.created_at AS "createdAt",b."pujaId" AS "pujaId",p.name AS "pujaName",
      b.date::text AS "pujaDate",b.time AS "pujaTime",e.details->>'name' AS "eventName",
      er.child_name AS "childName",er.event_id AS "eventId"
    FROM customer_refund_requests r JOIN users u ON u.id=r.customer_id
    LEFT JOIN bookings b ON b.id=r.booking_id LEFT JOIN pujas p ON p.id=b."pujaId"
    LEFT JOIN event_registrations er ON er.id=r.event_registration_id
    LEFT JOIN religious_events e ON e.id=er.event_id
    ORDER BY CASE WHEN r.status IN ('pending','failed','processing','manual_pending') THEN 0 ELSE 1 END,
      r.created_at DESC,r.id DESC LIMIT 500`)).rows;
}

export async function getCustomerRefundRequests(customerId: number) {
  const rows = (await pool.query(`SELECT booking_id AS "bookingId",
      event_registration_id AS "eventRegistrationId",status,source_kind AS "sourceKind",
      stripe_amount_paise/100.0 AS "stripeAmount",cashfree_amount_paise/100.0 AS "cashfreeAmount",
      manual_amount_paise/100.0 AS "manualAmount",
      manual_reference AS "manualReference"
    FROM customer_refund_requests
    WHERE customer_id=$1
    ORDER BY created_at DESC,id DESC`, [customerId])).rows;
  return rows.map(row => ({
    ...row,
    stripeAmount: Number(row.stripeAmount),
    cashfreeAmount:Number(row.cashfreeAmount),
    manualAmount: Number(row.manualAmount),
  }));
}

async function notifyCustomer(client: DbClient, customerId: number, title: string, message: string) {
  await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
    VALUES($1,$2,$3,'payment',false,now())`, [customerId,title,message]);
}

async function recordSuccessfulCashfreeRefund(requestId: number, refund: any, reference: string) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const request=(await client.query('SELECT * FROM customer_refund_requests WHERE id=$1 FOR UPDATE',[requestId])).rows[0];
    if (!request) throw fail(404,'Refund request not found');
    const amount=asPaise(refund.refund_amount);
    const succeeded=String(refund.refund_status).toUpperCase()==='SUCCESS';
    if (refund.order_id!==request.cashfree_order_id || refund.refund_id!==reference ||
        amount!==Number(request.cashfree_amount_paise))
      throw fail(409,'Cashfree refund did not match the approved order, reference and amount.');
    const alreadyRecorded=request.booking_id
      ?((await client.query(`SELECT id FROM customer_finance_entries WHERE booking_id=$1 AND type='refund' AND reference=$2`,
        [request.booking_id,reference])).rowCount??0)>0
      :((await client.query(`SELECT id FROM event_payment_records WHERE registration_id=$1 AND type='refund' AND reference=$2`,
        [request.event_registration_id,reference])).rowCount??0)>0;
    if (succeeded && !alreadyRecorded) {
      if (amount<=0)
        throw fail(409,'Cashfree refund amount did not match the approved request.');
      if (request.booking_id) {
        const booking=(await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE',[request.booking_id])).rows[0];
        const funds=await bookingCustomerFunds(client,booking);
        if (asPaise(funds.refundOwed)<amount)
          throw fail(409,'The outstanding booking refund changed. Review customer finance before recording this Cashfree refund.');
        await client.query(`INSERT INTO customer_finance_entries(booking_id,type,amount,reference,reason,paid_by,created_by)
          VALUES($1,'refund',$2,$3,$4,'portal',$5) ON CONFLICT DO NOTHING`,
          [request.booking_id,amount/100,reference,`Cashfree refund to original payment method for booking #${request.booking_id}`,request.approved_by]);
      } else {
        const reg=(await client.query('SELECT * FROM event_registrations WHERE id=$1 FOR UPDATE',[request.event_registration_id])).rows[0];
        if (!reg || Number(reg.paid_paise)-Number(reg.refunded_paise)<amount)
          throw fail(409,'The outstanding event refund changed. Review event payment records before recording this Cashfree refund.');
        const inserted=await client.query(`INSERT INTO event_payment_records(registration_id,type,amount_paise,reference,note,actor_id)
          VALUES($1,'refund',$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`,
          [request.event_registration_id,amount,reference,'Cashfree refund to original payment method',request.approved_by]);
        if (inserted.rowCount) await client.query('UPDATE event_registrations SET refunded_paise=refunded_paise+$2 WHERE id=$1',
          [request.event_registration_id,amount]);
      }
    }
    const status=succeeded
      ?Number(request.manual_amount_paise)>0?'manual_pending':'paid'
      :String(refund.refund_status).toUpperCase()==='PENDING'?'processing':'failed';
    await client.query(`UPDATE customer_refund_requests SET status=$2,cashfree_refund_id=$3,cashfree_failure=$4,
      updated_at=now(),settled_at=CASE WHEN $2='paid' THEN now() ELSE settled_at END WHERE id=$1`,
      [requestId, status,reference, refund.status_description||null]);
    if (succeeded && !alreadyRecorded) await notifyCustomer(client,request.customer_id,'Online refund issued',
      `₹${(amount/100).toFixed(2)} was refunded through Cashfree to the original payment method. `+
      (Number(request.manual_amount_paise)>0?`A remaining manual refund of ₹${(Number(request.manual_amount_paise)/100).toFixed(2)} is awaiting payout.`:'The refund is complete.'));
    await client.query('COMMIT');
    return status;
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function reconcileRefundRequest(requestId: number) {
  const request = (await pool.query('SELECT * FROM customer_refund_requests WHERE id=$1',[requestId])).rows[0];
  if (!request) throw fail(404,'Refund request not found');
  if (Number(request.cashfree_amount_paise)>0) {
    if (request.status!=='processing' || !request.cashfree_refund_id) return {status:request.status};
    const source=request.booking_id
      ?(await pool.query('SELECT livemode FROM portal_checkout_orders WHERE booking_id=$1',[request.booking_id])).rows[0]
      :(await pool.query('SELECT is_test FROM event_registrations WHERE id=$1',[request.event_registration_id])).rows[0];
    const liveMode=request.booking_id?source?.livemode===true:source?.is_test===false;
    if (!liveMode) throw fail(409,'A live original Cashfree transaction is required to reconcile this refund.');
    const refund=await getCashfreeRefund(request.cashfree_order_id,request.cashfree_refund_id,liveMode);
    const status=await recordSuccessfulCashfreeRefund(requestId,refund,request.cashfree_refund_id);
    return {status,cashfreeRefundId:request.cashfree_refund_id};
  }
  if (Number(request.stripe_amount_paise)>0)
    throw fail(410,'This legacy refund is archived and cannot be checked by the portal. Contact the Vaidik Dhara support team for manual review.');
  return { status: request.status };
}

export async function approveRefundRequest(requestId: number, adminId: number) {
  const client = await pool.connect();
  let request: any;
  try {
    await client.query('BEGIN');
    request = (await client.query('SELECT * FROM customer_refund_requests WHERE id=$1 FOR UPDATE',[requestId])).rows[0];
    if (!request) throw fail(404,'Refund request not found');
    if (!['pending','failed'].includes(request.status)) throw fail(409,'This refund request is not awaiting approval or retry');
    // Legacy gateway refunds are no longer sent through a provider. If an
    // outstanding request is approved now, route it into the existing audited
    // manual-payout workflow instead.
    const retiredGatewayAmount=Number(request.stripe_amount_paise)||0;
    if (retiredGatewayAmount>0) {
      const manualAmount=Number(request.manual_amount_paise)+retiredGatewayAmount;
      const sourceKind=Number(request.cashfree_amount_paise)>0?'mixed':'manual';
      await client.query(`UPDATE customer_refund_requests SET stripe_amount_paise=0,
        stripe_payment_intent_id=NULL,stripe_session_id=NULL,stripe_refund_id=NULL,
        manual_amount_paise=$2,source_kind=$3,status='pending',updated_at=now() WHERE id=$1`,
        [requestId,manualAmount,sourceKind]);
      request.stripe_amount_paise=0;
      request.manual_amount_paise=manualAmount;
      request.status='pending';
    }
    if (Number(request.cashfree_amount_paise)<=0) {
      if (request.status!=='pending') throw fail(409,'This manual refund request has already been processed');
      await client.query(`UPDATE customer_refund_requests SET status='manual_pending',approved_by=$2,
        approved_at=now(),updated_at=now() WHERE id=$1`,[requestId,adminId]);
      await notifyCustomer(client,request.customer_id,'Refund approved',
        `The Vaidik Dhara support team approved your ₹${(request.amount_paise/100).toFixed(2)} manual refund. The amount will be paid outside this app and recorded after settlement.`);
      await client.query('COMMIT');
      return { status:'manual_pending',message:'Approved. Pay outside the app, then record the payout reference.' };
    }
    if (request.booking_id) {
      await client.query('SELECT pg_advisory_xact_lock(8158,$1)',[request.booking_id]);
      const booking=(await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE',[request.booking_id])).rows[0];
      const funds=await bookingCustomerFunds(client,booking);
      if (asPaise(funds.refundOwed)<Number(request.amount_paise))
        throw fail(409,'The outstanding booking refund changed. Reconcile the customer finance record before issuing this refund.');
    } else {
      const registration=(await client.query('SELECT * FROM event_registrations WHERE id=$1 FOR UPDATE',[request.event_registration_id])).rows[0];
      if (!registration || registration.paid_paise-registration.refunded_paise<
          Number(request.amount_paise))
        throw fail(409,'The outstanding event refund changed. Review event payment records before issuing this refund.');
    }
    const cashfreeRefundId=Number(request.cashfree_amount_paise)>0
      ?request.status==='failed'
        ?`vdref-${randomUUID().replaceAll('-','')}`
        :request.cashfree_refund_id||`vdref-${randomUUID().replaceAll('-','')}`
      :null;
    await client.query(`UPDATE customer_refund_requests SET status='processing',approved_by=$2,
      approved_at=now(),cashfree_refund_id=COALESCE($3,cashfree_refund_id),updated_at=now() WHERE id=$1`,
      [requestId,adminId,cashfreeRefundId]);
    if (cashfreeRefundId) request.cashfree_refund_id=cashfreeRefundId;
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }

  try {
    if (Number(request.cashfree_amount_paise)>0) {
      const orderId=request.cashfree_order_id;
      if (!orderId) throw fail(409,'The original Cashfree order is missing. No refund was sent.');
      const liveMode=request.booking_id
        ?(await pool.query('SELECT livemode FROM portal_checkout_orders WHERE booking_id=$1 AND cashfree_order_id=$2',
          [request.booking_id,orderId])).rows[0]?.livemode===true
        :(await pool.query('SELECT is_test FROM event_registrations WHERE id=$1 AND cashfree_order_id=$2',
          [request.event_registration_id,orderId])).rows[0]?.is_test===false;
      if (!liveMode) throw fail(409,'The original transaction is not a verified live Cashfree payment. No refund was sent.');
      const {getCashfreeOrder,getCashfreePayments}=await import('./cashfreeClient');
      const order=await getCashfreeOrder(orderId,true);
      const payments=await getCashfreePayments(orderId,true);
      const payment=payments.find(item=>item.payment_status==='SUCCESS'&&item.order_id===orderId);
      const originalAmount=Number(request.booking_id
        ?(await pool.query('SELECT advance_paise FROM portal_checkout_orders WHERE booking_id=$1 AND cashfree_order_id=$2',
          [request.booking_id,orderId])).rows[0]?.advance_paise
        :(await pool.query('SELECT fee_paise FROM event_registrations WHERE id=$1 AND cashfree_order_id=$2',
          [request.event_registration_id,orderId])).rows[0]?.fee_paise);
      if (order.order_status!=='PAID'||order.order_currency!=='INR'||!payment||
          payment.payment_currency!=='INR'||!Number.isSafeInteger(originalAmount)||
          Math.round(Number(order.order_amount)*100)!==originalAmount||
          Math.round(Number(payment.order_amount)*100)!==originalAmount||
          Math.round(Number(payment.payment_amount)*100)!==originalAmount||
          Number(request.cashfree_amount_paise)>originalAmount)
        throw fail(409,'The original Cashfree payment could not be verified. No refund was sent.');
      const refundId=request.cashfree_refund_id;
      if (!refundId) throw fail(409,'The approved Cashfree refund attempt is missing. No refund was sent.');
      const refund=await createCashfreeRefund(orderId,refundId,Number(request.cashfree_amount_paise),true);
      const status=await recordSuccessfulCashfreeRefund(requestId,refund,refundId);
      return {status,message:status==='paid'?'Cashfree refund issued to the original payment method.':
        status==='manual_pending'?'Cashfree refund issued. The manual remainder still needs payout.':
        'Refund submitted to Cashfree and is still processing.',cashfreeRefundId:refundId};
    }
    throw fail(410,'This legacy payment cannot be refunded through an online provider. Contact the Vaidik Dhara support team to arrange and record a manual refund.');
  } catch (error: any) {
    const isCashfree=Number(request.cashfree_amount_paise)>0;
    const safeFailure=typeof error?.status==='number' && error.status>=400 && error.status<500;
    await pool.query(`UPDATE customer_refund_requests SET status=CASE WHEN $3 AND NOT $4 THEN 'processing' ELSE 'failed' END,
      cashfree_failure=CASE WHEN $3 THEN $2 ELSE cashfree_failure END,updated_at=now()
      WHERE id=$1 AND status='processing'`,[requestId,String(error?.message || 'Cashfree refund failed').slice(0,1000),isCashfree,safeFailure]);
    throw error;
  }
}

export async function settleManualRefund(requestId: number, adminId: number, reference: string, note: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = (await client.query('SELECT * FROM customer_refund_requests WHERE id=$1 FOR UPDATE',[requestId])).rows[0];
    if (!request) throw fail(404,'Refund request not found');
    if (request.status !== 'manual_pending' || Number(request.manual_amount_paise)<=0)
      throw fail(409,'This request has no approved manual refund awaiting payout');
    if (request.booking_id) {
      await client.query('SELECT pg_advisory_xact_lock(8158,$1)',[request.booking_id]);
      const booking = (await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE',[request.booking_id])).rows[0];
      const funds = await bookingCustomerFunds(client,booking);
      if (asPaise(funds.refundOwed)<Number(request.manual_amount_paise))
        throw fail(409,'The outstanding booking refund changed. Reconcile the customer finance record before marking this payout paid.');
      await client.query(`INSERT INTO customer_finance_entries
        (booking_id,type,amount,reference,reason,paid_by,created_by)
        VALUES($1,'refund',$2,$3,$4,'portal',$5)`,
        [request.booking_id,Number(request.manual_amount_paise)/100,reference,
          note || `Approved manual refund for booking #${request.booking_id}`,adminId]);
    } else {
      const registration = (await client.query('SELECT * FROM event_registrations WHERE id=$1 FOR UPDATE',[request.event_registration_id])).rows[0];
      if (!registration || registration.paid_paise-registration.refunded_paise<Number(request.manual_amount_paise))
        throw fail(409,'The outstanding event refund changed. Review event payment records before marking this payout paid.');
      await client.query(`INSERT INTO event_payment_records(registration_id,type,amount_paise,reference,note,actor_id)
        VALUES($1,'refund',$2,$3,$4,$5)`,
        [request.event_registration_id,Number(request.manual_amount_paise),reference,note || 'Approved manual refund payout',adminId]);
      await client.query('UPDATE event_registrations SET refunded_paise=refunded_paise+$2 WHERE id=$1',
        [request.event_registration_id,Number(request.manual_amount_paise)]);
    }
    await client.query(`UPDATE customer_refund_requests SET status='paid',manual_reference=$2,
      settled_by=$3,settled_at=now(),updated_at=now() WHERE id=$1`,
      [requestId,reference,adminId]);
    await notifyCustomer(client,request.customer_id,'Refund paid',
      `The Vaidik Dhara support team recorded your manual refund of ₹${(Number(request.manual_amount_paise)/100).toFixed(2)}. Reference: ${reference}.`);
    await client.query('COMMIT');
    return { status:'paid',message:'Manual refund payout recorded. The portal did not transfer the money.' };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
