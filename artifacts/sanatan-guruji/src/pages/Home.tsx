import { Helmet } from 'react-helmet';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Services from '@/components/landing/Services';
import HowItWorks from '@/components/landing/HowItWorks';
import PopularPujas from '@/components/landing/PopularPujas';
import Testimonials from '@/components/landing/Testimonials';
import FAQ from '@/components/landing/FAQ';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';
import Chatbot from '@/components/common/Chatbot';

export default function Home() {
  const [, setLocation] = useLocation();

  // Home page doesn't redirect for demo purposes
  // In a full app, we would check authentication here

  return (
    <div className="min-h-screen bg-spiritual-pattern">
      <Helmet>
        <title>Vaidik Dhara - Book Online and Offline Pujas</title>
        <meta name="description" content="Connect with verified Gurujis for your spiritual needs. Book online or in-person puja services, consultations, and more with expert Gurujis all over India." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>

      <Header />

      <main>
        <Hero />
        <CTA />
        <Services />
        <HowItWorks />
        <PopularPujas />
        <Testimonials />
        <FAQ />
      </main>

      <Footer />
      <Chatbot />
    </div>
  );
}