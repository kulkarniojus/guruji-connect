import { Helmet } from 'react-helmet';
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import BookingPage from '@/components/booking/BookingPage';
import { MobileBookingPage } from '@/components/booking/MobileBookingPage';
import { useToast } from '@/hooks/use-toast';
import LoginModal from '@/components/auth/LoginModal';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';

export default function Booking() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

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

  if (user && (user.role === 'guruji' || user.role === 'admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Helmet>
        <title>Book a Puja | GurujiConnect</title>
        <meta name="description" content="Book a puja or consultation with verified Gurujis" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Helmet>

      {!isMobile && <Header />}

      <main className="flex-grow">
        {isMobile ? <MobileBookingPage /> : <BookingPage />}
      </main>

      {!isMobile && <Footer />}

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onRegisterClick={() => setLoginModalOpen(false)}
      />
    </div>
  );
}
