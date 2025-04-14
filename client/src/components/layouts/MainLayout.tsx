import { ReactNode } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function MainLayout({ 
  children, 
  title = 'GurujiConnect - Your Spiritual Connection',
  description = 'Connect with verified Gurujis for traditional pujas and spiritual guidance'
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <Header />
      
      <main className="flex-grow">
        {children}
      </main>
      
      <Footer />
    </div>
  );
}