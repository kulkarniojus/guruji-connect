import { ReactNode } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

interface ResponsiveLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  hideMobileNavigation?: boolean;
}

export function ResponsiveLayout({ 
  children, 
  title, 
  description, 
  hideMobileNavigation = false 
}: ResponsiveLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Helmet>
        <title>{title} | Vaidik Dhara</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>

      <Header />
      
      <main className="flex-grow">
        {children}
      </main>
      
      <Footer />
    </div>
  );
}