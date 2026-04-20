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
import { PujaMultiSelect, CityMultiSelect } from '@/components/shared/ProfileEditSelectors';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Loader2, Calendar, Clock, MapPin, Check, X,
  User, IndianRupee, Phone, Bell, CheckCircle2,
  XCircle, Package2, AlertCircle, Edit, Save, Ban, AlertTriangle
} from 'lucide-react';

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
  const [declineReason, setDeclineReason] = useState<Record<number, string>>({});
  const [showDeclineFor, setShowDeclineFor] = useState<number | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
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
        description: 'Your profile has been updated and resubmitted for admin review.',
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
        city: myProfile.city || '',
        state: myProfile.state || '',
        address: myProfile.address || '',
        pincode: myProfile.pincode || '',
        experience: String(myProfile.experience || ''),
        pricePerHour: String(myProfile.pricePerHour || ''),
        bio: myProfile.bio || '',
      });
      const specStr = myProfile.specialization || '';
      setProfilePujas(specStr ? specStr.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setProfileServiceCities(Array.isArray(myProfile.cities) ? myProfile.cities : []);
    }
  }, [myProfile]);

  const handleOpenProfileEdit = () => {
    if (!myProfile) return;
    setProfileForm({
      city: myProfile.city || '',
      state: myProfile.state || '',
      address: myProfile.address || '',
      pincode: myProfile.pincode || '',
      experience: String(myProfile.experience || ''),
      pricePerHour: String(myProfile.pricePerHour || ''),
      bio: myProfile.bio || '',
    });
    const specStr = myProfile.specialization || '';
    setProfilePujas(specStr ? specStr.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
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
    refetchInterval: 30000,
  });

  // Fetch this guruji's confirmed / completed bookings
  const { data: myBookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const res = await fetch('/api/bookings', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });

  const pendingRequests = bookingRequests.filter((r: any) => r.status === 'pending');
  const upcoming = myBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'in_progress');
  const completed = myBookings.filter((b: any) => b.status === 'completed');
  const totalEarnings = completed.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

  // Accept a booking request
  const acceptMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest('POST', `/api/booking-requests/${requestId}/respond`, {
        response: 'accept',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to accept');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Booking accepted!', description: 'The customer has been notified.' });
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

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
                  Your Guruji application is pending admin approval. You can update your profile details while you wait.
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
                <p className="text-sm text-neutral-500">Earnings</p>
                <p className="text-3xl font-bold text-violet-600">₹{totalEarnings.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3 bg-violet-50 rounded-full">
                <IndianRupee className="h-5 w-5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="mb-6">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Booking Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            <Calendar className="h-4 w-4 mr-2" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="all-requests">
            <Package2 className="h-4 w-4 mr-2" />
            All Requests
          </TabsTrigger>
          <TabsTrigger value="my-profile">
            <User className="h-4 w-4 mr-2" />
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
                          {req.customer?.mobile && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                              {req.customer.mobile}
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
                              {req.booking.city}{req.booking.pincode ? ` – ${req.booking.pincode}` : ''}
                            </span>
                          )}
                          {req.booking?.address && (
                            <span className="flex items-center gap-1.5 col-span-2">
                              <MapPin className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                              {req.booking.address}
                            </span>
                          )}
                          {req.booking?.amount != null && (
                            <span className="flex items-center gap-1.5 font-medium text-violet-700">
                              <IndianRupee className="h-4 w-4 flex-shrink-0" />
                              ₹{req.booking.amount.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Accept / Decline buttons */}
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => acceptMutation.mutate(req.id)}
                          disabled={acceptMutation.isPending}
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
                    </div>

                    {/* Decline reason box */}
                    {showDeclineFor === req.id && (
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
                            disabled={declineMutation.isPending}
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

        {/* ── UPCOMING BOOKINGS ── */}
        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-lg font-medium">No upcoming bookings</p>
              <p className="text-sm mt-1">Accepted bookings will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} />
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
                <BookingCard key={booking.id} booking={booking} />
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
    </div>
  );
}

function BookingCard({ booking }: { booking: any }) {
  const { toast } = useToast();
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data: preview, isLoading: previewLoading } = useQuery<any>({
    queryKey: ['/api/bookings', booking.id, 'cancellation-preview'],
    queryFn: () => apiRequest('GET', `/api/bookings/${booking.id}/cancellation-preview`).then(r => r.json()),
    enabled: showCancel,
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/bookings/${booking.id}/cancel`, { reason: cancelReason }),
    onSuccess: () => {
      toast({ title: 'Booking Cancelled', description: preview?.charge > 0 ? `A charge of ₹${preview.charge} has been applied.` : 'No cancellation charges applied.' });
      setShowCancel(false);
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const canCancel = booking.status === 'confirmed' || booking.status === 'in_progress';

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(booking.status)}`}>
                {booking.status.replace('_', ' ')}
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
                  {booking.city}{booking.address ? ` — ${booking.address}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            {booking.amount != null && (
              <p className="text-lg font-bold text-violet-700">₹{booking.amount.toLocaleString('en-IN')}</p>
            )}
            {canCancel && (
              <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setShowCancel(true)}>
                <Ban className="h-3.5 w-3.5 mr-1" /> Cancel Booking
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Cancel Dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Cancel Booking #{booking.id}
            </DialogTitle>
            <DialogDescription>Please provide a reason. Cancellation charges may apply based on admin rules.</DialogDescription>
          </DialogHeader>

          {/* Charge Preview */}
          {previewLoading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500 py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculating charges...
            </div>
          ) : preview && (
            <div className={`rounded-lg p-3 text-sm border ${preview.charge > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className="font-medium mb-1">
                {preview.charge > 0 ? `⚠️ Charge: ₹${preview.charge}` : '✅ Free Cancellation'}
              </p>
              <p className="text-neutral-600">{preview.chargeDescription}</p>
              {preview.hoursUntil !== undefined && (
                <p className="text-neutral-500 mt-1 text-xs">
                  Booking is {preview.hoursUntil > 0 ? `${preview.hoursUntil} hours away` : 'in the past'}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason for cancellation *</Label>
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
              disabled={cancelReason.trim().length < 5 || cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
