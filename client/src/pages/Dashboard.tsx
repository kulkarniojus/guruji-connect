import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import CustomerDashboard from '@/components/dashboard/CustomerDashboard';
import GurujiDashboard from '@/components/dashboard/GurujiDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import { MobileDashboard } from '@/components/dashboard/MobileDashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

  // Use real authenticated user
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) {
    setLocation('/');
    return null;
  }

  // On mobile, render the mobile-optimized version
  if (isMobile) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Helmet>
          <title>Dashboard | GurujiConnect</title>
          <meta name="description" content="Manage your bookings and profile on GurujiConnect" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        </Helmet>
        <MobileDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Helmet>
        <title>Dashboard | GurujiConnect</title>
        <meta name="description" content="Manage your bookings and profile on GurujiConnect" />
      </Helmet>

      <Header />

      <main className="py-8">
        <div className="container mx-auto px-4">
          {user.role === 'guruji' && <GurujiDashboard />}
          {user.role === 'admin' && <AdminDashboard />}
          {(user.role === 'customer' || !user.role) && <CustomerDashboard />}
          {(user.role === 'sales_rep' || user.role === 'sales') && <CustomerDashboard />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
