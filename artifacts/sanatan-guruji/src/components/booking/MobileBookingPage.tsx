import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, MapPin,
  Loader2, Check, Star, Phone, User as UserIcon, Wifi,
  Home, MessageSquare, QrCode, Copy
} from 'lucide-react';
import LoginModal from '@/components/auth/LoginModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { usePricingQuote } from '@/components/pricing/usePricingQuote';
import PricingQuoteBreakdown from '@/components/pricing/PricingQuoteBreakdown';

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

function indiaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function generateDates(count = 14) {
  const [year, month, day] = indiaDateKey(new Date()).split('-').map(Number);
  const firstIndiaDate = new Date(year, month - 1, day, 12);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(firstIndiaDate);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function localCalendarDate(date: Date | null): string | undefined {
  if (!date) return undefined;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  const [pincode, setPincode] = useState<string>('');
  const [selectedGurujiId, setSelectedGurujiId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [clockNow, setClockNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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

  const { data: paymentSettings } = useQuery<any>({
    queryKey: ['/api/settings/payment'],
    queryFn: async () => {
      const res = await fetch('/api/settings/payment');
      return res.json();
    },
    staleTime: 60000,
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
  const indiaTodayKey = indiaDateKey(clockNow);
  const indiaClockParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(clockNow);
  const indiaCurrentMinutes = Number(indiaClockParts.find(part => part.type === 'hour')?.value ?? 0) * 60 +
    Number(indiaClockParts.find(part => part.type === 'minute')?.value ?? 0);

  const isElapsedIndiaTime = (date: Date, time: string) => {
    if (localCalendarDate(date) !== indiaTodayKey) return false;
    const match = /^(\d{2}):(\d{2}) (AM|PM)$/.exec(time);
    if (!match) return false;
    const rawHour = Number(match[1]);
    const slotMinutes = (rawHour % 12 + (match[3] === 'PM' ? 12 : 0)) * 60 + Number(match[2]);
    return slotMinutes <= indiaCurrentMinutes;
  };
  const selectedTimeElapsed = !!selectedDate && !!selectedTime && isElapsedIndiaTime(selectedDate, selectedTime);
  const pricingQuoteQuery = usePricingQuote(
    selectedPuja ? Number(selectedPuja.id) : undefined,
    localCalendarDate(selectedDate),
    selectedTimeElapsed ? '' : selectedTime,
    withSamagri,
  );
  const pricingQuote = pricingQuoteQuery.data;

  const calculateAmount = () => {
    return pricingQuote?.totalAmount ?? 0;
  };

  const stepIndex = STEPS.indexOf(currentStep);

  const validate = (): boolean => {
    if (currentStep === 'service') {
      if (!selectedPujaId) { toast({ title: 'Select a puja', variant: 'destructive' }); return false; }
    }
    if (currentStep === 'datetime') {
      if (!selectedDate) { toast({ title: 'Select a date', variant: 'destructive' }); return false; }
      if (!selectedTime) { toast({ title: 'Select a time', variant: 'destructive' }); return false; }
      if (selectedTimeElapsed) { toast({ title: 'Choose a future time', description: 'That time has already passed in India. Please select a later slot.', variant: 'destructive' }); return false; }
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
      if (!selectedPuja || !selectedDate || !selectedTime || selectedTimeElapsed) throw new Error('Choose a future puja time before booking.');
      const refreshedQuote = await pricingQuoteQuery.refetch();
      if (refreshedQuote.isError || !refreshedQuote.data) throw new Error('The current price could not be confirmed. Refresh and try again.');
      if (!pricingQuote || refreshedQuote.data.totalAmount !== pricingQuote.totalAmount) {
        toast({ title: 'Price updated', description: 'Review the latest quote below, then submit again.', variant: 'destructive' });
        return;
      }
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
        type: bookingType === 'consultation' ? 'online' : bookingType,
        amount: refreshedQuote.data.totalAmount,
        withSamagri,
        city: selectedCity,
        address,
        pincode: pincode || undefined,
        date: dt.toISOString(),
        calendarDate: localCalendarDate(selectedDate),
        time: selectedTime,
        duration: selectedPuja?.duration || 120,
        notes: '',
        isImmediate: bookingType === 'consultation' && consultationType === 'immediate',
      };
      if (bookingType === 'consultation') bookingData.consultationType = consultationType;
      if (selectedGurujiId) bookingData.gurujiId = parseInt(selectedGurujiId);

      await apiRequest('POST', '/api/bookings', bookingData);
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/booking-requests'] });
      toast({ title: 'Booking submitted!', description: 'Our team will contact you for payment confirmation.' });
      setLocation('/dashboard');
    } catch (error) {
      if (String(error).includes('409:') && /price|amount|quote/i.test(String(error))) {
        await pricingQuoteQuery.refetch();
        toast({ title: 'Price changed', description: 'We refreshed your quote. Review the new total and submit again.', variant: 'destructive' });
      } else {
        toast({ title: 'Booking failed', description: String(error).includes('409:') ? 'That time or Guruji is no longer available. Please choose another.' : 'Please try again.', variant: 'destructive' });
      }
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
                  { val: 'immediate', label: 'Immediate consultation' },
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
                          <p className="text-xs text-muted-foreground">Price confirmed after date and time</p>
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
                <p className="text-sm font-medium">{selectedPuja?.name}</p>
              </div>
            </div>

            {/* Date picker */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Select Date
              </p>
              <div className="flex overflow-x-auto gap-2 pb-1 -mx-1 px-1">
                {dates.map((date, dateIndex) => {
                  const isToday = dateIndex === 0;
                  const isTomorrow = dateIndex === 1;
                  const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow'
                    : date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                  const selected = selectedDate?.toDateString() === date.toDateString();
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => { setSelectedDate(date); setSelectedTime(''); }}
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
                      disabled={!!selectedDate && isElapsedIndiaTime(selectedDate, time)}
                      aria-disabled={!!selectedDate && isElapsedIndiaTime(selectedDate, time)}
                      aria-label={!!selectedDate && isElapsedIndiaTime(selectedDate, time) ? `${time}, elapsed in India` : time}
                      title={!!selectedDate && isElapsedIndiaTime(selectedDate, time) ? 'This time has passed in India' : undefined}
                      className={`rounded-lg border py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40
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
                <div>
                  <Label className="text-xs text-muted-foreground">Pincode</Label>
                  <Input
                    className="mt-1"
                    placeholder="6-digit pincode (e.g. 440001)"
                    value={pincode}
                    onChange={e => setPincode(e.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                  />
                  <p className="text-xs text-muted-foreground mt-1">We use this to find the nearest Guruji in your area</p>
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

            {selectedTimeElapsed && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">This selected slot has already passed in India. Return to Date &amp; Location and choose a future time.</p>}
            <PricingQuoteBreakdown
              quote={pricingQuote}
              loading={pricingQuoteQuery.isFetching}
              error={pricingQuoteQuery.isError}
              onRefresh={() => void pricingQuoteQuery.refetch()}
            />

            {paymentSettings?.paymentRequired ? (
              /* ── Payment required: show UPI QR ── */
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
                <p className="font-semibold text-violet-900 flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Pay via UPI to confirm booking
                </p>
                <p className="text-sm text-violet-700">
                  Pay <strong>₹{calculateAmount()}</strong> to complete your booking request.
                </p>
                {paymentSettings?.upiQrImageUrl && (
                  <div className="flex justify-center">
                    <img
                      src={paymentSettings.upiQrImageUrl}
                      alt="UPI QR Code"
                      className="w-40 h-40 object-contain bg-white rounded-lg border p-2"
                    />
                  </div>
                )}
                {paymentSettings?.upiId && (
                  <div className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{paymentSettings.upiName ?? 'UPI ID'}</p>
                      <p className="font-mono text-sm font-medium">{paymentSettings.upiId}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(paymentSettings.upiId);
                        toast({ title: 'UPI ID copied!' });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-start gap-2 pt-1">
                  <Checkbox
                    id="mobPayConfirm"
                    checked={paymentConfirmed}
                    onCheckedChange={(val) => setPaymentConfirmed(!!val)}
                    className="mt-0.5"
                  />
                  <label htmlFor="mobPayConfirm" className="text-xs text-violet-800 cursor-pointer">
                    I have completed the UPI payment and understand it will be verified before my booking is confirmed.
                  </label>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-1">
                <p className="font-semibold text-amber-800">Payment Process</p>
                <p className="text-amber-700">
                  Our team will contact you after booking to confirm payment via UPI, bank transfer, or cash.
                </p>
              </div>
            )}

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
                <button onClick={() => setShowLoginModal(true)} className="underline font-medium">Login now</button>
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
            disabled={isSubmitting || !currentUser || selectedTimeElapsed || !pricingQuote || pricingQuoteQuery.isFetching || pricingQuoteQuery.isError || (paymentSettings?.paymentRequired && !paymentConfirmed)}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            {isSubmitting ? 'Submitting…' : paymentSettings?.paymentRequired ? 'I have paid — Confirm Booking' : 'Confirm Booking Request'}
          </Button>
        ) : (
          <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={goNext}>
            Continue
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Login modal — shown when user is not logged in at review step */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onRegisterClick={() => setShowLoginModal(false)}
        onLoginSuccess={() => setShowLoginModal(false)}
      />
    </div>
  );
}
