import { Helmet } from 'react-helmet';
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
  return (
    <div className="min-h-screen bg-neutral-50">
      <Helmet>
        <title>GurujiConnect - Book Online and Offline Pujas</title>
        <meta name="description" content="Connect with verified Gurujis for your spiritual needs. Book online or in-person puja services, consultations, and more with expert Gurujis all over India." />
      </Helmet>

      <Header />
      
      <main>
        <Hero />
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
