import { useEffect, useMemo, useRef, useState } from 'react';
import { LockKeyhole, MapPin } from 'lucide-react';

type Visibility = {
  visible?: boolean;
  source?: 'scheduled_window' | 'admin_release' | 'hidden';
  availableAt?: string | null;
  until?: string | null;
};

type BookingAddressVisibilityProps = {
  booking: any;
  onRefresh?: () => void;
  showNotes?: boolean;
};

function scheduledStart(booking: any): number | null {
  const visibility: Visibility | undefined = booking.addressVisibility;
  if (visibility?.availableAt) {
    const value = Date.parse(visibility.availableAt);
    if (Number.isFinite(value)) return value + 4 * 60 * 60 * 1000;
  }
  const date = String(booking.date || '');
  const day = date.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (!day) return null;
  const time = String(booking.time || '').match(/^(\d{1,2}):(\d{2})/);
  const hour = time ? Number(time[1]) : 0;
  const minute = time ? Number(time[2]) : 0;
  // Booking times are India local time (UTC+05:30), independent of device timezone.
  const parsed = Date.parse(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function BookingAddressVisibility({ booking, onRefresh, showNotes = false }: BookingAddressVisibilityProps) {
  const visibility: Visibility | undefined = booking.addressVisibility;
  const [now, setNow] = useState(Date.now());
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const start = useMemo(() => scheduledStart(booking), [booking.date, booking.time, booking.addressVisibility?.availableAt]);
  const availableAt = visibility?.availableAt ? Date.parse(visibility.availableAt) : (start === null ? null : start - 4 * 60 * 60 * 1000);
  const until = visibility?.until ? Date.parse(visibility.until) : start;
  const isAdminRelease = visibility?.source === 'admin_release' && visibility.visible === true;
  const inWindow = visibility?.source === 'scheduled_window' &&
    visibility.visible === true &&
    availableAt !== null && Number.isFinite(availableAt) &&
    until !== null && Number.isFinite(until) &&
    now >= availableAt && now < until;
  const addressAvailable = isAdminRelease || inWindow;

  useEffect(() => {
    const nextBoundary = !addressAvailable && availableAt !== null && availableAt > now
      ? availableAt
      : addressAvailable && !isAdminRelease && until !== null
        ? until
        : null;
    if (nextBoundary === null) return;
    const timer = window.setTimeout(() => {
      setNow(Date.now());
      onRefreshRef.current?.();
    }, Math.max(0, nextBoundary - Date.now()) + 25);
    return () => window.clearTimeout(timer);
  }, [addressAvailable, availableAt, until, now, isAdminRelease]);

  // A server response may lag behind the window boundary; never expose cached address then.
  const mayRenderAddress = addressAvailable && !!booking.address;
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-1.5 text-sm">
        {mayRenderAddress ? (
          <>
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span>{booking.address}{booking.pincode ? ` · ${booking.pincode}` : ''}</span>
          </>
        ) : (
          <>
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span className="text-neutral-600">
              Exact address is private until 4 hours before the scheduled puja. It will appear automatically during the access window.
            </span>
          </>
        )}
      </div>
      {showNotes && mayRenderAddress && booking.notes && (
        <div className="pl-5">
          <p className="text-xs text-neutral-500">Booking notes</p>
          <p className="text-sm text-neutral-700">{booking.notes}</p>
        </div>
      )}
    </div>
  );
}