import { pool } from './db';
import { customerBookingBalance } from './customerBalance';

export async function initializeCustomerFinance() {
  // Additive records only; existing receipts, allocations and booked prices stay unchanged.
  await pool.query(`CREATE TABLE IF NOT EXISTS customer_finance_entries (
    id serial PRIMARY KEY, booking_id integer NOT NULL REFERENCES bookings(id),
    type text NOT NULL CHECK (type IN ('refund','additional_charge','credit')),
    amount numeric(14,2) NOT NULL CHECK(amount>0),
    reference text NOT NULL DEFAULT '', reason text NOT NULL,
    paid_by text NOT NULL CHECK(paid_by IN ('portal','guruji')),
    created_by integer NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS customer_finance_booking ON customer_finance_entries(booking_id);
  CREATE UNIQUE INDEX IF NOT EXISTS customer_finance_reference ON customer_finance_entries(booking_id,type,reference)
    WHERE reference<>'';`);
}

export async function bookingCustomerFunds(client: { query: any }, booking: any) {
  const receipts = (await client.query('SELECT * FROM guruji_finance_receipts WHERE booking_id=$1', [booking.id])).rows;
  const entries = (await client.query('SELECT * FROM customer_finance_entries WHERE booking_id=$1', [booking.id])).rows;
  return customerBookingBalance(booking, receipts, entries);
}

export async function customerActivity(customerId: number) {
  const db = await pool.connect();
  try {
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const customer = (await db.query('SELECT id,"firstName","lastName" FROM users WHERE id=$1 AND role=$2',
    [customerId, 'customer'])).rows[0];
  if (!customer) throw Object.assign(new Error('Customer not found'), { status: 404 });
  const bookings = (await db.query(`SELECT b.*,b.date::text AS calendar_date,p.name AS puja_name
    FROM bookings b LEFT JOIN pujas p ON p.id=b."pujaId" WHERE b."customerId"=$1
    ORDER BY b."createdAt" DESC,b.id DESC`, [customerId])).rows;
  const receipts = (await db.query(`SELECT r.* FROM guruji_finance_receipts r
    JOIN bookings b ON b.id=r.booking_id WHERE b."customerId"=$1`, [customerId])).rows;
  const entries = (await db.query(`SELECT e.* FROM customer_finance_entries e
    JOIN bookings b ON b.id=e.booking_id WHERE b."customerId"=$1 ORDER BY e.created_at DESC`, [customerId])).rows;
  const cancellationEvents = (await db.query(`SELECT e.id,e.booking_id AS "bookingId",e.reason,e.kind,e.status,
    e.charge,e.created_at AS "createdAt" FROM booking_cancellation_events e
    JOIN bookings b ON b.id=e.booking_id WHERE b."customerId"=$1 ORDER BY e.created_at DESC`, [customerId])).rows;
  const rows = bookings.map(b => {
    const closingEvent = cancellationEvents.find(e => e.bookingId === b.id &&
      ['recorded','approved'].includes(e.status) && ['customer_cancel','customer_request','admin_cancel'].includes(e.kind));
    return {
    id: b.id, pujaName: b.puja_name || 'Puja', status: b.status, bookedAt: b.createdAt,
    date: b.calendar_date, time: b.time, cancellationReason: b.cancellation_reason,
    cancelledBy: b.status === 'cancelled'
      ? closingEvent ? closingEvent.kind === 'admin_cancel' ? 'admin' : 'customer' : 'Not recorded (legacy)' : null,
    policyCharge: Number(b.cancellation_charge || 0),
    ...customerBookingBalance(b, receipts.filter(r => r.booking_id === b.id), entries.filter(e => e.booking_id === b.id)),
  }; });
  const sum = (key: 'recordedPaid' | 'refundOwed' | 'refunded' | 'additionalPaymentDue') =>
    Math.round(rows.reduce((total, b) => total + b[key], 0) * 100) / 100;
  const result = {
    customer,
    summary: { bookingCount: rows.length, cancelledCount: rows.filter(b => b.status === 'cancelled').length,
      completedCount: rows.filter(b => b.status === 'completed').length,
      recordedPaid: sum('recordedPaid'), refundOwed: sum('refundOwed'), refunded: sum('refunded'),
      additionalPaymentDue: sum('additionalPaymentDue') },
    bookings: rows, cancellationEvents,
    entries: [
      ...entries.map(e => ({ id: e.id, bookingId: e.booking_id, type: e.type, amount: Number(e.amount),
        reference: e.reference, reason: e.reason, paidBy: e.paid_by, createdAt: e.created_at })),
      ...receipts.filter(r => !r.voided_at).map(r => ({ id: `receipt-${r.id}`, bookingId: r.booking_id, type: 'payment',
        amount: Number(r.amount), reference: r.reference, reason: r.notes, paidBy: r.received_by, createdAt: r.created_at })),
    ].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
  await db.query('COMMIT');
  return result;
  } catch(error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
