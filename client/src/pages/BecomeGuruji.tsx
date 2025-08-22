import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import GurujiRegistrationForm from '@/components/GurujiRegistrationForm';

export default function BecomeGuruji() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Helmet>
        <title>Become a Guruji | GurujiConnect</title>
        <meta name="description" content="Join GurujiConnect as a verified spiritual guide and help people with their spiritual journey" />
      </Helmet>

      <Header />
      
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">
              Join Our Community of Spiritual Guides
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Share your spiritual knowledge and help others on their journey. 
              Become a verified Guruji on GurujiConnect and reach thousands of seekers.
            </p>
          </div>
          
          <GurujiRegistrationForm />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}