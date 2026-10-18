export function isUnassignedBooking(booking: {
  gurujiId?: number | null;
  status?: string | null;
}): boolean {
  return !booking.gurujiId && ['pending', 'pending_approval'].includes(booking.status || '');
}