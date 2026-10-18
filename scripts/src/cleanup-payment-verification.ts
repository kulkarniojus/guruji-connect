import {pool} from '../../artifacts/api-server/src/db';
import {getUncachableStripeClient} from './stripeClient';
try {
  const ids=(await pool.query(`SELECT id FROM users WHERE "firstName" LIKE 'verify-stripe-%'
    AND email LIKE 'verify-stripe-%@example.invalid'`)).rows.map(r=>r.id);
  const bookings=(await pool.query('SELECT id FROM bookings WHERE "customerId"=ANY($1::int[])',[ids])).rows.map(r=>r.id);
  const orders=(await pool.query('SELECT stripe_session_id FROM portal_checkout_orders WHERE customer_id=ANY($1::int[])',[ids])).rows;
  const stripe=await getUncachableStripeClient();
  if((await stripe.balance.retrieve()).livemode)throw new Error('Sandbox cleanup only');
  for(const order of orders) if(order.stripe_session_id?.startsWith('cs_test_')) {
    try {const session=await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if(session.status==='open')await stripe.checkout.sessions.expire(session.id);
    }catch{/* A synthetic trusted-provider fixture has no Stripe Session. */}
  }
  await pool.query('DELETE FROM portal_checkout_orders WHERE customer_id=ANY($1::int[])',[ids]);
  await pool.query('DELETE FROM payments WHERE "bookingId"=ANY($1::int[])',[bookings]);
  for(const table of ['guruji_finance_receipts','customer_finance_entries'])
    await pool.query(`DELETE FROM ${table} WHERE booking_id=ANY($1::int[])`,[bookings]);
  await pool.query('DELETE FROM booking_requests WHERE "bookingId"=ANY($1::int[])',[bookings]);
  await pool.query('DELETE FROM notifications WHERE "userId"=ANY($1::int[])',[ids]);
  await pool.query('DELETE FROM bookings WHERE id=ANY($1::int[])',[bookings]);
  await pool.query('DELETE FROM guruji_profiles WHERE "userId"=ANY($1::int[])',[ids]);
  const pujas=(await pool.query(`SELECT id FROM pujas WHERE name LIKE 'verify-stripe-%' AND description='Isolated payment verification fixture'`)).rows.map(r=>r.id);
  for await(const product of stripe.products.list({active:true,limit:100}))
    if(pujas.includes(Number(product.metadata.sg_puja_id)))await stripe.products.update(product.id,{active:false});
  await pool.query('DELETE FROM pujas WHERE id=ANY($1::int[])',[pujas]);
  await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[ids]);
  console.log('Only owned payment verification fixtures were cleaned.');
} finally {await pool.end();}
