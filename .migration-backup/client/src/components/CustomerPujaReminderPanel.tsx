import { CalendarDays, Clock3, ChevronRight, CircleCheck, Hourglass } from 'lucide-react';
import { Link } from 'wouter';
import { bookingStatusLabel } from '@shared/bookingLifecycle';
import { reminderSchedule, type ReminderBooking } from '@shared/customerPujaReminder';

interface CustomerPujaReminderPanelProps {
  bookings: ReminderBooking[];
}

function formatDate(date?: string | null): string {
  const day = date?.slice(0, 10);
  const parsed = day ? new Date(`${day}T12:00:00`) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date to be confirmed';
}

function statusTone(status: string): string {
  if (status === 'confirmed') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'in_progress') return 'border-sky-200 bg-sky-50 text-sky-800';
  return 'border-amber-200 bg-amber-50 text-amber-900';
}

function statusIcon(status: string) {
  return status === 'confirmed' ? (
    <CircleCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
  ) : (
    <Hourglass aria-hidden="true" className="h-4 w-4 shrink-0" />
  );
}

export function CustomerPujaReminderPanel({ bookings }: CustomerPujaReminderPanelProps) {
  if (bookings.length === 0) return null;

  return (
    <section
      aria-label="Active puja booking reminders"
      aria-live="polite"
      aria-atomic="false"
      className="overflow-hidden rounded-xl border border-amber-200/90 bg-amber-50 shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-amber-200/80 px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-amber-950">Puja booking reminders</h2>
          <p className="mt-0.5 text-xs text-amber-900/75">
            {bookings.length} active {bookings.length === 1 ? 'booking' : 'bookings'} · acceptance status shown below
          </p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-100/70 px-2.5 py-1 text-[11px] font-medium text-amber-900">
          Until your puja is completed
        </span>
      </header>

      <ul className="max-h-40 overflow-y-auto divide-y divide-amber-200/70">
        {bookings.map((booking) => {
          const isAccepted = booking.status === 'confirmed';
          const status = bookingStatusLabel(booking.status);
          const name = booking.pujaName?.trim() || `Puja booking #${booking.id}`;

          return (
            <li key={booking.id} className="px-4 py-3.5 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-900">{name}</h3>
                    <span
                      className={`inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none ${statusTone(booking.status)}`}
                    >
                      {statusIcon(booking.status)}
                      {status}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-700">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-amber-800" />
                      <span className="sr-only">Date: </span>{formatDate(booking.date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-amber-800" />
                      <span className="sr-only">Time: </span>{booking.time || 'Time to be confirmed'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600">
                    {booking.status === 'in_progress'
                      ? 'Your puja is in progress. This reminder stays until it is marked completed.'
                      : isAccepted
                      ? 'Your Guruji has accepted this booking.'
                      : 'This is a request; it is not confirmed until your Guruji accepts.'}
                  </p>
                </div>

                <Link
                  href={`/booking/${booking.id}`}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-amber-300 bg-white/80 px-3 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 sm:self-center"
                  aria-label={`View details for ${name}`}
                >
                  Booking details
                  <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              </div>
              <span className="sr-only">{reminderSchedule(booking)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default CustomerPujaReminderPanel;