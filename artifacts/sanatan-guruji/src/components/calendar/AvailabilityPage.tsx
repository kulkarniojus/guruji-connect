import { useQuery } from '@tanstack/react-query';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import GurujiAvailability from '@/components/dashboard/GurujiAvailability';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function AvailabilityPage() {
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) return null;
      return response.json();
    },
    retry: false,
  });
  const { data: categoryApplications = [], isLoading: applicationsLoading } = useQuery<any[]>({
    queryKey: ['/api/other-categories/my-applications'],
    queryFn: async () => {
      const response = await fetch('/api/other-categories/my-applications', { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: user?.role === 'customer',
  });
  const hasProviderAccess = user?.role === 'guruji' ||
    categoryApplications.some(application => application.status === 'approved' && application.isActive);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="container mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-9">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-orange-800">Provider workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 sm:text-3xl">My Availability</h1>
          <p className="mt-1 text-sm text-neutral-600">Manage your own service calendar and confirmed bookings.</p>
        </div>
        {isLoading || applicationsLoading ? (
          <Card><CardContent className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-orange-600" /></CardContent></Card>
        ) : hasProviderAccess ? (
          <GurujiAvailability />
        ) : (
          <Card><CardContent className="py-12 text-center">
            <p className="font-semibold">Provider access is required</p>
            <p className="mt-1 text-sm text-neutral-500">An approved Guruji or Other-category application is required to manage availability.</p>
          </CardContent></Card>
        )}
      </main>
      <Footer />
    </div>
  );
}