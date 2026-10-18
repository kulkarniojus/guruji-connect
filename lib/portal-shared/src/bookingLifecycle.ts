export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Not yet accepted by a Guruji',
  pending_approval: 'Awaiting Guruji acceptance',
  confirmed: 'Accepted by Guruji',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Declined',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Request closed',
};

export function bookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

export function canAdvanceBooking(current: string, next: string): boolean {
  return (current === 'confirmed' && next === 'in_progress') ||
    (current === 'in_progress' && next === 'completed');
}