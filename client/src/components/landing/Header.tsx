import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, Bell, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import LoginModal from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';
import { useToast } from '@/hooks/use-toast';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Since we can't use useAuth here, we'll create a simple non-authenticated header
  const user = null;
  const logout = () => {
    toast({
      title: "Login Required",
      description: "Please login to access this feature",
    });
  };

  const handleLoginClick = () => {
    setLoginModalOpen(true);
  };

  const handleRegisterClick = () => {
    setRegisterModalOpen(true);
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <div className="h-6 w-6 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <span className="text-xl font-bold text-neutral-900 font-poppins">GurujiConnect</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="text-neutral-900 hover:text-primary px-3 py-2 text-sm font-medium">Home</Link>
              <Link href="/services" className="text-neutral-900 hover:text-primary px-3 py-2 text-sm font-medium">Services</Link>
              <Link href="/become-guruji" className="text-neutral-900 hover:text-primary px-3 py-2 text-sm font-medium">Become a Guruji</Link>
              <Link href="/availability" className="text-neutral-900 hover:text-primary px-3 py-2 text-sm font-medium">Availability</Link>
              <Link href="/about" className="text-neutral-900 hover:text-primary px-3 py-2 text-sm font-medium">About Us</Link>
              <Link href="/contact" className="text-neutral-900 hover:text-primary px-3 py-2 text-sm font-medium">Contact</Link>
            </nav>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Input 
                  type="text" 
                  placeholder="Search pujas, services..." 
                  className="w-56 pl-10 pr-4 py-2 rounded-lg bg-neutral-100"
                />
                <div className="absolute left-3 top-2.5">
                  <Search className="h-5 w-5 text-neutral-500" />
                </div>
              </div>

              {/* Notification */}
              {user && (
                <Button variant="ghost" size="icon" className="p-1 rounded-full text-neutral-600 hover:text-primary">
                  <Bell className="h-6 w-6" />
                </Button>
              )}

              {/* User dropdown or login/register */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-1 text-sm">
                      <Avatar className="w-8 h-8 bg-primary-100">
                        <AvatarFallback className="font-medium text-primary-800">
                          {user.firstName?.charAt(0) || ''}
                          {user.lastName?.charAt(0) || ''}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => window.location.href = '/dashboard'}>
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => logout()}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" onClick={handleLoginClick}>Login</Button>
                  <Button variant="default" onClick={handleRegisterClick}>Register</Button>
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
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu - slide in from top with animation */}
        <div 
          className={`md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg transform transition-transform duration-200 ease-in-out z-50 ${
            mobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="px-4 py-3 space-y-3 divide-y divide-gray-100">
            <div className="space-y-2">
              <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100">Home</Link>
              <Link href="/services" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100">Services</Link>
              <Link href="/availability" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100">Availability</Link>
              <Link href="/about" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100">About Us</Link>
              <Link href="/contact" className="block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:bg-neutral-100">Contact</Link>
            </div>
            
            <div className="pt-3 space-y-3">
              <div className="relative">
                <Input 
                  type="text" 
                  placeholder="Search pujas, services..." 
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-neutral-100"
                />
                <div className="absolute left-3 top-2.5">
                  <Search className="h-5 w-5 text-neutral-500" />
                </div>
              </div>
              
              {!user && (
                <div className="flex flex-col space-y-2 pt-2">
                  <Button variant="outline" className="w-full" onClick={handleLoginClick}>Login</Button>
                  <Button variant="default" className="w-full" onClick={handleRegisterClick}>Register</Button>
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
