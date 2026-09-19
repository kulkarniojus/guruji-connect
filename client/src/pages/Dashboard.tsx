import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import CustomerDashboard from '@/components/dashboard/CustomerDashboard';
import GurujiDashboard from '@/components/dashboard/GurujiDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [, setLocation] = useLocation();

  // Use real authenticated user
  const { data: user, isLoading, isPending } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!isLoading && !isPending && !user) {
      setLocation('/');
    } else if (!isLoading && !isPending && user && (user.role === 'sales_rep' || user.role === 'sales')) {
      setLocation('/sales-rep/dashboard');
    }
  }, [isLoading, isPending, user, setLocation]);

  if (isLoading || isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Helmet>
        <title>Dashboard | GurujiConnect</title>
        <meta name="description" content="Manage your bookings and profile on GurujiConnect" />
      </Helmet>

      <Header />

      <main className="py-5 sm:py-8">
        <div className="container mx-auto px-4">
          {user.role === 'guruji' && <GurujiDashboard />}
          {user.role === 'admin' && <AdminDashboard />}
          {(user.role === 'customer' || !user.role) && <CustomerDashboard />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
