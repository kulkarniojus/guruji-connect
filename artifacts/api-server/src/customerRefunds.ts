import { pool } from './db';
import { getUncachableStripeClient } from './stripeClient';
import { bookingCustomerFunds } from './customerFinance';

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
      source_kind text NOT NULL CHECK(source_kind IN ('stripe','manual','mixed')),
      stripe_amount_paise bigint NOT NULL DEFAULT 0 CHECK(stripe_amount_paise >= 0),
      manual_amount_paise bigint NOT NULL DEFAULT 0 CHECK(manual_amount_paise >= 0),
      stripe_payment_intent_id text,
      stripe_session_id text,
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
      CHECK (stripe_amount_paise + manual_amount_paise = amount_paise)
    );
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

  const order = (await client.query(`SELECT o.stripe_payment_intent_id,o.livemode,
      COALESCE(SUM(CASE WHEN p.status IN ('paid','partial') THEN p.amount ELSE 0 END),0) AS stripe_paid
    FROM portal_checkout_orders o LEFT JOIN payments p ON p."bookingId"=o.booking_id AND p.method='stripe'
    WHERE o.booking_id=$1 GROUP BY o.id`, [booking.id])).rows[0];
  const stripeAmountPaise = order?.livemode && order.stripe_payment_intent_id
    ? Math.min(amountPaise, asPaise(order.stripe_paid))
    : 0;
  const manualAmountPaise = amountPaise - stripeAmountPaise;
  const sourceKind = stripeAmountPaise && manualAmountPaise ? 'mixed'
    : stripeAmountPaise ? 'stripe' : 'manual';
  const customerId = booking.customerId ?? booking.customer_id;
  const inserted = (await client.query(`INSERT INTO customer_refund_requests
    (booking_id,customer_id,amount_paise,source_kind,stripe_amount_paise,manual_amount_paise,
     stripe_payment_intent_id,reason)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id`,
    [booking.id,customerId,amountPaise,sourceKind,stripeAmountPaise,manualAmountPaise,
      stripeAmountPaise ? order.stripe_payment_intent_id : null,reason])).rows[0];
  if (!inserted) return null;

  const message = `Booking #${booking.id}: ₹${(amountPaise/100).toFixed(2)} refund is awaiting admin approval. ` +
    (stripeAmountPaise ? `₹${(stripeAmountPaise/100).toFixed(2)} can be returned through Stripe to the original payment method. ` : '') +
    (manualAmountPaise ? `₹${(manualAmountPaise/100).toFixed(2)} requires an offline/manual payout and recorded reference. ` : '');
  await notifyAdmins(client, 'Refund approval required', message);
  return { id: inserted.id, amount: amountPaise / 100, stripeAmount: stripeAmountPaise / 100, manualAmount: manualAmountPaise / 100 };
}

export async function createEventRefundRequest(client: DbClient, registration: any, reason: string) {
  const amountPaise = Math.max(0, Number(registration.paid_paise) - Number(registration.refunded_paise));
  if (amountPaise <= 0 || registration.is_test) return null;
  const online = registration.payment_method === 'online';
  const stripeAmountPaise = online ? amountPaise : 0;
  const manualAmountPaise = online ? 0 : amountPaise;
  const sourceKind = online ? 'stripe' : 'manual';
  const inserted = (await client.query(`INSERT INTO customer_refund_requests
    (event_registration_id,customer_id,amount_paise,source_kind,stripe_amount_paise,manual_amount_paise,
     stripe_session_id,reason)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id`,
    [registration.id,registration.guardian_id,amountPaise,sourceKind,stripeAmountPaise,manualAmountPaise,
      online ? registration.stripe_session_id : null,reason])).rows[0];
  if (!inserted) return null;
  const message = `Event registration ${registration.id}: ₹${(amountPaise/100).toFixed(2)} refund is awaiting admin approval. ` +
    (online ? 'It can be returned through Stripe to the original payment method.' : 'It requires an offline/manual payout and recorded reference.');
  await notifyAdmins(client, 'Event refund approval required', message);
  return { id: inserted.id, amount: amountPaise / 100 };
}

export async function getAdminRefundRequests() {
  return (await pool.query(`SELECT r.id,r.booking_id AS "bookingId",r.event_registration_id AS "eventRegistrationId",
      r.customer_id AS "customerId",concat_ws(' ',u."firstName",u."lastName") AS "customerName",
      r.amount_paise/100.0 AS amount,r.stripe_amount_paise/100.0 AS "stripeAmount",
      r.manual_amount_paise/100.0 AS "manualAmount",r.source_kind AS "sourceKind",r.status,r.reason,
      r.stripe_refund_id AS "stripeRefundId",r.stripe_failure AS "stripeFailure",
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
      stripe_amount_paise/100.0 AS "stripeAmount",manual_amount_paise/100.0 AS "manualAmount",
      manual_reference AS "manualReference"
    FROM customer_refund_requests
    WHERE customer_id=$1
    ORDER BY created_at DESC,id DESC`, [customerId])).rows;
  return rows.map(row => ({
    ...row,
    stripeAmount: Number(row.stripeAmount),
    manualAmount: Number(row.manualAmount),
  }));
}

async function notifyCustomer(client: DbClient, customerId: number, title: string, message: string) {
  await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
    VALUES($1,$2,$3,'payment',false,now())`, [customerId,title,message]);
}

async function recordSuccessfulRefund(requestId: number, refund: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = (await client.query('SELECT * FROM customer_refund_requests WHERE id=$1 FOR UPDATE',[requestId])).rows[0];
    if (!request) throw fail(404,'Refund request not found');
    const alreadyRecorded = request.booking_id
      ? ((await client.query(`SELECT id FROM customer_finance_entries WHERE booking_id=$1 AND type='refund' AND reference=$2`,
          [request.booking_id,refund.id])).rowCount ?? 0) > 0
      : ((await client.query(`SELECT id FROM event_payment_records WHERE registration_id=$1 AND type='refund' AND reference=$2`,
          [request.event_registration_id,refund.id])).rowCount ?? 0) > 0;
    if (refund.status === 'succeeded' && !alreadyRecorded) {
      const amount = Number(refund.amount);
      if (request.booking_id) {
        const current = await bookingCustomerFunds(client, (await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE',[request.booking_id])).rows[0]);
        if (asPaise(current.refundOwed) < amount) throw fail(409,'The outstanding booking refund changed. Reconcile the customer finance record before applying this Stripe refund.');
        await client.query(`INSERT INTO customer_finance_entries
          (booking_id,type,amount,reference,reason,paid_by,created_by)
          VALUES($1,'refund',$2,$3,$4,'portal',$5) ON CONFLICT DO NOTHING`,
          [request.booking_id,amount/100,refund.id,`Stripe refund to original payment method for booking #${request.booking_id}`,request.approved_by]);
      } else if (request.event_registration_id) {
        const registration = (await client.query('SELECT * FROM event_registrations WHERE id=$1 FOR UPDATE',[request.event_registration_id])).rows[0];
        if (!registration || registration.paid_paise-registration.refunded_paise < amount)
          throw fail(409,'The outstanding event refund changed. Review event payment records before applying this Stripe refund.');
        const record = await client.query(`INSERT INTO event_payment_records(registration_id,type,amount_paise,reference,note,actor_id)
          VALUES($1,'refund',$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`,
          [request.event_registration_id,amount,refund.id,'Stripe refund to original payment method',request.approved_by]);
        if (record.rowCount) await client.query('UPDATE event_registrations SET refunded_paise=refunded_paise+$2 WHERE id=$1',
          [request.event_registration_id,amount]);
      }
    }
    const status = refund.status === 'succeeded'
      ? Number(request.manual_amount_paise)>0 ? 'manual_pending' : 'paid'
      : refund.status === 'pending' ? 'processing' : 'failed';
    await client.query(`UPDATE customer_refund_requests SET status=$2,stripe_refund_id=$3,stripe_failure=$4,
      updated_at=now(),settled_at=CASE WHEN $2='paid' THEN now() ELSE settled_at END
      WHERE id=$1`, [requestId,status,refund.id,refund.failure_reason || null]);
    if (refund.status === 'succeeded' && !alreadyRecorded) {
      const amount = Number(refund.amount);
      await notifyCustomer(client,request.customer_id,'Online refund issued',
        `₹${(amount/100).toFixed(2)} was refunded through Stripe to the original payment method. ` +
        (Number(request.manual_amount_paise)>0 ? `A remaining manual refund of ₹${(Number(request.manual_amount_paise)/100).toFixed(2)} is awaiting payout.` : 'The refund is complete.'));
    }
    await client.query('COMMIT');
    return status;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function reconcileStripeRefund(requestId: number) {
  const request = (await pool.query('SELECT * FROM customer_refund_requests WHERE id=$1',[requestId])).rows[0];
  if (!request) throw fail(404,'Refund request not found');
  if (request.status !== 'processing' || !request.stripe_refund_id) return { status: request.status };
  const stripe = await getUncachableStripeClient();
  const refund = await stripe.refunds.retrieve(request.stripe_refund_id);
  const status = await recordSuccessfulRefund(requestId,refund);
  return { status, stripeRefundId: refund.id };
}

export async function approveRefundRequest(requestId: number, adminId: number) {
  const client = await pool.connect();
  let request: any;
  try {
    await client.query('BEGIN');
    request = (await client.query('SELECT * FROM customer_refund_requests WHERE id=$1 FOR UPDATE',[requestId])).rows[0];
    if (!request) throw fail(404,'Refund request not found');
    if (!['pending','failed'].includes(request.status)) throw fail(409,'This refund request is not awaiting approval or retry');
    if (Number(request.stripe_amount_paise) <= 0) {
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
      if (asPaise(funds.refundOwed)<Number(request.stripe_amount_paise))
        throw fail(409,'The outstanding booking refund changed. Reconcile the customer finance record before issuing this refund.');
    } else {
      const registration=(await client.query('SELECT * FROM event_registrations WHERE id=$1 FOR UPDATE',[request.event_registration_id])).rows[0];
      if (!registration || registration.paid_paise-registration.refunded_paise<Number(request.stripe_amount_paise))
        throw fail(409,'The outstanding event refund changed. Review event payment records before issuing this refund.');
    }
    await client.query(`UPDATE customer_refund_requests SET status='processing',approved_by=$2,
      approved_at=now(),updated_at=now() WHERE id=$1`,[requestId,adminId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }

  try {
    const stripe = await getUncachableStripeClient();
    let paymentIntentId = request.stripe_payment_intent_id;
    if (request.event_registration_id) {
      if (!request.stripe_session_id) throw fail(409,'The original Stripe checkout session is missing. Do not issue a refund until the payment source is verified.');
      const session = await stripe.checkout.sessions.retrieve(request.stripe_session_id);
      const registration=(await pool.query('SELECT * FROM event_registrations WHERE id=$1',[request.event_registration_id])).rows[0];
      if (!registration || registration.is_test || session.metadata?.portal_kind!=='event_registration' ||
          session.metadata?.event_registration_id!==request.event_registration_id ||
          session.client_reference_id!==request.event_registration_id ||
          session.payment_status !== 'paid' || session.livemode !== true || session.currency!=='inr' ||
          session.amount_total!==registration.fee_paise || !session.payment_intent)
        throw fail(409,'The original event payment could not be verified as a live Stripe payment. No refund was sent.');
      paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
    }
    if (!paymentIntentId) throw fail(409,'The original Stripe payment reference is missing. No refund was sent.');
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded' || !paymentIntent.livemode || paymentIntent.currency !== 'inr')
      throw fail(409,'The original Stripe payment is not a verified live INR payment. No refund was sent.');
    const priorRefunds=await stripe.refunds.list({payment_intent:paymentIntentId,limit:100});
    const attempts=priorRefunds.data
      .filter(item=>item.metadata?.customer_refund_request_id===String(requestId))
      .sort((a,b)=>b.created-a.created);
    const activeAttempt=attempts.find(item=>['pending','succeeded'].includes(item.status));
    if (activeAttempt && activeAttempt.amount!==Number(request.stripe_amount_paise))
      throw fail(409,'A prior Stripe refund for this request has a different amount. Review it in Stripe before continuing.');
    const refund = activeAttempt || await stripe.refunds.create({
        payment_intent:paymentIntentId,
        amount:Number(request.stripe_amount_paise),
        reason:'requested_by_customer',
        metadata:{customer_refund_request_id:String(requestId)},
      }, { idempotencyKey:`sg-customer-refund-${requestId}-attempt-${attempts.length+1}` });
    const status = await recordSuccessfulRefund(requestId,refund);
    return { status,message: status==='paid'?'Stripe refund issued to the original payment method.':
      status==='manual_pending'?'Stripe refund issued. The manual remainder still needs payout.':
      'Refund submitted to Stripe and is still processing.',stripeRefundId:refund.id };
  } catch (error: any) {
    await pool.query(`UPDATE customer_refund_requests SET status='failed',stripe_failure=$2,updated_at=now()
      WHERE id=$1 AND status='processing'`,[requestId,String(error?.message || 'Stripe refund failed').slice(0,1000)]);
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
