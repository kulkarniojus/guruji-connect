import { Switch, Route, Redirect, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Booking from "@/pages/Booking";
import Register from "@/pages/Register";
import BookingDetail from "@/pages/BookingDetail";
import MyBookings from "@/pages/MyBookings";
import Profile from "@/pages/Profile";
import AdminLogin from "@/pages/AdminLogin";
import PujaDetails from "@/pages/PujaDetails";
import PujasList from "@/pages/PujasList";
import BecomeGuruji from "@/pages/BecomeGuruji";
import Services from "@/pages/Services";
import HowItWorks from "@/pages/HowItWorks";
import SimpleBookingDemo from "@/pages/SimpleBookingDemo";
import SalesRepLogin from "@/pages/SalesRepLogin";
import SalesRepDashboard from "@/pages/SalesRepDashboard";
import { AvailabilityPage } from "@/components/calendar/AvailabilityPage";
import { Suspense, lazy, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { VideoConferenceProvider } from "@/context/VideoConferenceContext";

// Lazy-loaded components
const Chat = lazy(() => import('@/pages/Chat'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const VideoCall = lazy(() => import('@/pages/VideoCall'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const SpiritualJourney = lazy(() => import('@/pages/SpiritualJourney'));

// Protected Route Component
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType, path?: string }) {
  // For demo purposes, we'll just render the component
  // In a production app, we would use useAuth() hook to check authentication
  return <Component />;
}

// Admin Route Component - Simplified to avoid context issues
function AdminRoute({ component: Component, ...rest }: { component: React.ComponentType, path?: string }) {
  // For now, just render the component
  // In production, you would check authentication and admin role here
  return <Component />;
}

// Router setup
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/booking">
        <ProtectedRoute component={Booking} />
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
      <Route path="/admin-dashboard">
        <AdminRoute component={AdminDashboard} />
      </Route>
      <Route path="/availability">
        <ProtectedRoute component={AvailabilityPage} />
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
      <Route path="/become-guruji" component={BecomeGuruji} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/puja/:id" component={PujaDetails} />
      <Route path="/video-call/:id">
        <ProtectedRoute component={VideoCall} />
      </Route>
      <Route path="/demo/booking-notifications" component={SimpleBookingDemo} />
      <Route path="/sales-rep" component={SalesRepLogin} />
      <Route path="/sales-rep/dashboard" component={SalesRepDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <VideoConferenceProvider>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <Router />
        <Toaster />
      </Suspense>
    </VideoConferenceProvider>
  );
}

export default App;
