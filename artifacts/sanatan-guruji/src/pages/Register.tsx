import { useState } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/landing/Header';
import RegisterModal from '@/components/auth/RegisterModal';
import LoginModal from '@/components/auth/LoginModal';
import { currentBookingReturnPath, postAuthPath } from '@/lib/authRedirect';

export default function Register() {
  const [, setLocation] = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const returnTo = currentBookingReturnPath();

  return (
    <>
      <Header />
      <RegisterModal
        standalone
        isOpen
        onClose={() => setLocation(returnTo || '/dashboard')}
        onLoginClick={() => setShowLogin(true)}
        onRegistrationSuccess={(user) => setLocation(postAuthPath(user.role, returnTo))}
      />
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onRegisterClick={() => setShowLogin(false)}
        onLoginSuccess={(user) => setLocation(postAuthPath(user.role, returnTo))}
      />
    </>
  );
}