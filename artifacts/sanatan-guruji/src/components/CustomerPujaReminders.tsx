import { useQuery } from '@tanstack/react-query';
import { customerPujaReminders, type ReminderBooking } from '@shared/customerPujaReminder';
import CustomerPujaReminderPanel from './CustomerPujaReminderPanel';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GripHorizontal, Minus, BellRing } from 'lucide-react';

export default function CustomerPujaReminders() {
  const [minimized, setMinimized] = useState(false);
  const [side, setSide] = useState<'left' | 'right'>('right');
  const [dragX, setDragX] = useState(0);
  const drag = useRef<{start:number;pointer:number} | null>(null);
  const { data: user } = useQuery<{ id: number; role: string } | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/auth/me', { credentials: 'include', signal });
      if (response.status === 401) return null;
      if (!response.ok) throw new Error('Could not check your account');
      return response.json();
    },
    staleTime: 30000,
  });
  const isCustomer = user?.role === 'customer';
  const { data: bookings = [], isError } = useQuery<ReminderBooking[]>({
    // Account-scoped cache prevents reminders leaking between signed-in accounts.
    queryKey: ['/api/bookings', 'customer-reminders', user?.id],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/bookings', { credentials: 'include', signal });
      if (!response.ok) throw new Error('Could not refresh puja reminders');
      return response.json();
    },
    enabled: isCustomer,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 20000,
  });

  useEffect(() => { setMinimized(false); setDragX(0); setSide('right'); }, [user?.id]);
  if (!isCustomer || !user) return null;
  const reminders = customerPujaReminders(bookings, user.id);
  if (!reminders.length && !isError) return null;

  if (minimized) return <div className={`fixed bottom-24 z-40 sm:bottom-6 sm:left-6 sm:right-auto ${side === 'left' ? 'left-3' : 'right-3'}`}
    style={{marginBottom:'env(safe-area-inset-bottom)'}} data-testid="customer-puja-reminder-minimized">
    <Button onClick={() => setMinimized(false)} aria-label="Restore puja reminders" aria-expanded={false}
      className="min-h-11 rounded-full shadow-lg"><BellRing className="mr-2 h-4 w-4" />Pujas ({reminders.length})</Button>
  </div>;

  return (
    <div
      data-testid="customer-puja-reminder"
      className="fixed bottom-24 left-3 right-3 z-40 rounded-xl bg-white shadow-xl sm:bottom-6 sm:left-6 sm:right-auto sm:w-[400px]"
      style={{ marginBottom: 'env(safe-area-inset-bottom)', transform: dragX ? `translateX(${dragX}px)` : undefined }}
    >
      <div className="flex select-none items-center justify-between border-b px-3 py-1"
        style={{touchAction:'none'}}
        onPointerDown={e => {
          if (window.matchMedia('(min-width: 640px)').matches || (e.target as HTMLElement).closest('button')) return;
          drag.current = {start:e.clientX,pointer:e.pointerId};
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => { if (drag.current?.pointer === e.pointerId) setDragX(e.clientX - drag.current.start); }}
        onPointerUp={e => {
          if (drag.current?.pointer !== e.pointerId) return;
          const movement = e.clientX - drag.current.start;
          if (Math.abs(movement) > 60) { setSide(movement < 0 ? 'left' : 'right'); setMinimized(true); }
          drag.current = null; setDragX(0);
        }}
        onPointerCancel={() => {drag.current=null;setDragX(0);}}>
        <span className="flex items-center gap-2 text-xs text-muted-foreground"><GripHorizontal className="h-4 w-4" />
          <span className="sm:hidden">Drag sideways to tuck away</span><span className="hidden sm:inline">Active pujas</span>
        </span>
        <Button type="button" size="sm" variant="ghost" className="min-h-11 min-w-11" aria-label="Minimize puja reminders" onClick={() => setMinimized(true)}>
          <Minus className="h-4 w-4" /><span className="sr-only">Minimize</span>
        </Button>
      </div>
      <div className="max-h-[48dvh] overflow-y-auto">
        {isError && (
          <p role="status" className="px-4 py-2 text-xs text-amber-900">
            Puja reminders could not be refreshed. Please check My Bookings for the latest status.
          </p>
        )}
        <CustomerPujaReminderPanel bookings={reminders} />
      </div>
    </div>
  );
}