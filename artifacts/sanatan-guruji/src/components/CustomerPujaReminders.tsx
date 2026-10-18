import { useQuery } from '@tanstack/react-query';
import { customerPujaReminders, type ReminderBooking } from '@shared/customerPujaReminder';
import CustomerPujaReminderPanel from './CustomerPujaReminderPanel';

export default function CustomerPujaReminders() {
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

  if (!isCustomer || !user) return null;
  const reminders = customerPujaReminders(bookings, user.id);
  if (!reminders.length && !isError) return null;

  return (
    <div
      data-testid="customer-puja-reminder"
      className="fixed bottom-24 left-3 right-3 z-40 rounded-xl bg-white shadow-xl sm:bottom-6 sm:left-6 sm:right-auto sm:w-[400px]"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div>
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