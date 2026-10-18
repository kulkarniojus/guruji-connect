/** Monetary arithmetic is performed in paise; reports never assume a payment. */
export function moneyCents(value: unknown) {
  if (value === null || value === undefined || value === '') throw new Error('Missing recorded monetary amount');
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error('Invalid recorded monetary amount');
  return Math.round(amount * 100);
}

export function customerBookingBalance(booking: any, receipts: any[], entries: any[]) {
  const paid = receipts.filter(r => !r.voided_at).reduce((sum, r) => sum + moneyCents(r.amount), 0);
  const refunded = entries.filter(e => e.type === 'refund').reduce((sum, e) => sum + moneyCents(e.amount), 0);
  const adjustments = entries.reduce((sum, e) => sum + (e.type === 'additional_charge' ? moneyCents(e.amount)
    : e.type === 'credit' ? -moneyCents(e.amount) : 0), 0);
  const closed = ['cancelled', 'rejected'].includes(booking.status);
  // Only customer penalties are retained from customer receipts, capped at money actually recorded.
  const retained = closed && booking.cancelled_by === 'customer'
    ? Math.min(paid, Math.max(0, moneyCents(booking.cancellation_charge || 0))) : 0;
  const obligation = Math.max(0, (closed ? retained : moneyCents(booking.totalAmount ?? booking.amount)) + adjustments);
  return {
    recordedPaid: paid / 100, refunded: refunded / 100, adjustments: adjustments / 100,
    retainedCharge: retained / 100,
    refundOwed: Math.max(0, paid - refunded - obligation) / 100,
    additionalPaymentDue: Math.max(0, obligation - paid + refunded) / 100,
  };
}
