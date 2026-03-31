import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, MapPin,
  Loader2, Check, Star, Phone, User as UserIcon, Wifi,
  Home, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

type BookingStep = 'service' | 'datetime' | 'guruji' | 'review';

const STEPS: BookingStep[] = ['service', 'datetime', 'guruji', 'review'];

const STEP_LABELS: Record<BookingStep, string> = {
  service:  'Select Service',
  datetime: 'Date & Location',
  guruji:   'Select Guruji',
  review:   'Review & Confirm',
};

const TIME_SLOTS = [
  '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM',
];

function generateDates(count = 14) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  });
}

export function MobileBookingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);

  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  const [bookingType, setBookingType] = useState<'offline' | 'online' | 'consultation'>('offline');
  const [consultationType, setConsultationType] = useState<'own_guruji' | 'auto_select' | 'immediate'>('auto_select');
  const [selectedPujaId, setSelectedPujaId] = useState<string>(searchParams.get('puja') || '');
  const [withSamagri, setWithSamagri] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [selectedGurujiId, setSelectedGurujiId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch pujas, cities, auth
  const { data: pujas = [], isLoading: pujasLoading } = useQuery({ queryKey: ['/api/pujas'] });
  const { data: cities = [] } = useQuery({ queryKey: ['/api/cities'] });
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const selectedPuja = (pujas as any[]).find((p: any) => p.id.toString() === selectedPujaId) || null;

  // Fetch gurujis only on step 3
  const gurujiQueryUrl = `/api/gurujis?city=${encodeURIComponent(selectedCity)}&pujaId=${selectedPujaId}&specialization=${encodeURIComponent(selectedPuja?.name || '')}`;
  const { data: gurujis = [], isLoading: gurujisLoading } = useQuery<any[]>({
    queryKey: [gurujiQueryUrl],
    enabled: currentStep === 'guruji' && !!selectedPujaId && !!selectedCity &&
      (bookingType === 'offline' || (bookingType === 'consultation' && consultationType === 'own_guruji')),
  });

  const selectedGuruji = (gurujis as any[]).find((g: any) => g.id?.toString() === selectedGurujiId) || null;

  const calculateAmount = () => {
    if (!selectedPuja) return 0;
    if (bookingType === 'consultation' && consultationType === 'immediate') return selectedPuja.price * 3;
    let total = selectedPuja.price || 0;
    if (withSamagri && selectedPuja.samagriPrice) total += selectedPuja.samagriPrice;
    return total;
  };

  const stepIndex = STEPS.indexOf(currentStep);

  const validate = (): boolean => {
    if (currentStep === 'service') {
      if (!selectedPujaId) { toast({ title: 'Select a puja', variant: 'destructive' }); return false; }
    }
    if (currentStep === 'datetime') {
      if (!selectedDate) { toast({ title: 'Select a date', variant: 'destructive' }); return false; }
      if (!selectedTime) { toast({ title: 'Select a time', variant: 'destructive' }); return false; }
      if (bookingType === 'offline') {
        if (!selectedCity) { toast({ title: 'Select a city', variant: 'destructive' }); return false; }
        if (!address) { toast({ title: 'Enter your address', variant: 'destructive' }); return false; }
      }
    }
    if (currentStep === 'guruji') {
      const needsGuruji = bookingType === 'offline' || (bookingType === 'consultation' && consultationType === 'own_guruji');
      if (needsGuruji && !selectedGurujiId) {
        toast({ title: 'Select a Guruji', variant: 'destructive' }); return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validate()) return;
    const next = STEPS[stepIndex + 1];
    if (next) setCurrentStep(next);
  };

  const goPrev = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setCurrentStep(prev);
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      toast({ title: 'Login required', description: 'Please login to book a puja', variant: 'destructive' });
      return;
    }
    try {
      setIsSubmitting(true);
      const dt = new Date(selectedDate!);
      const parts = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (parts) {
        let h = parseInt(parts[1]);
        const m = parseInt(parts[2]);
        if (parts[3].toUpperCase() === 'PM' && h !== 12) h += 12;
        if (parts[3].toUpperCase() === 'AM' && h === 12) h = 0;
        dt.setHours(h, m, 0, 0);
      }

      const bookingData: any = {
        pujaId: parseInt(selectedPujaId),
        type: bookingType,
        amount: calculateAmount(),
        city: selectedCity,
        address,
        date: dt.toISOString(),
        duration: selectedPuja?.duration || 120,
        notes: '',
        isImmediate: bookingType === 'consultation' && consultationType === 'immediate',
      };
      if (bookingType === 'consultation') bookingData.consultationType = consultationType;
      if (selectedGurujiId) bookingData.gurujiId = parseInt(selectedGurujiId);

      await apiRequest('POST', '/api/bookings', bookingData);
      toast({ title: 'Booking submitted!', description: 'Our team will contact you for payment confirmation.' });
      setLocation('/dashboard');
    } catch {
      toast({ title: 'Booking failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dates = generateDates();

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="flex items-center px-4 py-3">
          {stepIndex > 0 && (
            <Button variant="ghost" size="icon" onClick={goPrev} className="mr-2 shrink-0">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-base font-semibold leading-tight">{STEP_LABELS[currentStep]}</h1>
            <p className="text-xs text-muted-foreground">Step {stepIndex + 1} of {STEPS.length}</p>
          </div>
        </div>

        {/* Animated progress dots */}
        <div className="flex items-center gap-1 px-4 pb-3">
          {STEPS.map((step, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <div key={step} className="flex items-center flex-1">
                <motion.div
                  animate={{
                    scale: active ? 1.15 : 1,
                    backgroundColor: done ? '#22c55e' : active ? '#6d28d9' : '#e5e7eb',
                  }}
                  transition={{ duration: 0.25 }}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ color: done || active ? 'white' : '#9ca3af' }}
                >
                  {done ? <Check className="w-3 h-3" /> : i + 1}
                </motion.div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: done ? '100%' : '0%' }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-green-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* ── STEP 1: Select Service ── */}
        {currentStep === 'service' && (
          <motion.div key="service" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">

            {/* Service type tabs */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Service Type</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { val: 'offline', icon: <Home className="h-4 w-4" />, label: 'Offline Puja' },
                  { val: 'online', icon: <Wifi className="h-4 w-4" />, label: 'Online Puja' },
                  { val: 'consultation', icon: <MessageSquare className="h-4 w-4" />, label: 'Consultation' },
                ] as const).map(({ val, icon, label }) => (
                  <button
                    key={val}
                    onClick={() => setBookingType(val)}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium transition-all
                      ${bookingType === val
                        ? 'border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-400'
                        : 'border-gray-200 bg-white text-gray-600'}`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Consultation sub-type */}
            {bookingType === 'consultation' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                <p className="text-sm font-medium text-amber-800">Consultation Type</p>
                {([
                  { val: 'own_guruji', label: 'Select your own Guruji' },
                  { val: 'auto_select', label: 'Auto-select best Guruji' },
                  { val: 'immediate', label: 'Immediate (3× price)' },
                ] as const).map(({ val, label }) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="consultationType"
                      checked={consultationType === val}
                      onChange={() => setConsultationType(val)}
                      className="accent-violet-600"
                    />
                    <span className="text-sm text-amber-900">{label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Offline samagri option */}
            {bookingType === 'offline' && (
              <label className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={withSamagri}
                  onChange={e => setWithSamagri(e.target.checked)}
                  className="accent-orange-500 w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-orange-800">Include Puja Samagri</p>
                  <p className="text-xs text-orange-600">All required puja materials delivered</p>
                </div>
              </label>
            )}

            {/* Puja selection */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Select Puja</p>
              {pujasLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>
              ) : (
                <div className="space-y-2">
                  {(pujas as any[]).map((puja: any) => (
                    <button
                      key={puja.id}
                      onClick={() => setSelectedPujaId(puja.id.toString())}
                      className={`w-full text-left rounded-xl border p-3 transition-all
                        ${selectedPujaId === puja.id.toString()
                          ? 'border-violet-600 bg-violet-50 ring-1 ring-violet-400'
                          : 'border-gray-200 bg-white'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-2">
                          <p className="font-medium text-sm">{puja.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{puja.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{puja.duration} min</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-violet-700">₹{puja.price}</p>
                          {withSamagri && puja.samagriPrice && (
                            <p className="text-xs text-orange-600">+₹{puja.samagriPrice} samagri</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Date & Location ── */}
        {currentStep === 'datetime' && (
          <motion.div key="datetime" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">

            {/* Summary chip */}
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl p-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                <Check className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Selected Puja</p>
                <p className="text-sm font-medium">{selectedPuja?.name} · ₹{calculateAmount()}</p>
              </div>
            </div>

            {/* Date picker */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Select Date
              </p>
              <div className="flex overflow-x-auto gap-2 pb-1 -mx-1 px-1">
                {dates.map(date => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString();
                  const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow'
                    : date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                  const selected = selectedDate?.toDateString() === date.toDateString();
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-shrink-0 rounded-xl border px-3 py-2 text-center text-xs font-medium transition-all
                        ${selected ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-200 bg-white text-gray-700'}`}
                    >
                      <p className="font-semibold">{label.split(' ')[0]}</p>
                      <p className="opacity-80">{label.split(' ').slice(1).join(' ')}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time picker */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <Clock className="h-4 w-4" /> Select Time
              </p>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map(time => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-lg border py-2 text-xs font-medium transition-all
                      ${selectedTime === time ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-200 bg-white text-gray-700'}`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Location (offline only) */}
            {bookingType === 'offline' && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> Location
                </p>
                <div>
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    <option value="">Select city…</option>
                    {(cities as any[]).map((c: any) => (
                      <option key={c.id} value={c.name.toLowerCase().replace(/\s+/g, '-')}>
                        {c.name}, {c.state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Full Address</Label>
                  <Input
                    className="mt-1"
                    placeholder="House no., street, area…"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── STEP 3: Select Guruji ── */}
        {currentStep === 'guruji' && (
          <motion.div key="guruji" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

            {/* Summary */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-sm space-y-0.5">
              <p className="font-medium">{selectedPuja?.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedDate?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · {selectedTime}
                {selectedCity && ` · ${selectedCity}`}
              </p>
            </div>

            {/* Auto-select / online: no guruji picking needed */}
            {(bookingType === 'online' || (bookingType === 'consultation' && consultationType !== 'own_guruji')) ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-violet-600" />
                </div>
                <p className="font-medium">
                  {bookingType === 'consultation' && consultationType === 'immediate'
                    ? 'Immediate booking — the first available Guruji will be assigned'
                    : 'The best available Guruji will be auto-assigned for your booking'}
                </p>
                <p className="text-sm text-muted-foreground">You can proceed to review your booking</p>
              </div>
            ) : gurujisLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
              </div>
            ) : (gurujis as any[]).length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <UserIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="font-medium">No Gurujis available</p>
                <p className="text-sm text-muted-foreground">No verified Gurujis found for {selectedCity}. Try a different city or puja.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(gurujis as any[]).map((g: any) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGurujiId(g.id.toString())}
                    className={`w-full text-left rounded-xl border p-3 transition-all
                      ${selectedGurujiId === g.id.toString()
                        ? 'border-violet-600 bg-violet-50 ring-1 ring-violet-400'
                        : 'border-gray-200 bg-white'}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 shrink-0">
                        {g.profilePictureUrl && <AvatarImage src={g.profilePictureUrl} />}
                        <AvatarFallback className="bg-violet-100 text-violet-700 font-semibold">
                          {(g.user?.firstName?.[0] || g.firstName?.[0] || 'G')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {g.user?.firstName || g.firstName} {g.user?.lastName || g.lastName}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          <span>{g.experience} yrs exp</span>
                          {g.rating > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {Number(g.rating).toFixed(1)}
                              {g.totalReviews > 0 && ` (${g.totalReviews})`}
                            </span>
                          )}
                          {g.languages?.length > 0 && <span>{g.languages.join(', ')}</span>}
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex gap-1">
                            {g.isOffline && <Badge variant="outline" className="text-[10px] py-0 px-1.5">In-Person</Badge>}
                            {g.isOnline && <Badge variant="outline" className="text-[10px] py-0 px-1.5">Online</Badge>}
                          </div>
                          <p className="font-semibold text-sm text-violet-700">₹{g.pricePerHour}/hr</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── STEP 4: Review & Confirm ── */}
        {currentStep === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-1">
              <p className="font-semibold text-amber-800">Payment Process</p>
              <p className="text-amber-700">
                Our team will contact you after booking to confirm payment via UPI, bank transfer, or cash.
              </p>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Puja</span>
                  <span className="font-medium">{selectedPuja?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{bookingType}</span>
                </div>
                {bookingType === 'consultation' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Consultation</span>
                    <span className="font-medium capitalize">{consultationType.replace('_', ' ')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {selectedDate?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                {selectedCity && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">City</span>
                    <span className="font-medium capitalize">{selectedCity.replace(/-/g, ' ')}</span>
                  </div>
                )}
                {address && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address</span>
                    <span className="font-medium text-right max-w-[55%]">{address}</span>
                  </div>
                )}
                {selectedGuruji && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guruji</span>
                    <span className="font-medium">
                      {selectedGuruji.user?.firstName || selectedGuruji.firstName} {selectedGuruji.user?.lastName || selectedGuruji.lastName}
                    </span>
                  </div>
                )}
                {!selectedGuruji && bookingType !== 'offline' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guruji</span>
                    <span className="font-medium text-muted-foreground italic">Auto-assigned</span>
                  </div>
                )}
                {withSamagri && selectedPuja?.samagriPrice && (
                  <div className="flex justify-between text-orange-700">
                    <span>Samagri</span>
                    <span className="font-medium">+₹{selectedPuja.samagriPrice}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="text-violet-700">₹{calculateAmount()}</span>
                </div>
              </CardContent>
            </Card>

            {!currentUser && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                You must be logged in to submit a booking.{' '}
                <button onClick={() => setLocation('/login')} className="underline font-medium">Login now</button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-20">
        {currentStep === 'review' ? (
          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            onClick={handleSubmit}
            disabled={isSubmitting || !currentUser}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            {isSubmitting ? 'Submitting…' : 'Confirm Booking Request'}
          </Button>
        ) : (
          <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={goNext}>
            Continue
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
