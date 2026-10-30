import { Helmet } from 'react-helmet';
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import BookingPage from '@/components/booking/BookingPage';
import { useToast } from '@/hooks/use-toast';
import LoginModal from '@/components/auth/LoginModal';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Booking() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const { user, isLoading } = useAuth();

  // Redirect gurujis and admins away from the customer booking flow
  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'guruji') {
        toast({
          title: 'Guruji Dashboard',
          description: 'Bookings come to you as requests on your dashboard.',
        });
        setLocation('/dashboard');
      } else if (user.role === 'admin') {
        setLocation('/admin-dashboard');
      } else if (['sales_rep', 'sales'].includes(user.role)) {
        setLocation('/sales-rep/dashboard');
      }
    }
  }, [isLoading, user, setLocation, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (user && ['guruji', 'admin', 'sales_rep', 'sales'].includes(user.role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Helmet>
        <title>Book a Puja | Vaidik Dhara</title>
        <meta name="description" content="Book a puja or consultation with verified Gurujis" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>

      <Header />

      <main className="flex-grow">
        <BookingPage />
      </main>

      <Footer />

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onRegisterClick={() => setLoginModalOpen(false)}
      />
    </div>
  );
}
