export interface ReminderBooking {
  id: number;
  customerId: number;
  status: string;
  pujaName?: string | null;
  date?: string | null;
  time?: string | null;
}

const activeStatuses = new Set(['pending', 'pending_approval', 'confirmed', 'in_progress']);

export function customerPujaReminders(bookings: ReminderBooking[], customerId: number) {
  return bookings
    .filter(booking => booking.customerId === customerId && activeStatuses.has(booking.status))
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.id - b.id);
}

export function reminderSchedule(booking: ReminderBooking): string {
  // The date is a calendar date, not an instant: do not shift it with a timezone conversion.
  const day = booking.date?.slice(0, 10);
  const parsed = day ? new Date(`${day}T12:00:00`) : null;
  const date = parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'a date yet to be confirmed';
  return `${date}${booking.time ? ` at ${booking.time}` : ' (time to be confirmed)'}`;
}