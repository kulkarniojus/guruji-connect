import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import CustomerDashboard from '@/components/dashboard/CustomerDashboard';
import GurujiDashboard from '@/components/dashboard/GurujiDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If not loading and no user is logged in, redirect to home
    if (!isLoading && !user) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

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

  return (
    <div className="min-h-screen bg-neutral-50">
      <Helmet>
        <title>Dashboard | PujaConnect</title>
        <meta name="description" content="Manage your bookings and profile on PujaConnect" />
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
