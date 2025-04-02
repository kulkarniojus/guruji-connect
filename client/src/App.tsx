import { Switch, Route, Redirect, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Booking from "@/pages/Booking";
import Profile from "@/pages/Profile";
import AdminLogin from "@/pages/AdminLogin";
import PujaDetails from "@/pages/PujaDetails";
import { AvailabilityPage } from "@/components/calendar/AvailabilityPage";
import { Suspense, lazy, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { VideoConferenceProvider } from "@/context/VideoConferenceContext";
import { useAuth } from "@/context/AuthContext";

// Lazy-loaded components
const Chat = lazy(() => import('@/pages/Chat'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const VideoCall = lazy(() => import('@/pages/VideoCall'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const SpiritualJourney = lazy(() => import('@/pages/SpiritualJourney'));

// Protected Route Component
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType, path?: string }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

// Admin Route Component
function AdminRoute({ component: Component, ...rest }: { component: React.ComponentType, path?: string }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Redirect to="/" />;
  }

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
      <Route path="/puja/:id" component={PujaDetails} />
      <Route path="/video-call/:id">
        <ProtectedRoute component={VideoCall} />
      </Route>
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
