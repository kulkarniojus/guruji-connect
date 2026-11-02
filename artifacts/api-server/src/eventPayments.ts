import { pool } from './db';
import { paymentSettings, checkoutReturnOrigin, cashfreeWebhookUrl } from './stripePayments';
import { eventFail, registrationView } from './eventsModel';
import { createEventRefundRequest } from './customerRefunds';
import { createCashfreeOrder, getCashfreeOrder, getCashfreePayments, isVerifiedCashfreePayment } from './cashfreeClient';

export async function startEventPayment(id: string, guardianId: number, requestOrigin?: string) {
  const settings = await paymentSettings();
  if (!settings.checkoutAvailable) throw eventFail(503,'Online checkout is unavailable. Please contact the Vaidik Dhara support team.');
  const origin = checkoutReturnOrigin(requestOrigin);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owned = (await client.query('SELECT event_id FROM event_registrations WHERE id=$1 AND guardian_id=$2', [id,guardianId])).rows[0];
    if (!owned) throw eventFail(404,'Registration not found');
    const event = (await client.query('SELECT * FROM religious_events WHERE id=$1 FOR UPDATE', [owned.event_id])).rows[0];
    let row = (await client.query('SELECT * FROM event_registrations WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (row.payment_provider !== 'cashfree')
      throw eventFail(410,'This registration uses a retired payment provider. Contact the Vaidik Dhara support team.');
    if (row.payment_method !== 'online' || row.fee_paise<=0) throw eventFail(409,'This registration does not use online checkout');
    if (row.paid_paise>=row.fee_paise) throw eventFail(409,'This registration has already been paid');
    if (row.status!=='pending_payment' || new Date(row.hold_until).getTime()<=Date.now() || event.status!=='published')
      throw eventFail(409,'The registration reservation has expired or the event is unavailable');
    if (!row.checkout_expires_at) {
      row = (await client.query(`UPDATE event_registrations SET checkout_expires_at=now()+interval '31 minutes',
        hold_until=now()+interval '35 minutes' WHERE id=$1 RETURNING *`,[id])).rows[0];
    }
    // Persist the attempt before external calls so retries use identical
    // Cashfree parameters even if a response is lost.
    await client.query('COMMIT');
    if (!row.cashfree_order_id && new Date(row.checkout_expires_at).getTime()<Date.now()+30*60000)
      throw eventFail(409,'Checkout setup timed out. Check payment status, then cancel the unpaid reservation and register again.');
    const guardian = (await pool.query(
      'SELECT id,"firstName","lastName",email,mobile FROM users WHERE id=$1',[guardianId],
    )).rows[0];
    const phone=String(guardian?.mobile||'').replace(/\D/g,'');
    if (!guardian || phone.length<10 || phone.length>15)
      throw eventFail(400,'Add a valid mobile number to your profile before paying.');
    const liveMode=row.cashfree_order_id?row.is_test!==true:settings.providerMode==='live';
    const mode=liveMode?'live' as const:'test' as const;
    if (!liveMode && process.env.NODE_ENV==='production')
      throw eventFail(409,'Sandbox payments cannot be used on the published site.');
    let cfOrderId=row.cashfree_order_id as string|null;
    let paymentSessionId=row.cashfree_payment_session_id as string|null;
    if (cfOrderId) {
      const existing=await getCashfreeOrder(cfOrderId,liveMode);
      if (existing.order_status==='PAID') {
        await client.query('UPDATE event_registrations SET is_test=$2 WHERE id=$1',[id,!liveMode]);
        await client.query('COMMIT');
        await reconcileCashfreeEventPayment(id);
        return { orderId:id, mode };
      }
      if (existing.order_status!=='ACTIVE' || !existing.payment_session_id)
        throw eventFail(409,'Checkout is complete or expired. Refresh payment status; expired registrations must be registered again.');
      paymentSessionId=existing.payment_session_id;
      await client.query('UPDATE event_registrations SET cashfree_payment_session_id=$2 WHERE id=$1',
        [id,paymentSessionId]);
    } else {
      cfOrderId=`vdevent-${id.replaceAll('-','')}`;
      const returnUrl=`${origin}/events/registrations?registrationId=${encodeURIComponent(id)}&payment=return`;
      const created=await createCashfreeOrder({
        order_id:cfOrderId,
        order_amount:Number(row.fee_paise)/100,
        order_currency:'INR',
        customer_details:{
          customer_id:String(guardian.id),
          customer_name:[guardian.firstName,guardian.lastName].filter(Boolean).join(' ').slice(0,100)||`Customer ${guardian.id}`,
          customer_email:guardian.email||undefined,
          customer_phone:phone,
        },
        order_meta:{return_url:returnUrl,notify_url:cashfreeWebhookUrl(origin)},
        order_expiry_time:new Date(row.checkout_expires_at).toISOString(),
        order_note:`Vaidik Dhara event registration`,
        order_tags:{portal_kind:'event_registration',registration_id:id,event_id:String(event.id)},
      },liveMode);
      if (created.order_id!==cfOrderId || created.order_currency!=='INR' ||
          Math.round(Number(created.order_amount)*100)!==Number(row.fee_paise) || !created.payment_session_id)
        throw eventFail(502,'Cashfree returned an order that did not match this registration.');
      paymentSessionId=created.payment_session_id;
      await client.query(`UPDATE event_registrations SET cashfree_order_id=$2,cashfree_payment_session_id=$3,
        payment_provider='cashfree',is_test=$4 WHERE id=$1`,
        [id,cfOrderId,paymentSessionId,!liveMode]);
    }
    const current = (await client.query('SELECT status FROM event_registrations WHERE id=$1',[id])).rows[0];
    if (current.status==='cancelled') {
      throw eventFail(409,'This reservation was cancelled while checkout was being prepared');
    }
    return { orderId:id,paymentSessionId,mode };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function completeCashfreeEventPayment(id: string) {
  const initial=(await pool.query('SELECT * FROM event_registrations WHERE id=$1 AND payment_provider=$2',
    [id,'cashfree'])).rows[0];
  if (!initial?.cashfree_order_id) throw eventFail(409,'Cashfree order is not linked to this registration');
  const liveMode=initial.is_test!==true;
  if (!liveMode && process.env.NODE_ENV==='production')
    throw eventFail(409,'Sandbox payments cannot confirm registrations on the published site.');
  const order=await getCashfreeOrder(initial.cashfree_order_id,liveMode);
  if (order.order_status!=='PAID' || order.order_currency!=='INR' ||
      Math.round(Number(order.order_amount)*100)!==Number(initial.fee_paise))
    throw eventFail(409,'Event payment verification failed');
  const payments=await getCashfreePayments(initial.cashfree_order_id,liveMode);
  const payment=payments.find(p=>p.payment_status==='SUCCESS' && p.order_id===order.order_id);
  if (!payment || !isVerifiedCashfreePayment(order,payment,initial.cashfree_order_id,Number(initial.fee_paise)))
    throw eventFail(409,'Event payment verification failed');

  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const lookup=(await client.query('SELECT event_id FROM event_registrations WHERE id=$1 AND cashfree_order_id=$2',
      [id,order.order_id])).rows[0];
    if (!lookup) throw eventFail(409,'Event payment is not linked to a registration');
    const event=(await client.query('SELECT * FROM religious_events WHERE id=$1 FOR UPDATE',[lookup.event_id])).rows[0];
    const row=(await client.query('SELECT * FROM event_registrations WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if (row.paid_paise>0) { await client.query('COMMIT'); return; }
    if (row.payment_provider!=='cashfree' || row.cashfree_order_id!==order.order_id ||
        row.is_test===liveMode || Number(row.fee_paise)!==Math.round(Number(payment.payment_amount)*100))
      throw eventFail(409,'Event payment verification failed');
    const occupied=(await client.query(`SELECT count(*)::int AS count FROM event_registrations WHERE event_id=$1 AND id<>$2
      AND (status IN ('registered','pending_confirmation') OR (status='pending_payment' AND hold_until>now()))`,
      [row.event_id,id])).rows[0].count;
    const cancelled=row.status==='cancelled' || event.status==='cancelled' || occupied>=event.details.capacity;
    await client.query(`UPDATE event_registrations SET paid_paise=fee_paise,status=$2,hold_until=null,
      cashfree_payment_id=$3,
      cancellation_reason=CASE WHEN $2='cancelled' AND cancellation_reason='' THEN 'Paid after availability ended; refund owed' ELSE cancellation_reason END
      WHERE id=$1`,[id,cancelled?'cancelled':'registered',String(payment.cf_payment_id)]);
    await client.query(`INSERT INTO event_payment_records(registration_id,type,amount_paise,reference,note)
      VALUES($1,'payment',$2,$3,$4) ON CONFLICT DO NOTHING`,
      [id,row.fee_paise,String(payment.cf_payment_id),liveMode?'Server-verified Cashfree payment':'TEST payment — no real money collected']);
    if (cancelled) await createEventRefundRequest(client,{
      ...row,status:'cancelled',paid_paise:row.fee_paise,
      cancellation_reason:row.cancellation_reason || 'Payment completed after event availability ended',
    },row.cancellation_reason || 'Payment completed after event availability ended');
    await client.query(`INSERT INTO notifications("userId",title,message,type,"isRead","createdAt")
      VALUES($1,$2,$3,'event',false,now())`,[row.guardian_id,
      cancelled?'Event payment needs support':'Event registration confirmed',
      `${liveMode?'':'TEST MODE: '}${event.details.name}: ${cancelled
        ?'Payment was verified after availability ended. The recorded refund must be settled by the Vaidik Dhara support team.'
        :'Your registration is confirmed. View your event registrations for the schedule.'}`]);
    await client.query('COMMIT');
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function reconcileCashfreeEventPayment(id: string) {
  const row=(await pool.query('SELECT * FROM event_registrations WHERE id=$1 AND payment_provider=$2',
    [id,'cashfree'])).rows[0];
  if (!row) throw eventFail(404,'Registration not found');
  if (row.cashfree_order_id && row.paid_paise===0) {
    const order=await getCashfreeOrder(row.cashfree_order_id,row.is_test!==true);
    if (order.order_status==='PAID') await completeCashfreeEventPayment(id);
    else if (['EXPIRED','TERMINATED'].includes(order.order_status))
      await pool.query(`UPDATE event_registrations SET status='expired',hold_until=null
        WHERE id=$1 AND status='pending_payment' AND paid_paise=0`,[id]);
  }
  return registrationView(id);
}
export async function reconcileEventPayment(id: string, guardianId: number) {
  const row = (await pool.query('SELECT * FROM event_registrations WHERE id=$1 AND guardian_id=$2', [id,guardianId])).rows[0];
  if (!row) throw eventFail(404,'Registration not found');
  if (row.payment_provider==='cashfree') return reconcileCashfreeEventPayment(id);
  if (row.payment_method==='online' && Number(row.paid_paise)===0)
    throw eventFail(410,'This registration uses a retired payment provider. Contact the Vaidik Dhara support team.');
  return registrationView(id);
}
