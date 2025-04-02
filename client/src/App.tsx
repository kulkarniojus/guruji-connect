import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Booking from "@/pages/Booking";
import Profile from "@/pages/Profile";
import AdminLogin from "@/pages/AdminLogin";
import PujaDetails from "@/pages/PujaDetails";
import { AvailabilityPage } from "@/components/calendar/AvailabilityPage";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { VideoConferenceProvider } from "@/context/VideoConferenceContext";

// Lazy-loaded components
const Chat = lazy(() => import('@/pages/Chat'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const VideoCall = lazy(() => import('@/pages/VideoCall'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const SpiritualJourney = lazy(() => import('@/pages/SpiritualJourney'));

// Router setup

// Simple router for now - we'll add protected routes in the future
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/booking" component={Booking} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/availability" component={AvailabilityPage} />
      <Route path="/chat" component={Chat} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/spiritual-journey" component={SpiritualJourney} />
      <Route path="/puja/:id" component={PujaDetails} />
      <Route path="/video-call/:id" component={VideoCall} />
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
