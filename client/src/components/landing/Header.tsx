import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, Bell, X, LogOut, LayoutDashboard, User as UserIcon, BookOpen, CalendarDays, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import LoginModal from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface CurrentUser {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

function NotificationBell({ userId }: { userId: number }) {
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000,
  });
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  return (
    <Link href="/notifications">
      <Button variant="ghost" size="icon" className="relative p-1 rounded-full text-neutral-600 hover:text-primary">
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  );
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<CurrentUser | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 30000,
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      queryClient.setQueryData(['/api/auth/me'], null);
      toast({ title: 'Logged out successfully' });
      setLocation('/');
    } catch {
      toast({ title: 'Logout failed', variant: 'destructive' });
    }
  };

  const getDashboardPath = () => {
    if (!user) return '/dashboard';
    if (user.role === 'admin') return '/admin-dashboard';
    if (user.role === 'sales_rep' || user.role === 'sales') return '/sales-rep/dashboard';
    return '/dashboard';
  };

  const getInitials = () => {
    if (!user) return '?';
    const first = (user.firstName || '').charAt(0).toUpperCase();
    const last = (user.lastName || '').charAt(0).toUpperCase();
    return (first + last) || '?';
  };

  const isGuruji = user?.role === 'guruji';
  const isAdmin = user?.role === 'admin';
  const isSales = user?.role === 'sales_rep' || user?.role === 'sales';

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href={isSales ? '/sales-rep/dashboard' : isGuruji ? '/dashboard' : '/'} className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-neutral-900 font-poppins">GurujiConnect</span>
            </Link>

            {/* Navigation — role-aware */}
            <nav className="hidden md:flex space-x-1">
              {isSales ? (
                /* Sales rep nav */
                <>
                  <Link href="/sales-rep/dashboard" className="flex items-center gap-1.5 text-neutral-700 hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    <LayoutDashboard className="h-4 w-4" /> Overview
                  </Link>
                  <Link href="/sales-rep/dashboard?tab=register-customer" className="flex items-center gap-1.5 text-neutral-700 hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Register Customer
                  </Link>
                  <Link href="/sales-rep/dashboard?tab=register-guruji" className="flex items-center gap-1.5 text-neutral-700 hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Register Guruji
                  </Link>
                  <Link href="/sales-rep/dashboard?tab=registrations" className="flex items-center gap-1.5 text-neutral-700 hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    My Registrations
                  </Link>
                </>
              ) : isGuruji ? (
                /* Guruji-specific nav */
                <>
                  <Link href="/dashboard" className="flex items-center gap-1.5 text-neutral-700 hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                  <Link href="/dashboard?tab=calendar" className="flex items-center gap-1.5 text-neutral-700 hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    <CalendarDays className="h-4 w-4" /> My Calendar
                  </Link>
                  <Link href="/profile" className="flex items-center gap-1.5 text-neutral-700 hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    <UserIcon className="h-4 w-4" /> Profile
                  </Link>
                  <Link href="/about" className="text-neutral-700 hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    About Us
                  </Link>
                  <Link href="/contact" className="text-neutral-700 hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Contact
                  </Link>
                </>
              ) : isAdmin ? (
                /* Admin nav */
                <>
                  <Link href="/admin-dashboard" className="flex items-center gap-1.5 text-neutral-700 hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                  </Link>
                </>
              ) : (
                /* Customer / public nav */
                <>
                  <Link href="/" className="text-neutral-900 hover:text-primary px-3 py-2 text-sm font-medium">Home</Link>
                  <Link href="/services" className="text-neutral-900 hover:text-primary px-3 py-2 text-sm font-medium">Services</Link>
                  {!user && (
                    <Link href="/become-guruji" className="text-neutral-900 hover:text-primary px-3 py-2 text-sm font-medium">Become a Guruji</Link>
                  )}
                  <Link href="/availability" className="text-neutral-900 hover:text-primary px-3 py-2 text-sm font-medium">Availability</Link>
                  <Link href="/about" className="text-neutral-900 hover:text-primary px-3 py-2 text-sm font-medium">About Us</Link>
                  <Link href="/contact" className="text-neutral-900 hover:text-primary px-3 py-2 text-sm font-medium">Contact</Link>
                </>
              )}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center space-x-3">
              {user && <NotificationBell userId={user.id} />}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={`font-semibold text-sm ${isGuruji ? 'bg-violet-100 text-violet-700' : 'bg-orange-100 text-orange-700'}`}>
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline text-sm font-medium text-neutral-900">
                        {user.firstName} {user.lastName}
                      </span>
                      {isGuruji && (
                        <span className="hidden md:inline text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">
                          Guruji
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                      Signed in as<br />
                      <span className="font-medium text-gray-800 truncate block">{user.email}</span>
                      {isGuruji && <span className="text-violet-600 font-medium">Guruji Account</span>}
                    </div>
                    <DropdownMenuItem onClick={() => setLocation(getDashboardPath())} className="cursor-pointer">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    {isGuruji && (
                      <DropdownMenuItem onClick={() => setLocation('/dashboard?tab=calendar')} className="cursor-pointer">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        My Calendar
                      </DropdownMenuItem>
                    )}
                    {(!user.role || user.role === 'customer') && (
                      <DropdownMenuItem onClick={() => setLocation('/my-bookings')} className="cursor-pointer">
                        <BookOpen className="h-4 w-4 mr-2" />
                        My Bookings
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setLocation('/profile')} className="cursor-pointer">
                      <UserIcon className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" onClick={() => setLoginModalOpen(true)}>Login</Button>
                  <Button variant="default" onClick={() => setRegisterModalOpen(true)}>Register</Button>
                </div>
              )}

              {/* Mobile menu button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div 
          className={`md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg transform transition-transform duration-200 ease-in-out z-50 ${
            mobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="px-4 py-3 space-y-3 divide-y divide-gray-100">
            <div className="space-y-1">
              {isSales ? (
                <>
                  <Link href="/sales-rep/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" /> Overview
                  </Link>
                  <Link href="/sales-rep/dashboard?tab=register-customer" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>Register Customer</Link>
                  <Link href="/sales-rep/dashboard?tab=register-guruji" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>Register Guruji</Link>
                  <Link href="/sales-rep/dashboard?tab=registrations" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>My Registrations</Link>
                </>
              ) : isGuruji ? (
                <>
                  <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                  <Link href="/dashboard?tab=calendar" className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>
                    <CalendarDays className="h-4 w-4" /> My Calendar
                  </Link>
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>
                    <UserIcon className="h-4 w-4" /> Profile
                  </Link>
                  <Link href="/about" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>About Us</Link>
                  <Link href="/contact" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
                </>
              ) : isAdmin ? (
                <Link href="/admin-dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>
                  <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100">Home</Link>
                  <Link href="/services" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100">Services</Link>
                  {!user && (
                    <Link href="/become-guruji" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100">Become a Guruji</Link>
                  )}
                  <Link href="/availability" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100">Availability</Link>
                  <Link href="/about" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100">About Us</Link>
                  <Link href="/contact" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100">Contact</Link>
                </>
              )}
            </div>
            <div className="pt-3 space-y-3">
              {user ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 px-3">
                    Hello, {user.firstName} {user.lastName}
                    {isGuruji && <span className="ml-2 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">Guruji</span>}
                    {isSales && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Sales Rep</span>}
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => { setLocation(getDashboardPath()); setMobileMenuOpen(false); }}>Dashboard</Button>
                  <Button variant="outline" className="w-full text-red-600" onClick={handleLogout}>Logout</Button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2 pt-2">
                  <Button variant="outline" className="w-full" onClick={() => setLoginModalOpen(true)}>Login</Button>
                  <Button variant="default" className="w-full" onClick={() => setRegisterModalOpen(true)}>Register</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth modals */}
      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
        onRegisterClick={() => {
          setLoginModalOpen(false);
          setRegisterModalOpen(true);
        }}
      />

      <RegisterModal 
        isOpen={registerModalOpen} 
        onClose={() => setRegisterModalOpen(false)} 
        onLoginClick={() => {
          setRegisterModalOpen(false);
          setLoginModalOpen(true);
        }}
      />
    </>
  );
}
