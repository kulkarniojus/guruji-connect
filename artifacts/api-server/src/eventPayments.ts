import type Stripe from 'stripe';
import { pool } from './db';
import { getUncachableStripeClient } from './stripeClient';
import { paymentSettings, checkoutReturnOrigin } from './stripePayments';
import { eventFail, registrationView } from './eventsModel';

export async function startEventPayment(id: string, guardianId: number, requestOrigin?: string) {
  const settings = await paymentSettings();
  if (!settings.checkoutAvailable) throw eventFail(503,'Online checkout is unavailable. Please contact the Sanatan Guruji support team.');
  const origin = checkoutReturnOrigin(requestOrigin);
  const stripe = await getUncachableStripeClient();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owned = (await client.query('SELECT event_id FROM event_registrations WHERE id=$1 AND guardian_id=$2', [id,guardianId])).rows[0];
    if (!owned) throw eventFail(404,'Registration not found');
    const event = (await client.query('SELECT * FROM religious_events WHERE id=$1 FOR UPDATE', [owned.event_id])).rows[0];
    let row = (await client.query('SELECT * FROM event_registrations WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (row.payment_method !== 'online' || row.fee_paise<=0) throw eventFail(409,'This registration does not use online checkout');
    if (row.paid_paise>=row.fee_paise) throw eventFail(409,'This registration has already been paid');
    if (row.status!=='pending_payment' || new Date(row.hold_until).getTime()<=Date.now() || event.status!=='published')
      throw eventFail(409,'The registration reservation has expired or the event is unavailable');
    if (row.stripe_session_id) {
      const existing = await stripe.checkout.sessions.retrieve(row.stripe_session_id);
      if (existing.status==='open' && existing.url) {
        await client.query('COMMIT'); return { url: existing.url, mode: existing.livemode?'live':'test' };
      }
      throw eventFail(409,'Checkout is complete or expired. Refresh payment status; expired registrations must be registered again.');
    }
    if (!row.checkout_expires_at) {
      row = (await client.query(`UPDATE event_registrations SET checkout_expires_at=now()+interval '31 minutes',
        hold_until=now()+interval '35 minutes' WHERE id=$1 RETURNING *`,[id])).rows[0];
    }
    // Persist the attempt before external calls so retries use identical Stripe
    // parameters even if a response is lost. Never create a second payment.
    await client.query('COMMIT');
    if (new Date(row.checkout_expires_at).getTime()<Date.now()+30*60000)
      throw eventFail(409,'Checkout setup timed out. Check payment status, then cancel the unpaid reservation and register again.');
    const mode = settings.providerMode;
    const product = await stripe.products.create({
      name: row.event_name, metadata: { portal_kind: 'event', event_id: String(event.id) },
    }, { idempotencyKey: `event-product-${mode}-${id}` });
    const price = await stripe.prices.create({
      product: product.id, currency: 'inr', unit_amount: row.fee_paise,
      metadata: { portal_kind: 'event_registration', event_registration_id: id },
    }, { idempotencyKey: `event-price-${mode}-${id}` });
    const returnPath = `${origin}/events/registrations?registrationId=${id}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', client_reference_id: id, line_items: [{ price: price.id, quantity: 1 }],
      metadata: { portal_kind: 'event_registration', event_registration_id: id },
      success_url: `${returnPath}&payment=return`,
      cancel_url: `${returnPath}&payment=cancelled`,
      expires_at: Math.floor(new Date(row.checkout_expires_at).getTime()/1000),
    }, { idempotencyKey: `event-checkout-${mode}-${id}` });
    if (!session.url) throw eventFail(503,'The payment provider did not return a checkout URL');
    await client.query(`UPDATE event_registrations SET stripe_session_id=$2,stripe_price_id=$3,is_test=$4 WHERE id=$1`,
      [id,session.id,price.id,!session.livemode]);
    const current = (await client.query('SELECT status FROM event_registrations WHERE id=$1',[id])).rows[0];
    if (current.status==='cancelled') {
      await stripe.checkout.sessions.expire(session.id);
      throw eventFail(409,'This reservation was cancelled while checkout was being prepared');
    }
    return { url: session.url, mode: session.livemode?'live':'test' };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

// Called only after signature verification or a direct, authenticated Stripe retrieval.
export async function completeEventPayment(session: Stripe.Checkout.Session) {
  if (session.metadata?.portal_kind !== 'event_registration' || session.payment_status!=='paid') return;
  const id = session.metadata.event_registration_id;
  if (!id) throw eventFail(400,'Missing event registration reference');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lookup = (await client.query('SELECT event_id FROM event_registrations WHERE id=$1 AND stripe_session_id=$2', [id,session.id])).rows[0];
    if (!lookup) throw eventFail(409,'Event payment is not linked to a registration');
    const event = (await client.query('SELECT * FROM religious_events WHERE id=$1 FOR UPDATE', [lookup.event_id])).rows[0];
    const row = (await client.query('SELECT * FROM event_registrations WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (row.paid_paise>0) { await client.query('COMMIT'); return; }
    if (session.currency!=='inr' || session.amount_total!==row.fee_paise || session.livemode===row.is_test ||
        session.client_reference_id!==row.id) throw eventFail(409,'Event payment verification failed');
    const occupied = (await client.query(`SELECT count(*)::int AS count FROM event_registrations WHERE event_id=$1 AND id<>$2
      AND (status IN ('registered','pending_confirmation') OR (status='pending_payment' AND hold_until>now()))`, [row.event_id,id])).rows[0].count;
    const cancelled = row.status==='cancelled' || event.status==='cancelled' || occupied>=event.details.capacity;
    await client.query(`UPDATE event_registrations SET paid_paise=fee_paise,status=$2,hold_until=null,
      cancellation_reason=CASE WHEN $2='cancelled' AND cancellation_reason='' THEN 'Paid after availability ended; refund owed' ELSE cancellation_reason END
      WHERE id=$1`, [id,cancelled?'cancelled':'registered']);
    await client.query(`INSERT INTO event_payment_records(registration_id,type,amount_paise,reference,note)
      VALUES($1,'payment',$2,$3,$4) ON CONFLICT DO NOTHING`,
      [id,row.fee_paise,session.id,session.livemode?'Server-verified Stripe payment':'TEST payment — no real money collected']);
    await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
      VALUES($1,$2,$3,'event',false,now())`, [row.guardian_id,
      cancelled?'Event payment needs support':'Event registration confirmed',
      `${session.livemode?'':'TEST MODE: '}${event.details.name}: ${cancelled
        ? 'Payment was verified after availability ended. The recorded refund must be settled by the Sanatan Guruji support team.'
        : 'Your registration is confirmed. View your event registrations for the schedule.'}`]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function expireEventPayment(session: Stripe.Checkout.Session) {
  if (session.metadata?.portal_kind !== 'event_registration') return;
  await pool.query(`UPDATE event_registrations SET status='expired',hold_until=null
    WHERE stripe_session_id=$1 AND status='pending_payment' AND paid_paise=0`, [session.id]);
}
export async function reconcileEventPayment(id: string, guardianId: number) {
  const row = (await pool.query('SELECT * FROM event_registrations WHERE id=$1 AND guardian_id=$2', [id,guardianId])).rows[0];
  if (!row) throw eventFail(404,'Registration not found');
  if (row.stripe_session_id) {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(row.stripe_session_id);
    if (session.payment_status==='paid') await completeEventPayment(session);
    else if (session.status==='expired') await expireEventPayment(session);
  }
  return registrationView(id);
}
