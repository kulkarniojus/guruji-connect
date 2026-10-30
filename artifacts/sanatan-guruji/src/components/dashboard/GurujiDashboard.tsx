import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import CancellationHistory from '@/components/booking/CancellationHistory';
import { PujaMultiSelect, CityMultiSelect } from '@/components/shared/ProfileEditSelectors';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { hasBookingStarted } from '@/lib/bookingTime';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Loader2, Calendar, Clock, MapPin, Check, X,
  User, IndianRupee, Bell, CheckCircle2,
  XCircle, Package2, AlertCircle, Edit, Save, Ban, AlertTriangle,
  ChevronLeft, ChevronRight, CalendarDays, Star
} from 'lucide-react';
import { useLocation } from 'wouter';
import { CustomerRatingDialog } from '@/components/rating/RatingSystem';
import { bookingStatusLabel, BOOKING_STATUS_LABELS as STATUS_LABEL } from '@shared/bookingLifecycle';
import BookingProgressActions from '@/components/booking/BookingProgressActions';
import BookingAddressVisibility from '@/components/booking/BookingAddressVisibility';
import GurujiCommissionNotice from '@/components/booking/GurujiCommissionNotice';
import GurujiAvailability from '@/components/dashboard/GurujiAvailability';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-violet-100 text-violet-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
    pending_approval: 'bg-orange-100 text-orange-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700';
}

function resolveProfilePujaNames(specialization: unknown, pujaCatalog: any[]) {
  const values = Array.isArray(specialization)
    ? specialization.map(String)
    : String(specialization || '').split(',');
  return values.map(value => value.trim()).filter(Boolean).map(value => {
    const matchingPuja = pujaCatalog.find((puja: any) =>
      String(puja.id) === value || String(puja.name).toLocaleLowerCase() === value.toLocaleLowerCase());
    return matchingPuja?.name || value;
  });
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
}

export default function GurujiDashboard() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [declineReason, setDeclineReason] = useState<Record<number, string>>({});
  const [showDeclineFor, setShowDeclineFor] = useState<number | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [selectedBookingForRating, setSelectedBookingForRating] = useState<any>(null);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [acceptingRequest, setAcceptingRequest] = useState<any>(null);
  const [commissionAcknowledged, setCommissionAcknowledged] = useState(false);

  // calendar state
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // read ?tab= from URL to auto-select tab (also reacts to navigation changes)
  const urlTab = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('tab')
    : null;
  const [activeTab, setActiveTab] = useState(urlTab || 'requests');

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab) setActiveTab(tab);
  }, [location]);
  const [profileForm, setProfileForm] = useState({
    city: '', state: '', address: '', pincode: '',
    experience: '', pricePerHour: '', bio: '',
  });
  const [profilePujas, setProfilePujas] = useState<string[]>([]);
  const [profileServiceCities, setProfileServiceCities] = useState<string[]>([]);

  // Fetch current user
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });
  const { data: pujaCatalog = [] } = useQuery<any[]>({ queryKey: ['/api/pujas'] });

  // Fetch guruji's own profile to get approval status
  const { data: myProfile, refetch: refetchProfile } = useQuery<any>({
    queryKey: ['/api/guruji/my-profile'],
    queryFn: async () => {
      const res = await fetch('/api/guruji/profile', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });

  // Self-edit profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PUT', '/api/guruji/profile', data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update profile');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated and resubmitted for review by the Vaidik Dhara support team.',
      });
      setShowEditProfile(false);
      refetchProfile();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Auto-populate profile form whenever myProfile data arrives
  useEffect(() => {
    if (myProfile) {
      setProfileForm({
        city: user?.city || myProfile.city || '',
        state: myProfile.state || '',
        address: myProfile.address || '',
        pincode: myProfile.pincode || '',
        experience: String(myProfile.experience || ''),
        pricePerHour: String(myProfile.pricePerHour || ''),
        bio: myProfile.bio || '',
      });
      setProfilePujas(resolveProfilePujaNames(myProfile.specialization, pujaCatalog));
      setProfileServiceCities(Array.isArray(myProfile.cities) ? myProfile.cities : []);
    }
  }, [myProfile, user, pujaCatalog]);

  const handleOpenProfileEdit = () => {
    if (!myProfile) return;
    setProfileForm({
      city: user?.city || myProfile.city || '',
      state: myProfile.state || '',
      address: myProfile.address || '',
      pincode: myProfile.pincode || '',
      experience: String(myProfile.experience || ''),
      pricePerHour: String(myProfile.pricePerHour || ''),
      bio: myProfile.bio || '',
    });
    setProfilePujas(resolveProfilePujaNames(myProfile.specialization, pujaCatalog));
    setProfileServiceCities(Array.isArray(myProfile.cities) ? myProfile.cities : []);
    setShowEditProfile(true);
  };

  const handleSaveProfile = () => {
    const data: any = {};
    if (profileForm.city) data.city = profileForm.city;
    if (profileForm.state) data.state = profileForm.state;
    if (profileForm.address) data.address = profileForm.address;
    if (profileForm.pincode) data.pincode = profileForm.pincode;
    if (profileForm.experience) data.experience = Number(profileForm.experience);
    if (profileForm.pricePerHour) data.pricePerHour = Number(profileForm.pricePerHour);
    if (profileForm.bio) data.bio = profileForm.bio;
    data.pujas = profilePujas;
    data.serviceCities = profileServiceCities;
    updateProfileMutation.mutate(data);
  };

  // Fetch pending booking requests sent to this guruji
  const { data: bookingRequests = [], isLoading: reqLoading, refetch: refetchRequests } = useQuery<any[]>({
    queryKey: ['/api/guruji/booking-requests'],
    queryFn: async () => {
      const res = await fetch('/api/guruji/booking-requests', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  // Fetch this guruji's confirmed / completed bookings
  const { data: myBookings = [], isLoading: bookingsLoading, refetch: refetchMyBookings } = useQuery<any[]>({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const res = await fetch('/api/bookings', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  const pendingRequests = bookingRequests.filter((r: any) => r.status === 'pending');
  const upcoming = myBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'in_progress');
  const completed = myBookings.filter((b: any) => b.status === 'completed');
  const completedWithSavedShare = completed.filter((b: any) => b.commissionSnapshot);
  const legacyCompletedCount = completed.length - completedWithSavedShare.length;
  const recordedGurujiShare = completedWithSavedShare.reduce(
    (sum: number, b: any) => sum + Number(b.commissionSnapshot.gurujiAmount || 0),
    0,
  );

  // Accept a booking request
  const acceptMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest('POST', `/api/booking-requests/${requestId}/respond`, {
        response: 'accept',
        commissionAcknowledged: true,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to accept');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Booking accepted!', description: 'The customer has been notified.' });
      setAcceptingRequest(null);
      setCommissionAcknowledged(false);
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const openAcceptConfirmation = (request: any) => {
    acceptMutation.reset();
    setCommissionAcknowledged(false);
    setAcceptingRequest(request);
  };
  const closeAcceptConfirmation = () => {
    if (acceptMutation.isPending) return;
    setAcceptingRequest(null);
    setCommissionAcknowledged(false);
    acceptMutation.reset();
  };

  // Decline a booking request
  const declineMutation = useMutation({
    mutationFn: async ({ requestId, message }: { requestId: number; message: string }) => {
      const res = await apiRequest('POST', `/api/booking-requests/${requestId}/respond`, {
        response: 'decline',
        message,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to decline');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Request declined', description: 'The booking request has been declined.' });
      setShowDeclineFor(null);
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/booking-requests'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleOpenRating = (booking: any) => {
    setSelectedBookingForRating(booking);
    setIsRatingDialogOpen(true);
  };

  const customerRatingMutation = useMutation({
    mutationFn: async ({ bookingId, gurujiId, rating, review }: any) => {
      const res = await apiRequest('POST', '/api/reviews', {
        bookingId,
        gurujiId,
        rating,
        review,
        fromRole: 'guruji',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to submit rating');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Rating Submitted!', description: 'Your rating for the customer has been saved.' });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/booking', selectedBookingForRating?.id, 'guruji-side'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/booking', selectedBookingForRating?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ratings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gurujis'] });
      queryClient.invalidateQueries({ predicate: (query) => typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/gurujis?') });
      queryClient.invalidateQueries({ queryKey: ['/api/guruji'] });
      setIsRatingDialogOpen(false);
      setSelectedBookingForRating(null);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  if (reqLoading || bookingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Welcome, {user?.firstName || 'Guruji'}!</h1>
        <p className="text-neutral-600">Manage your booking requests and upcoming services.</p>
      </div>

      {/* Rejection / pending banner with self-edit option */}
      {myProfile && myProfile.status === 'rejected' && (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-red-800">Your application was rejected</p>
                <p className="text-sm text-red-700 mt-1">
                  Please update your profile details (especially city and years of experience) and resubmit for review.
                </p>
                {!showEditProfile && (
                  <Button className="mt-3" size="sm" onClick={handleOpenProfileEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Update My Profile
                  </Button>
                )}
              </div>
            </div>
            {showEditProfile && (
              <div className="mt-5 space-y-4 border-t border-red-200 pt-4">
                <h4 className="font-semibold text-red-900">Update Profile Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>City *</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Mumbai"
                      value={profileForm.city}
                      onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Maharashtra"
                      value={profileForm.state}
                      onChange={e => setProfileForm(f => ({ ...f, state: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Full Address</Label>
                    <Input
                      className="mt-1"
                      placeholder="Street address"
                      value={profileForm.address}
                      onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <Input
                      className="mt-1"
                      placeholder="6-digit pincode"
                      maxLength={6}
                      value={profileForm.pincode}
                      onChange={e => setProfileForm(f => ({ ...f, pincode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Years of Experience *</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      min="1"
                      max="50"
                      placeholder="e.g. 5"
                      value={profileForm.experience}
                      onChange={e => setProfileForm(f => ({ ...f, experience: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Price Per Hour (₹)</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      min="100"
                      placeholder="e.g. 500"
                      value={profileForm.pricePerHour}
                      onChange={e => setProfileForm(f => ({ ...f, pricePerHour: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Bio / Description</Label>
                    <Textarea
                      className="mt-1 min-h-[80px]"
                      placeholder="Describe your background and expertise..."
                      value={profileForm.bio}
                      onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1 block">Puja Specializations</Label>
                  <PujaMultiSelect selectedPujas={profilePujas} onChange={setProfilePujas} />
                </div>
                <div>
                  <Label className="mb-1 block">Service Cities</Label>
                  <CityMultiSelect selectedCities={profileServiceCities} onChange={setProfileServiceCities} />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending || !profileForm.city.trim() || !profileForm.experience}
                  >
                    {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save & Resubmit
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditProfile(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {myProfile && myProfile.status === 'pending' && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800">Application under review</p>
                <p className="text-sm text-amber-700 mt-1">
                  Your Guruji application is awaiting approval from the Vaidik Dhara support team. You can update your profile details while you wait.
                </p>
                {!showEditProfile && (
                  <Button variant="outline" className="mt-3 border-amber-400 text-amber-800 hover:bg-amber-100" size="sm" onClick={handleOpenProfileEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Profile
                  </Button>
                )}
              </div>
            </div>
            {showEditProfile && (
              <div className="mt-5 space-y-4 border-t border-amber-200 pt-4">
                <h4 className="font-semibold text-amber-900">Update Profile Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>City *</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Mumbai"
                      value={profileForm.city}
                      onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Maharashtra"
                      value={profileForm.state}
                      onChange={e => setProfileForm(f => ({ ...f, state: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Full Address</Label>
                    <Input
                      className="mt-1"
                      placeholder="Street address"
                      value={profileForm.address}
                      onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <Input
                      className="mt-1"
                      placeholder="6-digit pincode"
                      maxLength={6}
                      value={profileForm.pincode}
                      onChange={e => setProfileForm(f => ({ ...f, pincode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Years of Experience *</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      min="1"
                      max="50"
                      placeholder="e.g. 5"
                      value={profileForm.experience}
                      onChange={e => setProfileForm(f => ({ ...f, experience: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Price Per Hour (₹)</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      min="100"
                      placeholder="e.g. 500"
                      value={profileForm.pricePerHour}
                      onChange={e => setProfileForm(f => ({ ...f, pricePerHour: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Bio / Description</Label>
                    <Textarea
                      className="mt-1 min-h-[80px]"
                      placeholder="Describe your background and expertise..."
                      value={profileForm.bio}
                      onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1 block">Puja Specializations</Label>
                  <PujaMultiSelect selectedPujas={profilePujas} onChange={setProfilePujas} />
                </div>
                <div>
                  <Label className="mb-1 block">Service Cities</Label>
                  <CityMultiSelect selectedCities={profileServiceCities} onChange={setProfileServiceCities} />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending || !profileForm.city.trim() || !profileForm.experience}
                  >
                    {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditProfile(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">New Requests</p>
                <p className="text-3xl font-bold text-amber-600">{pendingRequests.length}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-full">
                <Bell className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Upcoming</p>
                <p className="text-3xl font-bold text-blue-600">{upcoming.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Completed</p>
                <p className="text-3xl font-bold text-green-600">{completed.length}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Recorded Guruji shares</p>
                <p className="text-3xl font-bold text-violet-600">₹{recordedGurujiShare.toLocaleString('en-IN')}</p>
                <p className="mt-1 max-w-[190px] text-xs leading-4 text-neutral-500">
                  Saved share allocations, not payouts. {legacyCompletedCount} legacy {legacyCompletedCount === 1 ? 'booking' : 'bookings'} not included.
                </p>
              </div>
              <div className="p-3 bg-violet-50 rounded-full">
                <IndianRupee className="h-5 w-5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="requests" className="flex items-center gap-1.5">
            <Bell className="h-4 w-4" />
            Requests
            {pendingRequests.length > 0 && (
              <span className="ml-0.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="all-requests" className="flex items-center gap-1.5">
            <Package2 className="h-4 w-4" />
            All Requests
          </TabsTrigger>
          <TabsTrigger value="my-profile" className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            My Profile
          </TabsTrigger>
        </TabsList>

        {/* ── PENDING BOOKING REQUESTS ── */}
        <TabsContent value="requests">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <Bell className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-lg font-medium">No pending requests</p>
              <p className="text-sm mt-1">New booking requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req: any) => (
                <Card key={req.id} className="border-amber-200 bg-amber-50/30">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-800 border-0">New Request</Badge>
                          <span className="text-xs text-neutral-500">#{req.id}</span>
                        </div>

                        <h3 className="text-lg font-semibold">
                          {req.puja?.name || req.booking?.type || 'Puja Service'}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm text-neutral-700">
                          {req.customer && (
                            <span className="flex items-center gap-1.5">
                              <User className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                              {req.customer.firstName} {req.customer.lastName}
                            </span>
                          )}
                          {req.booking?.date && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                              {formatDate(req.booking.date)}
                              {req.booking.time ? ` · ${req.booking.time}` : ''}
                            </span>
                          )}
                          {req.booking?.city && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                              {req.booking.city}
                            </span>
                          )}
                          {req.booking && (
                            <div className="col-span-2">
                              <BookingAddressVisibility booking={req.booking} onRefresh={refetchRequests} />
                            </div>
                          )}
                          {req.booking?.amount != null && (
                            <span className="flex items-center gap-1.5 font-medium text-violet-700">
                              <IndianRupee className="h-4 w-4 flex-shrink-0" />
                              ₹{req.booking.amount.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        <GurujiCommissionNotice snapshot={req.booking?.commissionSnapshot} className="mt-4" />
                      </div>

                      {/* Accept / Decline buttons */}
                      {hasBookingStarted(req.booking?.date, req.booking?.time) ? (
                        <p className="max-w-[220px] text-sm text-muted-foreground">
                          The scheduled puja time has passed. Accepting or declining is unavailable.
                        </p>
                      ) : (
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => openAcceptConfirmation(req)}
                          disabled={acceptMutation.isPending || hasBookingStarted(req.booking?.date, req.booking?.time)}
                        >
                          {acceptMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => setShowDeclineFor(showDeclineFor === req.id ? null : req.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                      )}
                    </div>

                    {/* Decline reason box */}
                    {!hasBookingStarted(req.booking?.date, req.booking?.time) && showDeclineFor === req.id && (
                      <div className="mt-4 space-y-2 border-t pt-4">
                        <p className="text-sm font-medium text-neutral-700">Reason for declining (optional):</p>
                        <Textarea
                          placeholder="e.g. Not available on this date..."
                          value={declineReason[req.id] || ''}
                          onChange={(e) =>
                            setDeclineReason(prev => ({ ...prev, [req.id]: e.target.value }))
                          }
                          className="resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              declineMutation.mutate({ requestId: req.id, message: declineReason[req.id] || '' })
                            }
                            disabled={declineMutation.isPending || hasBookingStarted(req.booking?.date, req.booking?.time)}
                          >
                            {declineMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : null}
                            Confirm Decline
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowDeclineFor(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── CALENDAR VIEW ── */}
        <TabsContent value="calendar">
          <GurujiAvailability />
        </TabsContent>

        {/* ── UPCOMING BOOKINGS ── */}
        <TabsContent value="upcoming">
          <CancellationHistory />
          {upcoming.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-lg font-medium">No upcoming bookings</p>
              <p className="text-sm mt-1">Accepted bookings will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} onRefresh={refetchMyBookings} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── COMPLETED BOOKINGS ── */}
        <TabsContent value="completed">
          {completed.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-lg font-medium">No completed bookings yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completed.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} onRate={handleOpenRating} onRefresh={refetchMyBookings} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ALL REQUESTS (history) ── */}
        <TabsContent value="all-requests">
          {bookingRequests.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <Package2 className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-lg font-medium">No request history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookingRequests.map((req: any) => (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-medium">
                          {req.puja?.name || req.booking?.type || 'Puja Service'}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {req.customer
                            ? `${req.customer.firstName} ${req.customer.lastName}`
                            : 'Customer'
                          }
                          {req.booking?.date ? ` · ${formatDate(req.booking.date)}` : ''}
                          {req.booking?.city ? ` · ${req.booking.city}` : ''}
                        </p>
                        <GurujiCommissionNotice snapshot={req.booking?.commissionSnapshot} className="mt-3 max-w-2xl" />
                      </div>
                      <div className="flex items-center gap-3">
                        {req.booking?.amount != null && (
                          <span className="text-sm font-medium">
                            ₹{req.booking.amount.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge(req.status)}`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── MY PROFILE (always visible) ── */}
        <TabsContent value="my-profile">
          <div className="space-y-6">
            {/* Basic Guruji Fields */}
            <Card>
              <CardHeader>
                <CardTitle>Guruji Profile Details</CardTitle>
                <CardDescription>Update your specializations, pricing, and service areas. You can edit at any time.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>City *</Label>
                    <Input
                      className="mt-1"
                      value={profileForm.city}
                      onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="Your city"
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      className="mt-1"
                      value={profileForm.state}
                      onChange={e => setProfileForm(f => ({ ...f, state: e.target.value }))}
                      placeholder="Your state"
                    />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <Input
                      className="mt-1"
                      value={profileForm.pincode}
                      onChange={e => setProfileForm(f => ({ ...f, pincode: e.target.value }))}
                      placeholder="Pincode"
                    />
                  </div>
                  <div>
                    <Label>Years of Experience *</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      min="1"
                      value={profileForm.experience}
                      onChange={e => setProfileForm(f => ({ ...f, experience: e.target.value }))}
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div>
                    <Label>Price Per Hour (₹)</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      min="100"
                      value={profileForm.pricePerHour}
                      onChange={e => setProfileForm(f => ({ ...f, pricePerHour: e.target.value }))}
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Bio / Description</Label>
                    <Textarea
                      className="mt-1 min-h-[80px]"
                      value={profileForm.bio}
                      onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Describe your background and expertise..."
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-1 block">Puja Specializations</Label>
                  <PujaMultiSelect selectedPujas={profilePujas} onChange={setProfilePujas} />
                </div>

                <div>
                  <Label className="mb-1 block">Service Cities</Label>
                  <CityMultiSelect selectedCities={profileServiceCities} onChange={setProfileServiceCities} />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending || !profileForm.city.trim() || !profileForm.experience}
                  >
                    {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!acceptingRequest}
        onOpenChange={(open) => {
          if (!open) closeAcceptConfirmation();
        }}
      >
        <DialogContent aria-describedby="accept-commission-description" className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Review the saved booking split</DialogTitle>
            <DialogDescription id="accept-commission-description">
              Confirm you understand this booking’s recorded customer total and commission/share before accepting.
            </DialogDescription>
          </DialogHeader>
          {acceptingRequest && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">Request #{acceptingRequest.id}</p>
                <p className="font-semibold">
                  {acceptingRequest.puja?.name || acceptingRequest.booking?.type || 'Puja Service'}
                </p>
              </div>
              <GurujiCommissionNotice snapshot={acceptingRequest.booking?.commissionSnapshot} />
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-950">
                Accepting this request does not make a payment or transfer. Any commission payment arrangements are separate.
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <input
                  id="commission-acknowledgement"
                  type="checkbox"
                  checked={commissionAcknowledged}
                  onChange={(event) => setCommissionAcknowledged(event.target.checked)}
                  disabled={acceptMutation.isPending}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-400 accent-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                />
                <Label htmlFor="commission-acknowledgement" className="cursor-pointer text-sm leading-5">
                  I have reviewed and acknowledge the commission and Guruji share information above, including if this booking has no saved record.
                </Label>
              </div>
              {hasBookingStarted(acceptingRequest.booking?.date, acceptingRequest.booking?.time) && (
                <p role="alert" className="text-sm text-red-700">
                  The scheduled puja time has passed. This request can no longer be accepted.
                </p>
              )}
              {acceptMutation.isError && (
                <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {acceptMutation.error instanceof Error ? acceptMutation.error.message : 'The request could not be accepted. Please try again.'}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeAcceptConfirmation} disabled={acceptMutation.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-green-700 text-white hover:bg-green-800"
              onClick={() => acceptingRequest && commissionAcknowledged && acceptMutation.mutate(acceptingRequest.id)}
              disabled={!acceptingRequest || !commissionAcknowledged || acceptMutation.isPending ||
                hasBookingStarted(acceptingRequest?.booking?.date, acceptingRequest?.booking?.time)}
            >
              {acceptMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Confirm acceptance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Rating Dialog */}
      {selectedBookingForRating && (
        <CustomerRatingDialog
          isOpen={isRatingDialogOpen}
          onClose={() => { setIsRatingDialogOpen(false); setSelectedBookingForRating(null); }}
          booking={{
            id: selectedBookingForRating.id,
            customerName: selectedBookingForRating.customerName || selectedBookingForRating.customer?.firstName || 'Customer',
            serviceName: selectedBookingForRating.pujaName || selectedBookingForRating.type || 'Puja Service',
          }}
          onSubmitRating={async (rating, review) => {
            await customerRatingMutation.mutateAsync({
              bookingId: selectedBookingForRating.id,
              gurujiId: selectedBookingForRating.gurujiId,
              rating,
              review,
            });
          }}
        />
      )}
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  confirmed: 'bg-blue-500',
  in_progress: 'bg-violet-500',
  completed: 'bg-green-500',
  pending: 'bg-amber-500',
  pending_approval: 'bg-orange-500',
  cancelled: 'bg-red-400',
};
function BookingCalendar({
  bookings, calMonth, calYear, setCalMonth, setCalYear, selectedDay, setSelectedDay, onRefresh
}: {
  bookings: any[];
  calMonth: number; calYear: number;
  setCalMonth: (m: number) => void; setCalYear: (y: number) => void;
  selectedDay: number | null; setSelectedDay: (d: number | null) => void;
  onRefresh?: () => void;
}) {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // build map: day -> bookings
  const bookingsByDay: Record<number, any[]> = {};
  bookings.forEach(b => {
    if (!b.date) return;
    const d = new Date(b.date);
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
      const day = d.getDate();
      if (!bookingsByDay[day]) bookingsByDay[day] = [];
      bookingsByDay[day].push(b);
    }
  });

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
    setSelectedDay(null);
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();

  const selectedBookings = selectedDay ? (bookingsByDay[selectedDay] || []) : [];

  // Summary counts for this month
  const monthConfirmed = bookings.filter(b => {
    if (!b.date) return false;
    const d = new Date(b.date);
    return d.getFullYear() === calYear && d.getMonth() === calMonth && (b.status === 'confirmed' || b.status === 'in_progress');
  }).length;
  const monthCompleted = bookings.filter(b => {
    if (!b.date) return false;
    const d = new Date(b.date);
    return d.getFullYear() === calYear && d.getMonth() === calMonth && b.status === 'completed';
  }).length;

  return (
    <div className="space-y-4">
      {/* Month header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{monthNames[calMonth]} {calYear}</h2>
              <p className="text-sm text-neutral-500">
                {monthConfirmed > 0 && <span className="mr-3 text-blue-600 font-medium">{monthConfirmed} upcoming</span>}
                {monthCompleted > 0 && <span className="text-green-600 font-medium">{monthCompleted} completed</span>}
                {monthConfirmed === 0 && monthCompleted === 0 && 'No bookings this month'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs"
                onClick={() => { setCalMonth(today.getMonth()); setCalYear(today.getFullYear()); setSelectedDay(null); }}>
                Today
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs">
            {Object.entries(STATUS_DOT).filter(([k]) => k !== 'cancelled').map(([status, dotClass]) => (
              <span key={status} className="flex items-center gap-1.5 text-neutral-600">
                <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                {STATUS_LABEL[status]}
              </span>
            ))}
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-medium text-neutral-500 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayBookings = bookingsByDay[day] || [];
              const isSelected = selectedDay === day;
              const isTodayDay = isToday(day);
              const isPast = new Date(calYear, calMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`
                    relative rounded-lg p-1.5 min-h-[52px] text-left flex flex-col transition-all
                    ${isSelected ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-neutral-50'}
                    ${isTodayDay ? 'border-2 border-primary' : 'border border-transparent'}
                    ${isPast && !dayBookings.length ? 'opacity-40' : ''}
                  `}
                >
                  <span className={`text-xs font-semibold mb-1 ${isTodayDay ? 'text-primary' : isPast ? 'text-neutral-400' : 'text-neutral-800'}`}>
                    {day}
                  </span>
                  <div className="flex flex-wrap gap-0.5">
                    {dayBookings.slice(0, 3).map((b, bi) => (
                      <span
                        key={bi}
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[b.status] || 'bg-neutral-400'}`}
                        title={b.pujaName || b.status}
                      />
                    ))}
                    {dayBookings.length > 3 && (
                      <span className="text-[9px] text-neutral-500 leading-none">+{dayBookings.length - 3}</span>
                    )}
                  </div>
                  {dayBookings.length > 0 && (
                    <span className="text-[9px] text-neutral-500 mt-auto leading-tight truncate w-full">
                      {dayBookings[0].pujaName || 'Booking'}
                      {dayBookings.length > 1 ? ` +${dayBookings.length - 1}` : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      {selectedDay !== null && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {monthNames[calMonth]} {selectedDay}, {calYear}
              <Badge variant="secondary">{selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {selectedBookings.length === 0 ? (
              <p className="text-sm text-neutral-500 py-4 text-center">No bookings on this day. Enjoy the rest!</p>
            ) : (
              <div className="space-y-3">
                {selectedBookings.map((b: any) => (
                  <div key={b.id} className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 border">
                    <div className={`h-3 w-3 rounded-full mt-1.5 shrink-0 ${STATUS_DOT[b.status] || 'bg-neutral-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{b.pujaName || 'Puja Service'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(b.status)}`}>
                          {bookingStatusLabel(b.status || '')}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-600 mt-1 space-y-0.5">
                        {b.time && (
                          <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.time}</p>
                        )}
                        {b.city && (
                          <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {b.city}</p>
                        )}
                        <BookingAddressVisibility booking={b} onRefresh={onRefresh} />
                        {b.gurujiName && (
                          <p className="flex items-center gap-1"><User className="h-3 w-3" /> {b.gurujiName}</p>
                        )}
                      </div>
                    </div>
                    {b.amount != null && (
                      <p className="text-sm font-bold text-violet-700 shrink-0">₹{b.amount.toLocaleString('en-IN')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BookingCard({ booking, onRate, onRefresh }: { booking: any; onRate?: (b: any) => void; onRefresh?: () => void }) {
  const { toast } = useToast();
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data: existingRating } = useQuery<any>({
    queryKey: ['/api/reviews/booking', booking.id, 'guruji-side'],
    queryFn: async () => {
      const res = await fetch(`/api/reviews/booking/${booking.id}/both`, { credentials: 'include' });
      if (!res.ok) throw new Error('Could not check whether this booking has been rated.');
      const data = await res.json();
      return data.gurujiReview || null;
    },
    enabled: booking.status === 'completed',
  });

  const { data: preview, isLoading: previewLoading, isError: previewError, refetch: refetchPreview } = useQuery<any>({
    queryKey: ['/api/bookings', booking.id, 'cancellation-preview'],
    queryFn: () => apiRequest('GET', `/api/bookings/${booking.id}/cancellation-preview`).then(r => r.json()),
    enabled: showCancel,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => (await apiRequest('POST', `/api/bookings/${booking.id}/cancel`, { reason: cancelReason,quoteToken:preview?.quoteToken })).json(),
    onSuccess: () => {
      toast({ title: 'Withdrawal recorded', description: 'The booking remains open for another Guruji. Any charge is recorded only; no money is deducted.' });
      setShowCancel(false);
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/cancellation-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/availability'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/booking-requests'] });
    },
    onError: (e: any) => {refetchPreview();toast({ title: 'Please review withdrawal details', description: e.message, variant: 'destructive' });},
  });

  const canCancel = (booking.status === 'confirmed' || booking.status === 'in_progress') &&
    !hasBookingStarted(booking.date, booking.time);
  const canRate = booking.status === 'completed' && onRate && existingRating === null;
  const hasRated = booking.status === 'completed' && existingRating;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(booking.status)}`}>
                {bookingStatusLabel(booking.status)}
              </span>
              <span className="text-xs text-neutral-500">#{booking.id}</span>
            </div>
            <h3 className="font-semibold">{booking.pujaName || booking.type || 'Puja Service'}</h3>
            <div className="text-sm text-neutral-600 space-y-0.5">
              {booking.date && (
                <p className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                  {new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {booking.time ? ` · ${booking.time}` : ''}
                </p>
              )}
              {booking.city && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                  {booking.city}
                </p>
              )}
              <BookingAddressVisibility booking={booking} onRefresh={onRefresh} />
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            {booking.amount != null && (
              <p className="text-lg font-bold text-violet-700">₹{booking.amount.toLocaleString('en-IN')}</p>
            )}
            {canCancel && (
              <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setShowCancel(true)}>
                <Ban className="h-3.5 w-3.5 mr-1" /> Withdraw from Booking
              </Button>
            )}
            <BookingProgressActions booking={booking} />
            {canRate && (
              <Button variant="outline" size="sm" className="text-amber-600 border-amber-300 hover:bg-amber-50" onClick={() => onRate!(booking)}>
                <Star className="h-3.5 w-3.5 mr-1" /> Rate Customer
              </Button>
            )}
            {hasRated && (
              <div className="flex items-center gap-1 text-sm text-amber-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Rated {existingRating.rating}/5</span>
              </div>
            )}
          </div>
        </div>
        <GurujiCommissionNotice snapshot={booking.commissionSnapshot} className="mt-4" />
      </CardContent>

      {/* Cancel Dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Withdraw from Booking #{booking.id}
            </DialogTitle>
            <DialogDescription>You cannot close this booking. Withdrawal starts a replacement search and alerts the Vaidik Dhara support team.</DialogDescription>
          </DialogHeader>

          {/* Charge Preview */}
          {previewLoading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500 py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculating charges...
            </div>
          ) : preview && (
            <div className={`rounded-lg p-3 text-sm border ${preview.charge > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className="font-medium mb-1">
                {preview.charge > 0 ? `Recorded withdrawal charge: ₹${preview.charge}` : 'No withdrawal charge'}
              </p>
              <p className="text-neutral-600">{preview.chargeDescription}</p>
              <p className="text-xs text-neutral-600">{preview.paymentNotice}</p>
              {preview.hoursUntil !== undefined && (
                <p className="text-neutral-500 mt-1 text-xs">
                  Booking is {preview.hoursUntil > 0 ? `${preview.hoursUntil} hours away` : 'in the past'}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason for cancellation *</Label>
            {previewError && <Button variant="outline" onClick={()=>refetchPreview()}>Retry withdrawal policy</Button>}
            <Textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Briefly explain why you are cancelling this booking..."
              className="min-h-[80px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)}>Keep Booking</Button>
            <Button
              variant="destructive"
              disabled={cancelReason.trim().length < 5 || cancelMutation.isPending || previewLoading || previewError || !preview?.canCancel || hasBookingStarted(booking.date, booking.time)}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
              Confirm Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
