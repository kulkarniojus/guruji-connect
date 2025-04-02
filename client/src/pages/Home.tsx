import { Helmet } from 'react-helmet';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import MobileHero from '@/components/landing/MobileHero';
import Services from '@/components/landing/Services';
import HowItWorks from '@/components/landing/HowItWorks';
import PopularPujas from '@/components/landing/PopularPujas';
import Testimonials from '@/components/landing/Testimonials';
import FAQ from '@/components/landing/FAQ';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';
import Chatbot from '@/components/common/Chatbot';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const isMobile = useIsMobile();
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      setLocation('/dashboard');
    }
  }, [user, isLoading, setLocation]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Helmet>
        <title>GurujiConnect - Book Online and Offline Pujas</title>
        <meta name="description" content="Connect with verified Gurujis for your spiritual needs. Book online or in-person puja services, consultations, and more with expert Gurujis all over India." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Helmet>

      <Header />
      
      <main>
        {isMobile ? <MobileHero /> : <Hero />}
        <Services />
        <HowItWorks />
        <PopularPujas />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      
      <Footer />
      <Chatbot />
    </div>
  );
}
