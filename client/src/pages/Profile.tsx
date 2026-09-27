import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, User, Calendar, Shield, BookOpen, CheckCircle, Clock, XCircle } from 'lucide-react';
import { PujaMultiSelect, CityMultiSelect } from '@/components/shared/ProfileEditSelectors';

export default function Profile() {
  const { toast } = useToast();

  // Fetch current user via API (avoids AuthContext dependency)
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const isGuruji = user?.role === 'guruji';

  // ── Basic info form ─────────────────────────────────────────────────
  const [basicForm, setBasicForm] = useState({
    firstName: '', lastName: '', age: '', address: '', city: '', state: '', pincode: '',
  });

  useEffect(() => {
    if (user) {
      setBasicForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        age: String(user.age || ''),
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || '',
      });
    }
  }, [user]);

  const updateBasicMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', `/api/users/${user?.id}`, {
        firstName: basicForm.firstName.trim(),
        lastName: basicForm.lastName.trim(),
        age: basicForm.age ? Number(basicForm.age) : undefined,
        address: basicForm.address,
        city: basicForm.city,
        state: basicForm.state,
        pincode: basicForm.pincode,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed'); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({ title: 'Profile updated', description: 'Your basic info has been saved.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // ── Password form ────────────────────────────────────────────────────
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (pwdForm.newPwd !== pwdForm.confirm) throw new Error('New passwords do not match');
      if (pwdForm.newPwd.length < 6) throw new Error('New password must be at least 6 characters');
      const res = await apiRequest('POST', '/api/auth/change-password', {
        currentPassword: pwdForm.current,
        newPassword: pwdForm.newPwd,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed'); }
      return res.json();
    },
    onSuccess: () => {
      setPwdForm({ current: '', newPwd: '', confirm: '' });
      setPwdError('');
      toast({ title: 'Password changed', description: 'Your password has been updated.' });
    },
    onError: (e: any) => {
      setPwdError(e.message);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const handlePasswordSubmit = () => {
    setPwdError('');
    if (!pwdForm.current || !pwdForm.newPwd || !pwdForm.confirm) {
      setPwdError('All fields are required');
      return;
    }
    changePasswordMutation.mutate();
  };

  // ── Guruji profile form ──────────────────────────────────────────────
  const [gurujiForm, setGurujiForm] = useState({
    bio: '', experience: '', pricePerHour: '', religion: '', age: '',
  });
  const [gurujiPujas, setGurujiPujas] = useState<string[]>([]);
  const [gurujiCities, setGurujiCities] = useState<string[]>([]);

  const { data: myGurujiProfile, isLoading: gurujiLoading } = useQuery<any>({
    queryKey: ['/api/guruji/my-profile'],
    queryFn: async () => {
      const res = await fetch('/api/guruji/profile', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isGuruji,
  });

  useEffect(() => {
    if (myGurujiProfile) {
      setGurujiForm({
        bio: myGurujiProfile.bio || '',
        experience: String(myGurujiProfile.experience || ''),
        pricePerHour: String(myGurujiProfile.pricePerHour || ''),
        religion: myGurujiProfile.religion || '',
        age: String(myGurujiProfile.age || ''),
      });
      const specStr = myGurujiProfile.specialization || '';
      setGurujiPujas(specStr ? specStr.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setGurujiCities(Array.isArray(myGurujiProfile.cities) ? myGurujiProfile.cities : []);
    }
  }, [myGurujiProfile]);

  const updateGurujiMutation = useMutation({
    mutationFn: async () => {
      const data: any = { pujas: gurujiPujas, serviceCities: gurujiCities };
      if (gurujiForm.bio) data.bio = gurujiForm.bio;
      if (gurujiForm.experience) data.experience = Number(gurujiForm.experience);
      if (gurujiForm.pricePerHour) data.pricePerHour = Number(gurujiForm.pricePerHour);
      if (gurujiForm.religion) data.religion = gurujiForm.religion;
      if (gurujiForm.age) data.age = Number(gurujiForm.age);
      const res = await apiRequest('PUT', '/api/guruji/profile', data);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed'); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/my-profile'] });
      toast({ title: 'Guruji profile updated', description: 'Your profile changes have been saved.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // ── Bookings ─────────────────────────────────────────────────────────
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ['/api/bookings'],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 20000,
  });

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === 'cancelled') return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-800';
    if (status === 'cancelled') return 'bg-red-100 text-red-800';
    if (status === 'confirmed') return 'bg-blue-100 text-blue-800';
    return 'bg-amber-100 text-amber-800';
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Please log in to view your profile.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  const initials = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Helmet>
        <title>My Profile | GurujiConnect</title>
      </Helmet>
      <Header />

      <main className="flex-grow container mx-auto px-3 sm:px-4 py-5 sm:py-8 max-w-5xl">
        <div className="mb-6 sm:mb-8 flex items-start sm:items-center gap-3 sm:gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl font-semibold bg-orange-100 text-orange-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{userName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize">{user?.role}</Badge>
              {user.email && <span className="text-sm text-gray-500">{user.email}</span>}
              {user.mobile && <span className="text-sm text-gray-500">· {user.mobile}</span>}
            </div>
          </div>
        </div>

        <Tabs defaultValue="basic">
          <TabsList className={`grid w-full ${isGuruji ? 'grid-cols-4' : 'grid-cols-3'} mb-6 h-auto`}>
            <TabsTrigger value="basic" className="flex items-center gap-1 text-xs sm:text-sm">
              <User className="h-4 w-4 hidden sm:block" /> Personal Info
            </TabsTrigger>
            {isGuruji && (
              <TabsTrigger value="guruji" className="flex items-center gap-1 text-xs sm:text-sm">
                <BookOpen className="h-4 w-4 hidden sm:block" /> Guruji Profile
              </TabsTrigger>
            )}
            <TabsTrigger value="bookings" className="flex items-center gap-1 text-xs sm:text-sm">
              <Calendar className="h-4 w-4 hidden sm:block" /> Bookings
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1 text-xs sm:text-sm">
              <Shield className="h-4 w-4 hidden sm:block" /> Security
            </TabsTrigger>
          </TabsList>

          {/* ── Personal Info Tab ── */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your basic profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      className="mt-1"
                      value={basicForm.firstName}
                      onChange={e => setBasicForm(f => ({ ...f, firstName: e.target.value }))}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      className="mt-1"
                      value={basicForm.lastName}
                      onChange={e => setBasicForm(f => ({ ...f, lastName: e.target.value }))}
                      placeholder="Last name"
                    />
                  </div>
                  <div>
                    <Label>Age</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      min="1"
                      value={basicForm.age}
                      onChange={e => setBasicForm(f => ({ ...f, age: e.target.value }))}
                      placeholder="Your age"
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      className="mt-1"
                      value={basicForm.city}
                      onChange={e => setBasicForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      className="mt-1"
                      value={basicForm.state}
                      onChange={e => setBasicForm(f => ({ ...f, state: e.target.value }))}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <Input
                      className="mt-1"
                      value={basicForm.pincode}
                      onChange={e => setBasicForm(f => ({ ...f, pincode: e.target.value }))}
                      placeholder="Pincode"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Address</Label>
                    <Textarea
                      className="mt-1"
                      value={basicForm.address}
                      onChange={e => setBasicForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="Full address"
                      rows={2}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Email (read-only)</Label>
                    <Input className="mt-1 bg-gray-50" value={user.email || ''} disabled readOnly />
                  </div>
                  <div>
                    <Label>Mobile (read-only)</Label>
                    <Input className="mt-1 bg-gray-50" value={user.mobile || ''} disabled readOnly />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => updateBasicMutation.mutate()}
                    disabled={updateBasicMutation.isPending || !basicForm.firstName.trim()}
                  >
                    {updateBasicMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Guruji Profile Tab ── */}
          {isGuruji && (
            <TabsContent value="guruji">
              <Card>
                <CardHeader>
                  <CardTitle>Guruji Profile</CardTitle>
                  <CardDescription>
                    Update your specializations, pricing, and service areas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {gurujiLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Years of Experience</Label>
                          <Input
                            className="mt-1"
                            type="number"
                            min="1"
                            value={gurujiForm.experience}
                            onChange={e => setGurujiForm(f => ({ ...f, experience: e.target.value }))}
                            placeholder="e.g. 5"
                          />
                        </div>
                        <div>
                          <Label>Price Per Hour (₹)</Label>
                          <Input
                            className="mt-1"
                            type="number"
                            min="100"
                            value={gurujiForm.pricePerHour}
                            onChange={e => setGurujiForm(f => ({ ...f, pricePerHour: e.target.value }))}
                            placeholder="e.g. 500"
                          />
                        </div>
                        <div>
                          <Label>Religion</Label>
                          <Input
                            className="mt-1"
                            value={gurujiForm.religion}
                            onChange={e => setGurujiForm(f => ({ ...f, religion: e.target.value }))}
                            placeholder="e.g. Hindu"
                          />
                        </div>
                        <div>
                          <Label>Age</Label>
                          <Input
                            className="mt-1"
                            type="number"
                            value={gurujiForm.age}
                            onChange={e => setGurujiForm(f => ({ ...f, age: e.target.value }))}
                            placeholder="Your age"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label>Bio / Description</Label>
                          <Textarea
                            className="mt-1"
                            value={gurujiForm.bio}
                            onChange={e => setGurujiForm(f => ({ ...f, bio: e.target.value }))}
                            placeholder="Describe your background and spiritual expertise..."
                            rows={3}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="mb-1 block">Puja Specializations</Label>
                        <PujaMultiSelect selectedPujas={gurujiPujas} onChange={setGurujiPujas} />
                      </div>

                      <div>
                        <Label className="mb-1 block">Service Cities</Label>
                        <CityMultiSelect selectedCities={gurujiCities} onChange={setGurujiCities} />
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() => updateGurujiMutation.mutate()}
                          disabled={updateGurujiMutation.isPending}
                        >
                          {updateGurujiMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Save Guruji Profile
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Bookings Tab ── */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
                <CardDescription>Your booking history</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No bookings yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          {statusIcon(b.status)}
                          <div>
                            <p className="font-medium">{b.pujaName || `Booking #${b.id}`}</p>
                            <p className="text-sm text-gray-500">
                              {b.date ? new Date(b.date).toLocaleDateString('en-IN') : 'Date TBD'}
                              {b.city ? ` · ${b.city}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {b.amount > 0 && <span className="text-sm font-medium">₹{b.amount}</span>}
                          <Badge className={statusColor(b.status)}>{b.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Security Tab ── */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div>
                  <Label>Current Password</Label>
                  <Input
                    className="mt-1"
                    type="password"
                    value={pwdForm.current}
                    onChange={e => setPwdForm(f => ({ ...f, current: e.target.value }))}
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <Label>New Password</Label>
                  <Input
                    className="mt-1"
                    type="password"
                    value={pwdForm.newPwd}
                    onChange={e => setPwdForm(f => ({ ...f, newPwd: e.target.value }))}
                    placeholder="At least 6 characters"
                  />
                </div>
                <div>
                  <Label>Confirm New Password</Label>
                  <Input
                    className="mt-1"
                    type="password"
                    value={pwdForm.confirm}
                    onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Repeat new password"
                  />
                </div>
                {pwdError && <p className="text-sm text-red-600">{pwdError}</p>}
                <Button
                  onClick={handlePasswordSubmit}
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
