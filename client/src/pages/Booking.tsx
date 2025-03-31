import { Helmet } from 'react-helmet';
import { useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import BookingPage from '@/components/booking/BookingPage';
import { MobileBookingPage } from '@/components/booking/MobileBookingPage';
import { useToast } from '@/hooks/use-toast';
import LoginModal from '@/components/auth/LoginModal';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';

export default function Booking() {
  // Temporarily disabled auth check to fix the error
  const user = null;
  const isLoading = false;
  const isMobile = useIsMobile();
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  
  // Get URL query parameters
  const searchParams = new URLSearchParams(useSearch());
  const pujaId = searchParams.get('puja');
  
  // Fetch the puja details if ID is provided
  const { data: pujaDetails, isLoading: isPujaLoading } = useQuery({
    queryKey: ['/api/pujas', Number(pujaId)],
    enabled: !!pujaId,
  });
  
  const pujaName = pujaDetails?.name || '';

  // If not logged in, show login modal (temporarily disabled)
  useEffect(() => {
    // Disabled for now to prevent auth errors
    /*
    if (!isLoading && !user) {
      toast({
        title: "Login Required",
        description: "Please login to book a puja",
      });
      setLoginModalOpen(true);
    }
    */
  }, [isLoading, user, toast]);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Helmet>
        <title>{pujaName ? `Book ${pujaName}` : 'Book a Puja'} | GurujiConnect</title>
        <meta name="description" content="Book a puja or consultation with verified Gurujis" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Helmet>

      {!isMobile && <Header />}
      
      <main className="flex-grow">
        {isMobile ? (
          <MobileBookingPage 
            initialPujaId={pujaId} 
            initialPujaName={pujaName} 
          />
        ) : (
          <BookingPage 
            initialPujaId={pujaId} 
            initialPujaName={pujaName} 
          />
        )}
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
