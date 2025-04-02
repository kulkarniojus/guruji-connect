import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import CustomerDashboard from '@/components/dashboard/CustomerDashboard';
import GurujiDashboard from '@/components/dashboard/GurujiDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import { MobileDashboard } from '@/components/dashboard/MobileDashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This should redirect, but just in case
    return null;
  }

  // On mobile, render the mobile-optimized version without header/footer
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

  // On desktop, render the regular dashboard with header/footer
  return (
    <div className="min-h-screen bg-neutral-50">
      <Helmet>
        <title>Dashboard | GurujiConnect</title>
        <meta name="description" content="Manage your bookings and profile on GurujiConnect" />
      </Helmet>

      <Header />
      
      <main className="py-8">
        <div className="container mx-auto px-4">
          {user.role === 'customer' && <CustomerDashboard />}
          {user.role === 'guruji' && <GurujiDashboard />}
          {user.role === 'admin' && <AdminDashboard />}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
