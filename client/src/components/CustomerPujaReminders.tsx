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
    <div className="sticky top-0 z-40 border-b border-amber-100 bg-white px-3 py-2 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {isError && (
          <p role="status" className="mb-1 text-xs text-amber-900">
            Puja reminders could not be refreshed. Please check My Bookings for the latest status.
          </p>
        )}
        <CustomerPujaReminderPanel bookings={reminders} />
      </div>
    </div>
  );
}