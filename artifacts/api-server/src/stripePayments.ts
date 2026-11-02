import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { pool } from './db';
import { DBStorage } from './dbStorage';
import { getPricingQuote, pricingQuotePayload } from './pujaPricing';
import { getBookingCommission } from './pujaCommission';
import { getBusyGurujiIds, parseBookingTime, validBookingDate } from './bookingSchedule';
import { notifyAdminsOfUnassignedBooking } from './unassignedBookingAlerts';
import {
  cashfreeGatewayStatus, createCashfreeOrder, getCashfreeOrder, getCashfreePayments,
  verifyCashfreeWebhookSignature, isVerifiedCashfreePayment, type CashfreeMode, type CashfreePayment,
} from './cashfreeClient';

const storage = new DBStorage();
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
export const toPaise = (value: number) => Math.round(value * 100);
export const advancePaise = (total: number, percentage: number) => Math.round(toPaise(total) * percentage / 100);
let cashfreeGateway = { available: false, mode: 'unavailable' as CashfreeMode };

export function checkoutReturnOrigin(requestOrigin?: string) {
  const allowed=(process.env.REPLIT_DOMAINS||'').split(',').map(v=>v.trim()).filter(Boolean);
  // Keep the customer on their portal origin, including its confirmed custom
  // domain, so the return does not lose their existing signed-in session.
  allowed.push(
    'vaidikdhara.com',
    'www.vaidikdhara.com',
    'sanatanguruji.com',
    'www.sanatanguruji.com',
  );
  const candidate=new URL(requestOrigin||`https://${allowed[0]}`);
  if (candidate.protocol!=='https:' || candidate.port || candidate.username || candidate.password ||
      !allowed.includes(candidate.hostname)) throw fail(400,'The checkout return origin is not configured.');
  return candidate.origin;
}

export async function initializePaymentStorage() {
  // Copy the existing payment switch once, then use its provider-neutral name.
  await pool.query(`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS payments_enabled boolean;
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS stripe_payments_enabled boolean NOT NULL DEFAULT false;
    UPDATE app_settings SET payments_enabled=COALESCE(payments_enabled,stripe_payments_enabled,false)
      WHERE payments_enabled IS NULL;
    ALTER TABLE app_settings ALTER COLUMN payments_enabled SET DEFAULT false;
    ALTER TABLE app_settings ALTER COLUMN payments_enabled SET NOT NULL;
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS advance_percentage numeric(5,2) NOT NULL DEFAULT 25;
    CREATE TABLE IF NOT EXISTS portal_checkout_orders (
      id uuid PRIMARY KEY, customer_id integer NOT NULL REFERENCES users(id),
      request_id uuid NOT NULL, booking_payload jsonb NOT NULL, pricing_snapshot jsonb NOT NULL,
      commission_snapshot jsonb NOT NULL, advance_percentage numeric(5,2) NOT NULL,
      advance_paise integer NOT NULL CHECK(advance_paise>0), livemode boolean NOT NULL,
      payment_provider text NOT NULL DEFAULT 'cashfree',
      stripe_session_id text UNIQUE, stripe_payment_intent_id text UNIQUE,
      cashfree_order_id text UNIQUE, cashfree_payment_session_id text, cashfree_payment_id text,
      booking_id integer UNIQUE REFERENCES bookings(id), needs_support boolean NOT NULL DEFAULT false,
      state text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT NOW(),
      expires_at timestamptz NOT NULL, UNIQUE(customer_id,request_id)
    );
    ALTER TABLE portal_checkout_orders
      ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'cashfree',
      ADD COLUMN IF NOT EXISTS cashfree_order_id text,
      ADD COLUMN IF NOT EXISTS cashfree_payment_session_id text,
      ADD COLUMN IF NOT EXISTS cashfree_payment_id text;
    ALTER TABLE portal_checkout_orders ALTER COLUMN payment_provider SET DEFAULT 'cashfree';
    CREATE UNIQUE INDEX IF NOT EXISTS portal_checkout_cashfree_order_id
      ON portal_checkout_orders(cashfree_order_id) WHERE cashfree_order_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS portal_checkout_pending ON portal_checkout_orders(state,created_at);`);
  // The legacy table stored whole rupees. Widen, without changing units or
  // existing values, so percentage advances retain their paise exactly.
  await pool.query('ALTER TABLE payments ALTER COLUMN amount TYPE numeric(14,2) USING amount::numeric');
}

export async function initializeCashfreeGateway() {
  cashfreeGateway = cashfreeGatewayStatus();
  console.info(`Cashfree checkout ${cashfreeGateway.available ? `ready (${cashfreeGateway.mode} mode)` : 'unavailable'}.`);
}

export async function paymentSettings() {
  const row = (await pool.query('SELECT * FROM app_settings ORDER BY id LIMIT 1')).rows[0];
  if (!row) throw fail(503, 'Payment settings are unavailable.');
  return {
    checkoutAvailable: cashfreeGateway.available, provider: 'cashfree', providerMode: cashfreeGateway.mode,
    paymentRequired: row.payments_enabled === true,
    paymentSkipped: row.payments_enabled !== true,
    advancePercentage: Number(row.advance_percentage),
    upiId: row.upi_id, upiName: row.upi_name, upiQrImageUrl: row.upi_qr_image_url,
  };
}

export const paymentSettingsInput = z.object({
  paymentRequired: z.boolean(), advancePercentage: z.number().min(1).max(100).multipleOf(0.01),
  upiId: z.string().max(200).nullable().optional(), upiName: z.string().max(200).nullable().optional(),
  upiQrImageUrl: z.union([z.string().url().refine(v => v.startsWith('https://')), z.literal(''), z.null()]).optional(),
});

export async function savePaymentSettings(raw: unknown) {
  const input = paymentSettingsInput.parse(raw);
  if (input.paymentRequired && !cashfreeGateway.available) throw fail(503, 'Cashfree checkout credentials are not ready for this environment. Payments cannot be enabled yet.');
  await pool.query(`UPDATE app_settings SET payments_enabled=$1,payment_required=$1,
    advance_percentage=$2,upi_id=$3,upi_name=$4,upi_qr_image_url=$5,updated_at=NOW()`,
    [input.paymentRequired, input.advancePercentage, input.upiId || null, input.upiName || null, input.upiQrImageUrl || null]);
  return paymentSettings();
}

export const checkoutBookingInput = z.object({
  pujaId: z.number().int().positive(), type: z.enum(['offline','online']),
  consultationType: z.enum(['own_guruji','auto_select','immediate']).optional(),
  amount: z.number().positive(), withSamagri: z.boolean().default(false),
  address: z.string().max(3000).optional(), city: z.string().max(200).optional(),
  state: z.string().max(200).optional(), pincode: z.string().optional(),
  time: z.string(), calendarDate: z.string().optional(), date: z.string(),
  duration: z.number().nonnegative().optional(), isImmediate: z.boolean().default(false),
  notes: z.string().max(3000).optional(), gurujiId: z.number().int().positive().optional(),
});
export const checkoutInput = z.object({ booking: checkoutBookingInput, requestId: z.string().uuid() });

async function prepareCheckout(raw: unknown) {
  const booking = checkoutBookingInput.parse(raw);
  const dateKey = booking.calendarDate || booking.date.slice(0,10);
  if (!validBookingDate(dateKey) || parseBookingTime(booking.time) === null)
    throw fail(400, 'A valid booking date and time are required.');
  if (booking.type === 'offline') {
    if (!booking.address?.trim() || !booking.city?.trim() || !/^[1-9]\d{5}$/.test(booking.pincode || ''))
      throw fail(400, 'City, full address and a valid six-digit pincode are required.');
    const key = (value: string) => value.trim().toLowerCase().replace(/\s+/g,'-');
    if (!(await storage.getAllCities()).some(c => c.isActive !== false && key(c.name) === key(booking.city!)))
      throw fail(400, 'Please select an active service city.');
  }
  const puja = await storage.getPuja(booking.pujaId);
  if (!puja || puja.isActive === false) throw fail(409, 'This puja is no longer available.');
  if (!Number.isInteger(puja.duration) || puja.duration < 0 || puja.duration > 1440)
    throw fail(400, 'Puja duration is not configured.');
  const quote = await getPricingQuote(pricingQuotePayload.parse({
    pujaId: puja.id, calendarDate: dateKey, time: booking.time, withSamagri: booking.withSamagri,
  }));
  if (toPaise(booking.amount) !== toPaise(quote.totalAmount))
    throw fail(409, 'The puja price has changed. Review the current price before paying.');
  if (booking.gurujiId) {
    const matches = await storage.getGurujisByFilters({city: booking.city, pujaId: puja.id});
    const busy = await getBusyGurujiIds([booking.gurujiId],dateKey,booking.time,puja.duration);
    if (!matches.some(g => g.id === booking.gurujiId) || busy.has(booking.gurujiId))
      throw fail(409, 'This Guruji is no longer available. Select another Guruji or time before paying.');
  }
  return { booking: {...booking, calendarDate:dateKey,duration:puja.duration}, quote, puja };
}

export async function startCheckout(customerId: number, raw: unknown, origin: string) {
  const settings = await paymentSettings();
  if (!settings.paymentRequired) throw fail(409, 'Online payment is disabled. Return to review and send your booking request without payment.');
  if (!settings.checkoutAvailable) throw fail(503, 'Secure checkout is unavailable. No payment or booking has been created.');
  const input = checkoutInput.parse(raw);
  const existing = (await pool.query(
    'SELECT payment_provider FROM portal_checkout_orders WHERE customer_id=$1 AND request_id=$2',
    [customerId,input.requestId],
  )).rows[0];
  if (existing && existing.payment_provider !== 'cashfree')
    throw fail(410,'This payment attempt uses a retired provider. Start a new booking to pay with Cashfree.');
  return createCashfreeCheckoutOrder(customerId,raw,origin,settings);
}

export async function createCashfreeCheckoutOrder(
  customerId: number,
  raw: unknown,
  origin: string,
  settings: Awaited<ReturnType<typeof paymentSettings>>,
) {
  const input = checkoutInput.parse(raw);
  const prepared = await prepareCheckout(input.booking);
  const amount = advancePaise(prepared.quote.totalAmount, settings.advancePercentage);
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 99999999)
    throw fail(400, 'The configured advance is outside the payment provider limits.');
  const commission = await getBookingCommission(prepared.puja.id, prepared.quote.totalAmount);
  const customer = (await pool.query(
    `SELECT id,"firstName","lastName",email,mobile FROM users WHERE id=$1`,
    [customerId],
  )).rows[0];
  const phone = String(customer?.mobile || '').replace(/\D/g, '');
  if (!customer || phone.length < 10 || phone.length > 15)
    throw fail(400, 'Add a valid mobile number to your profile before paying.');
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${customerId}:${input.requestId}`]);
    let order = (await db.query(
      'SELECT * FROM portal_checkout_orders WHERE customer_id=$1 AND request_id=$2 FOR UPDATE',
      [customerId,input.requestId],
    )).rows[0];
    if (order) {
      const same = (await db.query(
        'SELECT booking_payload=$2::jsonb AS same FROM portal_checkout_orders WHERE id=$1',
        [order.id,JSON.stringify(prepared.booking)],
      )).rows[0].same;
      if (!same) throw fail(409, 'This checkout attempt belongs to a different booking. Start a new attempt.');
      if (order.booking_id) { await db.query('COMMIT'); return { bookingId: order.booking_id }; }
      if (order.payment_provider !== 'cashfree')
        throw fail(409, 'A previous payment attempt is still linked to this booking. Resume it or start a new attempt.');
      if (new Date(order.expires_at).getTime() <= Date.now())
        throw fail(409, 'This payment attempt expired. Start a new attempt.');
    } else {
      order = (await db.query(`INSERT INTO portal_checkout_orders(id,customer_id,request_id,booking_payload,
        pricing_snapshot,commission_snapshot,advance_percentage,advance_paise,livemode,payment_provider,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'cashfree',NOW()+INTERVAL '35 minutes') RETURNING *`,
        [randomUUID(),customerId,input.requestId,prepared.booking,prepared.quote,commission,
          settings.advancePercentage,amount,settings.providerMode === 'live'])).rows[0];
    }

    const liveMode = order.livemode === true;
    let paymentSessionId = order.cashfree_payment_session_id as string | null;
    const returnUrl = `${origin}/payment-return?order_id=${encodeURIComponent(order.id)}`;
    const notifyUrl = cashfreeWebhookUrl(origin);
    if (order.cashfree_order_id) {
      const existing = await getCashfreeOrder(order.cashfree_order_id,liveMode);
      if (existing.order_status === 'PAID') {
        await db.query('COMMIT');
        return { orderId: order.id, providerMode: liveMode?'live' as const:'test' as const };
      }
      if (existing.order_status !== 'ACTIVE' || !existing.payment_session_id)
        throw fail(409, 'This Cashfree order is no longer active. Check payment status before retrying.');
      paymentSessionId = existing.payment_session_id;
      await db.query('UPDATE portal_checkout_orders SET cashfree_payment_session_id=$2 WHERE id=$1',
        [order.id,paymentSessionId]);
    } else {
      const cfOrderId = `vdpuja-${String(order.id).replaceAll('-','')}`;
      const created = await createCashfreeOrder({
        order_id: cfOrderId,
        order_amount: Number(order.advance_paise) / 100,
        order_currency: 'INR',
        customer_details: {
          customer_id: String(customer.id),
          customer_name: [customer.firstName,customer.lastName].filter(Boolean).join(' ').slice(0,100) || `Customer ${customer.id}`,
          customer_email: customer.email || undefined,
          customer_phone: phone,
        },
        order_meta: { return_url: returnUrl, notify_url: notifyUrl },
        order_expiry_time: new Date(order.expires_at).toISOString(),
        order_note: 'Vaidik Dhara puja booking advance',
        order_tags: { portal_kind: 'puja_booking', portal_order_id: String(order.id) },
      },liveMode);
      if (created.order_id !== cfOrderId || created.order_currency !== 'INR' ||
          Math.round(Number(created.order_amount) * 100) !== Number(order.advance_paise) ||
          !created.payment_session_id) {
        throw fail(502,'Cashfree returned an order that did not match the booking amount.');
      }
      paymentSessionId = created.payment_session_id;
      await db.query(`UPDATE portal_checkout_orders SET cashfree_order_id=$2,cashfree_payment_session_id=$3
        WHERE id=$1`,[order.id,cfOrderId,paymentSessionId]);
    }
    await db.query('COMMIT');
    return {
      orderId: order.id,
      paymentSessionId,
      providerMode: liveMode?'live' as const:'test' as const,
      advanceAmount: Number(order.advance_paise) / 100,
    };
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}

export function cashfreeWebhookUrl(origin?:string) {
  return `${checkoutReturnOrigin(origin)}/api/cashfree/webhook`;
}

export type EligibleGurujis = (booking: any) => Promise<any[]>;
export type PaymentBroadcast = (booking: any, gurujis: any[]) => void;

export async function completeCashfreeCheckout(
  cashfreeOrder: Awaited<ReturnType<typeof getCashfreeOrder>>,
  payment: CashfreePayment,
  eligible: EligibleGurujis,
  broadcast: PaymentBroadcast,
) {
  const order = (await pool.query(
    'SELECT * FROM portal_checkout_orders WHERE cashfree_order_id=$1',
    [cashfreeOrder.order_id],
  )).rows[0];
  if (!order) return null;
  if (order.livemode && process.env.NODE_ENV !== 'production')
    throw fail(409,'Live Cashfree payments can only be fulfilled on the published production server.');
  if (!order.livemode && process.env.NODE_ENV==='production')
    throw fail(409,'Sandbox payments cannot create bookings on the published site.');
  if (order.payment_provider !== 'cashfree' ||
      !isVerifiedCashfreePayment(cashfreeOrder,payment,order.cashfree_order_id,Number(order.advance_paise))) {
    throw fail(409,'Cashfree payment verification did not match this booking. The support team must review it.');
  }
  return finalizeBookingCheckout(
    order.id,String(payment.cf_payment_id),order.livemode === true,eligible,broadcast,
  );
}

async function finalizeBookingCheckout(
  orderId: string,
  paymentReference: string,
  liveMode: boolean,
  eligible: EligibleGurujis,
  broadcast: PaymentBroadcast,
) {
  const db = await pool.connect();
  let result: any;
  let recipients: any[] = [];
  try {
    await db.query('BEGIN');
    const order = (await db.query('SELECT * FROM portal_checkout_orders WHERE id=$1 FOR UPDATE',[orderId])).rows[0];
    if (!order || order.payment_provider !== 'cashfree' || order.livemode !== liveMode) {
      await db.query('COMMIT');
      return null;
    }
    if (order.booking_id) {
      await db.query('COMMIT');
      result = await storage.getBooking(order.booking_id);
    } else {
      const b = order.booking_payload;
      let gurujiId = b.gurujiId || null;
      let support = Date.parse(`${b.calendarDate}T00:00:00+05:30`) + parseBookingTime(b.time)! * 60_000 <= Date.now();
      if (gurujiId && !support) {
        await db.query('SELECT pg_advisory_xact_lock(8157,$1)',[gurujiId]);
        const matches = await storage.getGurujisByFilters({city:b.city,pujaId:b.pujaId});
        const busy = await getBusyGurujiIds([gurujiId],b.calendarDate,b.time,b.duration);
        const gp = matches.find(g=>g.id===gurujiId);
        if (gp && !busy.has(gurujiId)) recipients=[gp]; else support=true;
      } else if (!support) {
        recipients=await eligible({...b,date:b.calendarDate});
      }
      if (support) { gurujiId=null; recipients=[]; }
      const saved = (await db.query(`INSERT INTO bookings("customerId","pujaId","gurujiId",address,city,state,pincode,
        date,time,"locationType","totalAmount","consultationType",notes,status,"createdAt","updatedAt",duration,
        pricing_snapshot,commission_snapshot)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW(),$15,$16,$17) RETURNING id`,
        [order.customer_id,b.pujaId,gurujiId,b.address||null,b.city||null,b.state||null,b.pincode||null,
          b.calendarDate,b.time,b.type,order.pricing_snapshot.totalAmount,b.consultationType||'own_guruji',
          b.notes||null,recipients.length?'pending_approval':'pending',b.duration,order.pricing_snapshot,order.commission_snapshot])).rows[0];
      // Test transactions must never become actual collected money, refund
      // liabilities or Guruji settlement receipts.
      if (liveMode) {
        await db.query(`INSERT INTO payments("bookingId",amount,status,"transactionId",method,"paidAt","createdAt","updatedAt")
          VALUES($1,$2,'paid',$3,$4,NOW(),NOW(),NOW())`,
          [saved.id,Number(order.advance_paise)/100,paymentReference,'cashfree']);
        await db.query(`INSERT INTO guruji_finance_receipts(booking_id,guruji_id,received_by,amount,received_on,reference,notes,created_by)
          VALUES($1,NULL,'portal',$2,(NOW() AT TIME ZONE 'Asia/Kolkata')::date,$3,$4,$5)`,
          [saved.id,Number(order.advance_paise)/100,paymentReference,
            `Cashfree-verified ${order.advance_percentage}% advance`,order.customer_id]);
      }
      for (const g of recipients) {
        await db.query(`INSERT INTO booking_requests("bookingId","gurujiId",status,"createdAt","updatedAt")
          VALUES($1,$2,'pending',NOW(),NOW())`,[saved.id,g.id]);
        await db.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
          VALUES($1,'New Puja Request',$2,'booking_request',false,NOW())`,
          [g.userId,`Booking #${saved.id} in ${b.city||'your area'} on ${b.calendarDate} at ${b.time}. Please accept or decline.`]);
      }
      await db.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
        VALUES($1,$2,$3,'booking_update',false,NOW())`,
        [order.customer_id,liveMode?'Booking advance received':'Test checkout completed',
          `${liveMode?`₹${Number(order.advance_paise)/100} received`:'TEST ONLY — no money collected'} for booking #${saved.id}. ${recipients.length
          ? 'Your request has been sent. Guruji acceptance is still required.'
          : 'The Vaidik Dhara support team has been alerted to help with your unassigned request.'}`]);
      await db.query(`UPDATE portal_checkout_orders SET booking_id=$2,cashfree_payment_id=$3,
        state=$4,needs_support=$5 WHERE id=$1`,
        [order.id,saved.id,paymentReference,support?'review':'fulfilled',support]);
      await db.query('COMMIT');
      result=await storage.getBooking(saved.id);
      broadcast(result,recipients);
    }
  } catch(error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
  if (result && (!result.gurujiId)) {
    // Existing helper is idempotent; recovery after a webhook retry cannot
    // silently lose support-team oversight.
    await notifyAdminsOfUnassignedBooking(result,recipients.length,storage);
  }
  return result;
}

export async function verifyCashfreeCheckout(orderId: string, eligible: EligibleGurujis, broadcast: PaymentBroadcast) {
  const order = (await pool.query('SELECT * FROM portal_checkout_orders WHERE id=$1 AND payment_provider=$2',
    [orderId,'cashfree'])).rows[0];
  if (!order) throw fail(404,'Payment attempt not found.');
  if (order.livemode && process.env.NODE_ENV !== 'production')
    throw fail(409,'Live Cashfree payments can only be checked on the published production server.');
  if (!order.livemode && process.env.NODE_ENV==='production')
    throw fail(409,'Sandbox payments cannot be used on the published site.');
  if (order.booking_id) {
    const booking=await storage.getBooking(order.booking_id);
    return {state:'paid',bookingId:order.booking_id,advanceAmount:Number(order.advance_paise)/100,
      needsSupport:order.needs_support,testMode:!order.livemode,booking};
  }
  if (!order.cashfree_order_id) return {state:'unpaid'};
  const remoteOrder=await getCashfreeOrder(order.cashfree_order_id,order.livemode === true);
  if (remoteOrder.order_status !== 'PAID') {
    const expired=['EXPIRED','TERMINATED'].includes(remoteOrder.order_status);
    if (expired) await pool.query(`UPDATE portal_checkout_orders SET state='expired'
      WHERE id=$1 AND booking_id IS NULL`,[order.id]);
    if (remoteOrder.order_status==='ACTIVE') {
      const attempts=await getCashfreePayments(order.cashfree_order_id,order.livemode === true);
      return {state:attempts.some(p=>p.payment_status==='PENDING')?'processing':'unpaid'};
    }
    return {state:expired?'expired':'processing'};
  }
  const payments=await getCashfreePayments(order.cashfree_order_id,order.livemode === true);
  const payment=payments.find(p=>p.payment_status==='SUCCESS');
  if (!payment) return {state:'processing'};
  const booking=await completeCashfreeCheckout(remoteOrder,payment,eligible,broadcast);
  const updated=(await pool.query('SELECT needs_support FROM portal_checkout_orders WHERE id=$1',[order.id])).rows[0];
  return {state:'paid',bookingId:booking!.id,advanceAmount:Number(order.advance_paise)/100,
    needsSupport:updated.needs_support,testMode:!order.livemode};
}

export async function checkoutResult(customerId: number, sessionId: string, eligible: EligibleGurujis, broadcast: PaymentBroadcast) {
  const order=(await pool.query(`SELECT * FROM portal_checkout_orders WHERE customer_id=$2 AND
    (id::text=$1 OR cashfree_order_id=$1)`,[sessionId,customerId])).rows[0];
  if (!order) {
    const retired=(await pool.query('SELECT id FROM portal_checkout_orders WHERE customer_id=$2 AND stripe_session_id=$1',
      [sessionId,customerId])).rows[0];
    if (retired) throw fail(410,'This archived payment attempt is no longer supported. Contact the Vaidik Dhara support team for help.');
    throw fail(404,'Payment attempt not found.');
  }
  if (order.payment_provider !== 'cashfree')
    throw fail(410,'This payment attempt uses a retired provider. Start a new booking to pay with Cashfree.');
  const result=await verifyCashfreeCheckout(order.id,eligible,broadcast);
  return {state:result.state,bookingId:result.bookingId,advanceAmount:result.advanceAmount,
    needsSupport:result.needsSupport,testMode:result.testMode};
}

export async function processCashfreeWebhook(
  payload: Buffer,
  signature: string,
  timestamp: string,
  eligible: EligibleGurujis,
  broadcast: PaymentBroadcast,
) {
  if (!Buffer.isBuffer(payload)) throw fail(500,'Cashfree webhook requires an unparsed body.');
  let event: any;
  try { event = JSON.parse(payload.toString('utf8')); }
  catch { throw fail(400,'Invalid Cashfree webhook payload.'); }
  const orderId = event?.data?.order?.order_id || event?.data?.order_id || event?.data?.refund?.order_id;
  const bookingOrder = typeof orderId==='string' ? (await pool.query(
    'SELECT id,livemode FROM portal_checkout_orders WHERE cashfree_order_id=$1',[orderId],
  )).rows[0] : null;
  const eventRegistration = typeof orderId==='string' ? (await pool.query(
    'SELECT id,is_test FROM event_registrations WHERE cashfree_order_id=$1',[orderId],
  )).rows[0] : null;
  const row = bookingOrder || eventRegistration;
  if (!row) {
    // Cashfree dashboard test events and unrelated signed events are acknowledged
    // without creating any booking, registration or financial record.
    if (!verifyCashfreeWebhookSignature(payload,timestamp,signature,false) &&
        !verifyCashfreeWebhookSignature(payload,timestamp,signature,true))
      throw fail(400,'Cashfree webhook signature is invalid.');
    return;
  }
  const liveMode = bookingOrder ? row.livemode === true : row.is_test !== true;
  if (!verifyCashfreeWebhookSignature(payload,timestamp,signature,liveMode))
    throw fail(400,'Cashfree webhook signature is invalid.');

  const refund=event?.data?.refund;
  if (refund && typeof refund.refund_id==='string') {
    const request=(await pool.query(`SELECT id FROM customer_refund_requests
      WHERE cashfree_order_id=$1 AND cashfree_refund_id=$2 AND cashfree_amount_paise>0`,
      [orderId,refund.refund_id])).rows[0];
    if (request) {
      const {reconcileRefundRequest}=await import('./customerRefunds');
      await reconcileRefundRequest(request.id);
    }
    return;
  }

  const status = event?.data?.payment?.payment_status || event?.data?.order?.order_status;
  if (status === 'SUCCESS' || status === 'PAID') {
    if (bookingOrder) await verifyCashfreeCheckout(bookingOrder.id,eligible,broadcast);
    else await (await import('./eventPayments')).reconcileCashfreeEventPayment(eventRegistration.id);
  } else if (bookingOrder && ['FAILED','EXPIRED','TERMINATED'].includes(String(status).toUpperCase())) {
    await pool.query(`UPDATE portal_checkout_orders SET state=$2
      WHERE id=$1 AND booking_id IS NULL AND state='pending'`,
      [bookingOrder.id,String(status).toUpperCase()==='FAILED'?'failed':'expired']);
  } else if (eventRegistration && ['EXPIRED','TERMINATED'].includes(String(status).toUpperCase())) {
    await (await import('./eventPayments')).reconcileCashfreeEventPayment(eventRegistration.id);
  }
}
