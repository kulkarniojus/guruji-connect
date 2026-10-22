import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { runMigrations } from 'stripe-replit-sync';
import { z } from 'zod';
import { pool } from './db';
import { DBStorage } from './dbStorage';
import { getUncachableStripeClient, getStripeSync } from './stripeClient';
import { getPricingQuote, pricingQuotePayload } from './pujaPricing';
import { getBookingCommission } from './pujaCommission';
import { getBusyGurujiIds, parseBookingTime, validBookingDate } from './bookingSchedule';
import { notifyAdminsOfUnassignedBooking } from './unassignedBookingAlerts';

const storage = new DBStorage();
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
export const toPaise = (value: number) => Math.round(value * 100);
export const advancePaise = (total: number, percentage: number) => Math.round(toPaise(total) * percentage / 100);
let gateway = { available: false, mode: 'unavailable' as 'test' | 'live' | 'unavailable' };

export function webhookUrl() {
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0]?.trim();
  if (!domain) throw new Error('A public runtime domain is required for payment verification.');
  return `https://${domain}/api/stripe/webhook`;
}

export function checkoutReturnOrigin(requestOrigin?: string) {
  const allowed=(process.env.REPLIT_DOMAINS||'').split(',').map(v=>v.trim()).filter(Boolean);
  // Keep the customer on their portal origin, including its confirmed custom
  // domain, so the return does not lose their existing signed-in session.
  allowed.push('sanatanguruji.com','www.sanatanguruji.com');
  const candidate=new URL(requestOrigin||`https://${allowed[0]}`);
  if (candidate.protocol!=='https:' || candidate.port || candidate.username || candidate.password ||
      !allowed.includes(candidate.hostname)) throw fail(400,'The checkout return origin is not configured.');
  return candidate.origin;
}

export async function initializePaymentStorage() {
  // A new, default-off switch prevents an old, formerly ignored UPI setting
  // from unexpectedly enabling real charges after this update.
  await pool.query(`ALTER TABLE app_settings
    ADD COLUMN IF NOT EXISTS stripe_payments_enabled boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS advance_percentage numeric(5,2) NOT NULL DEFAULT 25;
    CREATE TABLE IF NOT EXISTS portal_checkout_orders (
      id uuid PRIMARY KEY, customer_id integer NOT NULL REFERENCES users(id),
      request_id uuid NOT NULL, booking_payload jsonb NOT NULL, pricing_snapshot jsonb NOT NULL,
      commission_snapshot jsonb NOT NULL, advance_percentage numeric(5,2) NOT NULL,
      advance_paise integer NOT NULL CHECK(advance_paise>0), livemode boolean NOT NULL,
      stripe_session_id text UNIQUE, stripe_payment_intent_id text UNIQUE,
      booking_id integer UNIQUE REFERENCES bookings(id), needs_support boolean NOT NULL DEFAULT false,
      state text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT NOW(),
      expires_at timestamptz NOT NULL, UNIQUE(customer_id,request_id)
    );
    CREATE INDEX IF NOT EXISTS portal_checkout_pending ON portal_checkout_orders(state,created_at);`);
  // The legacy table stored whole rupees. Widen, without changing units or
  // existing values, so percentage advances retain their paise exactly.
  await pool.query('ALTER TABLE payments ALTER COLUMN amount TYPE numeric(14,2) USING amount::numeric');
}

export async function initializeStripeGateway() {
  gateway = { available: false, mode: 'unavailable' };
  try {
    await runMigrations({ databaseUrl: process.env.DATABASE_URL! });
    const stripe = await getUncachableStripeClient();
    const balance = await stripe.balance.retrieve();
    const sync = await getStripeSync();
    try {
      await sync.findOrCreateManagedWebhook(webhookUrl());
      await sync.syncBackfill({ object: 'all' });
      gateway = { available: true, mode: balance.livemode ? 'live' : 'test' };
      console.log(`Stripe checkout ready (${gateway.mode} mode); the admin payment switch is unchanged.`);
    } finally { await sync.postgresClient.pool.end(); }
  } catch {
    // Optional payments must not take the existing no-payment portal offline.
    console.error('Stripe setup is unavailable. Online checkout is blocked; disabled-payment bookings remain available.');
  }
}

export async function paymentSettings() {
  const row = (await pool.query('SELECT * FROM app_settings ORDER BY id LIMIT 1')).rows[0];
  if (!row) throw fail(503, 'Payment settings are unavailable.');
  return {
    checkoutAvailable: gateway.available, provider: 'stripe', providerMode: gateway.mode,
    paymentRequired: row.stripe_payments_enabled === true,
    paymentSkipped: row.stripe_payments_enabled !== true,
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
  if (input.paymentRequired && !gateway.available) throw fail(503, 'Stripe checkout and signed webhooks must be ready before enabling payments.');
  await pool.query(`UPDATE app_settings SET stripe_payments_enabled=$1,payment_required=$1,
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

async function checkoutPrice(stripe: Stripe, puja: any, amount: number) {
  const lookupKey = `sg-advance-${puja.id}-${amount}`;
  const prices = await stripe.prices.list({lookup_keys:[lookupKey],active:true,limit:1});
  if (prices.data[0]) {
    if (prices.data[0].currency!=='inr' || prices.data[0].unit_amount!==amount)
      throw fail(503,'The configured Stripe price does not match the booking advance.');
    return prices.data[0].id;
  }
  // Stripe Search is unavailable for some India accounts; ordinary pagination
  // works there too.
  let existing: Stripe.Product | undefined;
  for await (const product of stripe.products.list({active:true,limit:100})) {
    if (product.metadata.sg_puja_id===String(puja.id) && product.metadata.sg_kind==='advance') { existing=product; break; }
  }
  const product = existing || await stripe.products.create({
    name:`${puja.name} — booking advance`,metadata:{sg_puja_id:String(puja.id),sg_kind:'advance'},
  },{idempotencyKey:`sg-puja-advance-product-${puja.id}`});
  try {
    return (await stripe.prices.create({
      product:product.id,currency:'inr',unit_amount:amount,lookup_key:lookupKey,
    },{idempotencyKey:`sg-advance-price-${puja.id}-${amount}`})).id;
  } catch (error) {
    const retry = await stripe.prices.list({lookup_keys:[lookupKey],active:true,limit:1});
    if (retry.data[0]) return retry.data[0].id;
    throw error;
  }
}

export async function startCheckout(customerId: number, raw: unknown, origin: string) {
  const settings = await paymentSettings();
  if (!settings.paymentRequired) throw fail(409, 'Online payment is disabled. Return to review and send your booking request without payment.');
  if (!settings.checkoutAvailable) throw fail(503, 'Secure checkout is unavailable. No payment or booking has been created.');
  return createCheckoutOrder(customerId,raw,origin,settings);
}

// Business operation separated from the HTTP/admin-switch gate for isolated
// sandbox verification without enabling payments for other portal users.
export async function createCheckoutOrder(customerId: number, raw: unknown, origin: string, settings: Awaited<ReturnType<typeof paymentSettings>>) {
  const input = checkoutInput.parse(raw);
  const prepared = await prepareCheckout(input.booking);
  const amount = advancePaise(prepared.quote.totalAmount, settings.advancePercentage);
  if (!Number.isSafeInteger(amount) || amount < 50 || amount > 99999999)
    throw fail(400, 'The configured advance is outside the payment provider limits.');
  const commission = await getBookingCommission(prepared.puja.id, prepared.quote.totalAmount);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${customerId}:${input.requestId}`]);
    let order = (await db.query('SELECT * FROM portal_checkout_orders WHERE customer_id=$1 AND request_id=$2 FOR UPDATE',
      [customerId,input.requestId])).rows[0];
    if (order) {
      if (JSON.stringify(order.booking_payload) !== JSON.stringify(JSON.parse(JSON.stringify(prepared.booking)))) {
        // JSONB key order is not stable; compare the canonical value in SQL.
        const same = (await db.query('SELECT booking_payload=$2::jsonb AS same FROM portal_checkout_orders WHERE id=$1',
          [order.id,JSON.stringify(prepared.booking)])).rows[0].same;
        if (!same) throw fail(409, 'This checkout attempt belongs to a different booking. Start a new attempt.');
      }
      if (order.booking_id) { await db.query('COMMIT'); return {bookingId:order.booking_id}; }
      if (new Date(order.expires_at).getTime() <= Date.now()) throw fail(409, 'This payment attempt expired. Start a new attempt.');
    } else {
      order = (await db.query(`INSERT INTO portal_checkout_orders(id,customer_id,request_id,booking_payload,
        pricing_snapshot,commission_snapshot,advance_percentage,advance_paise,livemode,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()+INTERVAL '35 minutes') RETURNING *`,
        [randomUUID(),customerId,input.requestId,prepared.booking,prepared.quote,commission,
          settings.advancePercentage,amount,settings.providerMode==='live'])).rows[0];
    }
    const stripe = await getUncachableStripeClient();
    let session: Stripe.Checkout.Session;
    if (order.stripe_session_id) session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    else {
      const price = await checkoutPrice(stripe,prepared.puja,Number(order.advance_paise));
      session = await stripe.checkout.sessions.create({
        mode:'payment',line_items:[{price,quantity:1}],client_reference_id:order.id,
        metadata:{sg_order_id:order.id,sg_customer_id:String(customerId)},
        payment_intent_data:{metadata:{sg_order_id:order.id}},
        success_url:`${origin}/payment-return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:`${origin}/payment-return?order_id=${order.id}&cancelled=1`,
        expires_at:Math.floor(new Date(order.expires_at).getTime()/1000),
      },{idempotencyKey:`sg-checkout-${order.id}`});
      await db.query('UPDATE portal_checkout_orders SET stripe_session_id=$2 WHERE id=$1',[order.id,session.id]);
    }
    await db.query('COMMIT');
    if (session.status === 'complete') return {sessionId:session.id};
    if (!session.url || session.status !== 'open') throw fail(409, 'This checkout is no longer open. Start a new attempt.');
    return {checkoutUrl:session.url,orderId:order.id,advanceAmount:Number(order.advance_paise)/100};
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}

export type EligibleGurujis = (booking: any) => Promise<any[]>;
export type PaymentBroadcast = (booking: any, gurujis: any[]) => void;

export function assertPaidSession(session: Stripe.Checkout.Session, order: any) {
  if (session.id !== order.stripe_session_id || session.client_reference_id !== order.id ||
      session.metadata?.sg_order_id !== order.id || session.metadata?.sg_customer_id !== String(order.customer_id) ||
      session.currency !== 'inr' || session.amount_total !== Number(order.advance_paise) ||
      session.livemode !== order.livemode || session.payment_status !== 'paid' || !session.payment_intent)
    throw fail(409, 'Payment verification did not match this booking. The support team must review it.');
}

export async function completeCheckout(session: Stripe.Checkout.Session, eligible: EligibleGurujis, broadcast: PaymentBroadcast) {
  const db = await pool.connect();
  let result: any;
  let recipients: any[] = [];
  try {
    await db.query('BEGIN');
    const order = (await db.query('SELECT * FROM portal_checkout_orders WHERE stripe_session_id=$1 FOR UPDATE',[session.id])).rows[0];
    if (!order) { await db.query('COMMIT'); return null; } // An unrelated Stripe application.
    assertPaidSession(session,order);
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
      const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent!.id;
      // Stripe test transactions must never become actual collected money,
      // refund liabilities or Guruji settlement receipts.
      if (session.livemode) {
        await db.query(`INSERT INTO payments("bookingId",amount,status,"transactionId",method,"paidAt","createdAt","updatedAt")
          VALUES($1,$2,'paid',$3,'stripe',NOW(),NOW(),NOW())`,[saved.id,Number(order.advance_paise)/100,paymentIntent]);
        await db.query(`INSERT INTO guruji_finance_receipts(booking_id,guruji_id,received_by,amount,received_on,reference,notes,created_by)
          VALUES($1,NULL,'portal',$2,(NOW() AT TIME ZONE 'Asia/Kolkata')::date,$3,$4,$5)`,
          [saved.id,Number(order.advance_paise)/100,paymentIntent,`Stripe-verified ${order.advance_percentage}% advance`,order.customer_id]);
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
        [order.customer_id,session.livemode?'Booking advance received':'Test checkout completed',
          `${session.livemode?`₹${Number(order.advance_paise)/100} received`:'TEST ONLY — no money collected'} for booking #${saved.id}. ${recipients.length
          ? 'Your request has been sent. Guruji acceptance is still required.'
          : 'The Sanatan Guruji support team has been alerted to help with your unassigned request.'}`]);
      await db.query(`UPDATE portal_checkout_orders SET booking_id=$2,stripe_payment_intent_id=$3,state=$4,needs_support=$5 WHERE id=$1`,
        [order.id,saved.id,paymentIntent,support?'review':'fulfilled',support]);
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

export async function checkoutResult(customerId: number, sessionId: string, eligible: EligibleGurujis, broadcast: PaymentBroadcast) {
  const order=(await pool.query('SELECT * FROM portal_checkout_orders WHERE stripe_session_id=$1 AND customer_id=$2',
    [sessionId,customerId])).rows[0];
  if (!order) throw fail(404,'Payment attempt not found.');
  const stripe=await getUncachableStripeClient();
  const session=await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status === 'paid') {
    const booking=await completeCheckout(session,eligible,broadcast);
    const updated=(await pool.query('SELECT needs_support FROM portal_checkout_orders WHERE id=$1',[order.id])).rows[0];
    return {state:'paid',bookingId:booking!.id,advanceAmount:Number(order.advance_paise)/100,
      needsSupport:updated.needs_support,testMode:!session.livemode};
  }
  return {state:order.state==='failed'?'failed':session.status==='expired'?'expired':session.status==='complete'?'processing':'unpaid'};
}

export async function processPaymentWebhook(payload: Buffer, signature: string, eligible: EligibleGurujis, broadcast: PaymentBroadcast) {
  if (!Buffer.isBuffer(payload)) throw fail(500,'Payment webhook requires an unparsed body.');
  // Read the signing secret for THIS environment's endpoint, not another
  // development/production webhook on the same connected Stripe account.
  const secret=(await pool.query('SELECT secret FROM stripe._managed_webhooks WHERE url=$1 LIMIT 1',[webhookUrl()])).rows[0]?.secret;
  if (!secret) throw fail(503,'Payment webhook is not configured.');
  const sync=await getStripeSync(secret);
  try { await sync.processWebhook(payload,signature); }
  finally { await sync.postgresClient.pool.end(); }
  const event=JSON.parse(payload.toString()) as Stripe.Event; // Signature already verified above.
  if (['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) {
    const session=event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.portal_kind==='event_registration') {
      await (await import('./eventPayments')).completeEventPayment(session);
    } else if (session.payment_status==='paid') await completeCheckout(session,eligible,broadcast);
  } else if (['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type)) {
    const session=event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.portal_kind==='event_registration') {
      await (await import('./eventPayments')).expireEventPayment(session);
      return;
    }
    await pool.query(`UPDATE portal_checkout_orders SET state=$2 WHERE stripe_session_id=$1 AND booking_id IS NULL`,
      [session.id,event.type==='checkout.session.expired'?'expired':'failed']);
  }
}
