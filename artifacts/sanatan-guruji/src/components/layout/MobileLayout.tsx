import { ReactNode } from 'react';
import { Link, useRoute } from 'wouter';
import { Home, Calendar, User, PhoneCall } from 'lucide-react';

interface MobileLayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

export function MobileLayout({ children, hideNavigation = false }: MobileLayoutProps) {
  const [isHomePage] = useRoute('/');
  const [isBookingPage] = useRoute('/booking');
  const [isDashboardPage] = useRoute('/dashboard');
  const [isChatPage] = useRoute('/chat');

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <main className="flex-grow pb-16">
        {children}
      </main>

      {!hideNavigation && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-40 py-1">
          <div className="flex justify-around">
            <Link href="/">
              <a className="flex flex-col items-center pt-2 pb-1 px-3">
                <Home className={`h-5 w-5 ${isHomePage ? 'text-primary' : 'text-neutral-600'}`} />
                <span className={`text-xs mt-1 ${isHomePage ? 'text-primary' : 'text-neutral-600'}`}>Home</span>
              </a>
            </Link>
            <Link href="/booking">
              <a className="flex flex-col items-center pt-2 pb-1 px-3">
                <Calendar className={`h-5 w-5 ${isBookingPage ? 'text-primary' : 'text-neutral-600'}`} />
                <span className={`text-xs mt-1 ${isBookingPage ? 'text-primary' : 'text-neutral-600'}`}>Book</span>
              </a>
            </Link>
            <Link href="/dashboard">
              <a className="flex flex-col items-center pt-2 pb-1 px-3">
                <User className={`h-5 w-5 ${isDashboardPage ? 'text-primary' : 'text-neutral-600'}`} />
                <span className={`text-xs mt-1 ${isDashboardPage ? 'text-primary' : 'text-neutral-600'}`}>Account</span>
              </a>
            </Link>
            <Link href="/chat">
              <a className="flex flex-col items-center pt-2 pb-1 px-3">
                <PhoneCall className={`h-5 w-5 ${isChatPage ? 'text-primary' : 'text-neutral-600'}`} />
                <span className={`text-xs mt-1 ${isChatPage ? 'text-primary' : 'text-neutral-600'}`}>Consult</span>
              </a>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}