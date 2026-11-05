import { Switch, Route, Redirect, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Booking from "@/pages/Booking";
import PaymentReturn from "@/pages/PaymentReturn";
import Register from "@/pages/Register";
import BookingDetail from "@/pages/BookingDetail";
import MyBookings from "@/pages/MyBookings";
import Profile from "@/pages/Profile";
import AdminLogin from "@/pages/AdminLogin";
import AdminRecovery from "@/pages/AdminRecovery";
import PujaDetails from "@/pages/PujaDetails";
import PujasList from "@/pages/PujasList";
import BecomeGuruji from "@/pages/BecomeGuruji";
import Services from "@/pages/Services";
import ServiceDetail from "@/pages/ServiceDetail";
import EventsList from "@/pages/events/EventsList";
import EventDetail from "@/pages/events/EventDetail";
import MyEventRegistrations from "@/pages/events/MyEventRegistrations";
import HowItWorks from "@/pages/HowItWorks";
import LoginModal from '@/components/auth/LoginModal';
import RegisterModal from '@/components/auth/RegisterModal';
import { useQuery } from '@tanstack/react-query';
import SalesRepLogin from "@/pages/SalesRepLogin";
import SalesRepDashboard from "@/pages/SalesRepDashboard";
import { AvailabilityPage } from "@/components/calendar/AvailabilityPage";
import { Suspense, lazy, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { VideoConferenceProvider } from "@/context/VideoConferenceContext";
import { queryClient } from "@/lib/queryClient";
import CustomerPujaReminders from "@/components/CustomerPujaReminders";
import SiteInformation, { ContactPage, FaqPage } from "@/pages/SiteInformation";

// Lazy-loaded components
const Chat = lazy(() => import('@/pages/Chat'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const VideoCall = lazy(() => import('@/pages/VideoCall'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const SpiritualJourney = lazy(() => import('@/pages/SpiritualJourney'));
const ServiceProviderDashboard = lazy(() => import('@/pages/ServiceProviderDashboard'));

// Protected Route Component
function ProtectedRoute({ component: Component, roles }: { component: React.ComponentType, roles?: string[] }) {
  const [, navigate] = useLocation();
  const [registration, setRegistration] = useState(false);
  const {data: user, isPending} = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {credentials: 'include'});
      if (response.status === 401) return null;
      if (!response.ok) throw new Error('Unable to verify login');
      return response.json();
    },
    retry: false,
  });
  if (isPending) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!user && roles?.[0] === 'admin') return <Redirect to="/admin" />;
  if (!user && roles?.[0] === 'sales_rep') return <Redirect to="/sales-rep" />;
  if (!user) return <div className="min-h-screen flex items-center justify-center">
    <p>Please log in to continue.</p>
    <LoginModal isOpen={!registration} onClose={() => {if (!queryClient.getQueryData(['/api/auth/me'])) navigate('/');}} onRegisterClick={() => setRegistration(true)} onLoginSuccess={() => {}} />
    <RegisterModal isOpen={registration} onClose={() => {if (!queryClient.getQueryData(['/api/auth/me'])) navigate('/');}} onLoginClick={() => setRegistration(false)} onRegistrationSuccess={() => {}} />
  </div>;
  if (roles && !roles.includes(user.role)) return <Redirect to={user.role === 'admin' ? '/admin-dashboard' : user.role === 'sales_rep' ? '/sales-rep/dashboard' : '/dashboard'} />;
  return <Component />;
}

// Admin Route Component - Simplified to avoid context issues
function AdminRoute({ component: Component, ...rest }: { component: React.ComponentType, path?: string }) {
  return <ProtectedRoute component={Component} roles={['admin']} />;
}

// Router setup
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/service-provider-dashboard">
        <ProtectedRoute component={ServiceProviderDashboard} roles={['customer', 'guruji']} />
      </Route>
      <Route path="/booking">
        <Booking />
      </Route>
      <Route path="/payment-return">
        <ProtectedRoute component={PaymentReturn} roles={['customer']} />
      </Route>
      <Route path="/register" component={Register} />
      <Route path="/booking/:id">
        <ProtectedRoute component={BookingDetail} />
      </Route>
      <Route path="/my-bookings">
        <ProtectedRoute component={MyBookings} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin-recover" component={AdminRecovery} />
      <Route path="/admin-dashboard">
        <AdminRoute component={AdminDashboard} />
      </Route>
      <Route path="/availability">
        <ProtectedRoute component={AvailabilityPage} roles={['customer', 'guruji']} />
      </Route>
      <Route path="/chat">
        <ProtectedRoute component={Chat} />
      </Route>
      <Route path="/notifications">
        <ProtectedRoute component={Notifications} />
      </Route>
      <Route path="/spiritual-journey">
        <ProtectedRoute component={SpiritualJourney} />
      </Route>
      <Route path="/pujas" component={PujasList} />
      <Route path="/services" component={Services} />
      <Route path="/services/events" component={EventsList} />
      <Route path="/services/events/:eventId" component={EventDetail} />
      <Route path="/events/registrations">
        <ProtectedRoute component={MyEventRegistrations} roles={['customer']} />
      </Route>
      <Route path="/services/:slug" component={ServiceDetail} />
      <Route path="/become-guruji"><ProtectedRoute component={BecomeGuruji} roles={['customer', 'guruji']} /></Route>
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/about"><SiteInformation kind="about" /></Route>
      <Route path="/contact" component={ContactPage} />
      <Route path="/faq" component={FaqPage} />
      <Route path="/privacy-policy"><SiteInformation kind="privacy" /></Route>
      <Route path="/terms"><SiteInformation kind="terms" /></Route>
      <Route path="/cancellation-policy"><SiteInformation kind="cancellation" /></Route>
      <Route path="/puja/:id" component={PujaDetails} />
      <Route path="/video-call/:id">
        <ProtectedRoute component={VideoCall} />
      </Route>
      <Route path="/sales-rep" component={SalesRepLogin} />
      <Route path="/sales-rep/dashboard">
        <ProtectedRoute component={SalesRepDashboard} roles={['sales_rep']} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <VideoConferenceProvider>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <CustomerPujaReminders />
        <Router />
        <Toaster />
      </Suspense>
    </VideoConferenceProvider>
  );
}

export default App;
