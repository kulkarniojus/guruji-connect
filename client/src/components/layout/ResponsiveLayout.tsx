import { ReactNode } from 'react';
import { Helmet } from 'react-helmet';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileLayout } from './MobileLayout';
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
  const isMobile = useIsMobile();

  // Mobile layout
  if (isMobile) {
    return (
      <>
        <Helmet>
          <title>{title} | GurujiConnect</title>
          <meta name="description" content={description} />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        </Helmet>
        
        <MobileLayout hideNavigation={hideMobileNavigation}>
          {children}
        </MobileLayout>
      </>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Helmet>
        <title>{title} | GurujiConnect</title>
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