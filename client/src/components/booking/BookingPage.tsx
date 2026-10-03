import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock, MapPin, User, ArrowRight, CreditCard, Calendar as CalendarIcon2, Check, UserX, Loader2 } from 'lucide-react';
import { BookingProgressIndicator, BookingStep } from './BookingProgressIndicator';
import PaymentPage from '@/components/payments/PaymentPage';
import LoginModal from '@/components/auth/LoginModal';
import { clearBookingDraft, readBookingDraft, saveBookingDraft } from './bookingDraft';

function bookingDateTime(date: Date, time: string): Date {
  const match = /^(\d{2}):(\d{2}) (AM|PM)$/.exec(time);
  if (!match) throw new Error('Invalid booking time');
  const result = new Date(date);
  result.setHours(Number(match[1]) % 12 + (match[3] === 'PM' ? 12 : 0), Number(match[2]), 0, 0);
  return result;
}

// This component handles different booking types: offline, online puja, and consultation
export default function BookingPage() {
  // Parse query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const bookingUrl = window.location.pathname + window.location.search;
  const [savedDraft] = useState(() => readBookingDraft(bookingUrl));
  const initialType = searchParams.get('type') || 'offline';
  const initialPujaId = searchParams.get('puja') || '';
  const initialPujaName = searchParams.get('pujaName') || '';
  const initialCity = searchParams.get('city') || ''; // Will be auto-populated from user profile
  const initialDate = searchParams.get('date') ? new Date(searchParams.get('date')!) : undefined;
  
  // Log search parameters for debugging
  console.log('Search params:', { 
    type: initialType, 
    puja: initialPujaId,
    pujaName: initialPujaName,
    city: initialCity, 
    date: initialDate 
  });

  // State for the booking form
  const [activeStep, setActiveStep] = useState<number>(savedDraft?.activeStep ?? 1);
  const [bookingType, setBookingType] = useState<'offline' | 'online' | 'consultation'>(savedDraft?.bookingType ?? initialType as any);
  const [consultationType, setConsultationType] = useState<'own_guruji' | 'auto_select' | 'immediate'>(savedDraft?.consultationType ?? 'auto_select');
  const [gurujiSelectionMode, setGurujiSelectionMode] = useState<'specific' | 'auto_nearby'>(savedDraft?.gurujiSelectionMode ?? 'specific');
  const [selectedPujaId, setSelectedPujaId] = useState<string>(savedDraft?.selectedPujaId ?? initialPujaId);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(savedDraft?.selectedDate ? new Date(`${savedDraft.selectedDate}T12:00:00`) : initialDate);
  const [selectedTime, setSelectedTime] = useState<string>(savedDraft?.selectedTime ?? '');
  const [selectedCity, setSelectedCity] = useState<string>(savedDraft?.selectedCity ?? initialCity);
  const [address, setAddress] = useState<string>(savedDraft?.address ?? '');
  const [pincode, setPincode] = useState<string>(savedDraft?.pincode ?? '');
  const [selectedGurujiId, setSelectedGurujiId] = useState<string>(savedDraft?.selectedGurujiId ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Real auth check
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 30000,
  });

  // Fetch available pujas
  const { data: pujas = [], isLoading: isPujasLoading } = useQuery({
    queryKey: ['/api/pujas'],
    staleTime: 0, // Always refetch to ensure fresh data
    gcTime: 0, // Don't cache to avoid stale data (renamed from cacheTime in v5)
  });

  // Selected puja details - moved before gurujis query to fix initialization error
  const selectedPuja = Array.isArray(pujas) ? pujas.find((p: any) => p.id.toString() === selectedPujaId) : null;

  // Build guruji query URL with filters
  const gurujiBaseUrl = `/api/gurujis?city=${encodeURIComponent(selectedCity || '')}&pujaId=${selectedPujaId || ''}&specialization=${encodeURIComponent(selectedPuja?.name || '')}`;
  const selectedCalendarDate = selectedDate && selectedTime ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const gurujiQueryUrl = selectedCalendarDate
    ? `${gurujiBaseUrl}&date=${selectedCalendarDate}&time=${encodeURIComponent(selectedTime)}&duration=${encodeURIComponent(String(selectedPuja?.duration || 120))}`
    : gurujiBaseUrl;
  const shouldFetchGurujis = !!selectedPujaId && !!selectedCity && !!selectedCalendarDate && !!selectedPuja &&
    activeStep === 3 && (bookingType === 'offline' || (bookingType === 'consultation' && consultationType === 'own_guruji'));
  
  // Fetch only Gurujis free for the whole service, then distinguish a full
  // schedule from a city/service with no matching specialist.
  const { data: gurujis = [], isLoading: isGurujiLoading, isError: isGurujiError } = useQuery<any[]>({
    queryKey: [gurujiQueryUrl],
    enabled: shouldFetchGurujis,
  });
  const { data: matchingGurujis, isLoading: isMatchingLoading, isError: isMatchingError } = useQuery<any[]>({
    queryKey: [gurujiBaseUrl],
    enabled: shouldFetchGurujis && !isGurujiLoading && !isGurujiError && gurujis.length === 0,
  });

  const selectionKey = [selectedCity, selectedPujaId, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '', selectedTime].join('|');
  const previousSelectionKey = useRef(selectionKey);
  useEffect(() => {
    if (previousSelectionKey.current !== selectionKey) {
      setSelectedGurujiId('');
      previousSelectionKey.current = selectionKey;
    }
  }, [selectionKey]);

  // Time slots that can be selected
  const timeSlots = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', 
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM'
  ];

  // Fetch cities from database
  const { data: cities = [], isLoading: isCitiesLoading } = useQuery({
    queryKey: ['/api/cities'],
    select: (data: any[]) => data.map(city => ({
      value: city.name.toLowerCase().replace(/\s+/g, '-'),
      label: `${city.name}, ${city.state}`
    })),
  });
  
  // Debug information
  console.log("DEBUG: Puja selection", {
    selectedService: null,
    initialPujaId,
    pujas,
    pujasType: typeof pujas,
    isArray: Array.isArray(pujas),
    selectedPujaId
  });
  console.log("DEBUG: Selected puja result:", selectedPuja || "Not found");

  // Resolve specialization string ("1,4" or "Puja Name") to human-readable names
  const resolveSpecialization = (spec: string | null | undefined): string => {
    if (!spec) return '';
    const parts = spec.split(',').map(s => s.trim()).filter(Boolean);
    if (!Array.isArray(pujas) || pujas.length === 0) return spec;
    const names = parts.map(part => {
      const byId = (pujas as any[]).find((p: any) => p.id?.toString() === part);
      if (byId) return byId.name;
      const byName = (pujas as any[]).find((p: any) => p.name?.toLowerCase() === part.toLowerCase());
      return byName ? byName.name : part;
    });
    return names.join(', ');
  };

  // Calculate booking amount based on type and consultation type
  const [withSamagri, setWithSamagri] = useState(savedDraft?.withSamagri ?? false);

  const goToRegistration = () => {
    saveBookingDraft({
      returnTo: bookingUrl, activeStep, bookingType, consultationType, gurujiSelectionMode,
      selectedPujaId, selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      selectedTime, selectedCity, address, pincode, selectedGurujiId, withSamagri,
    });
    setShowLoginModal(false);
    setLocation(`/register?returnTo=${encodeURIComponent(bookingUrl)}`);
  };

  const calculateAmount = () => {
    if (!selectedPuja) return 0;
    
    if (bookingType === 'consultation') {
      if (consultationType === 'immediate') {
        return selectedPuja.price * 3; // 3x for immediate consultation
      }
    }
    
    let total = selectedPuja.price;
    if (withSamagri && selectedPuja.samagriPrice) {
      total += selectedPuja.samagriPrice;
    }
    return total;
  };

  const handleNextStep = () => {
    // Validate current step before proceeding
    if (activeStep === 1) {
      if (!selectedPujaId) {
        toast({
          title: "Please select a puja",
          description: "You need to select a puja to continue",
          variant: "destructive",
        });
        return;
      }
    } else if (activeStep === 2) {
      if (!selectedDate) {
        toast({
          title: "Please select a date",
          description: "You need to select a date to continue",
          variant: "destructive",
        });
        return;
      }
      if (!selectedTime) {
        toast({
          title: "Please select a time",
          description: "You need to select a time to continue",
          variant: "destructive",
        });
        return;
      }
      if (bookingType === 'offline' && !selectedCity) {
        toast({
          title: "Please select a city",
          description: "You need to select a city for offline puja",
          variant: "destructive",
        });
        return;
      }
      if (bookingType === 'offline' && !address) {
        toast({
          title: "Please enter your address",
          description: "Address is required for offline puja",
          variant: "destructive",
        });
        return;
      }
    }

    if (activeStep === 3 && gurujiSelectionMode === 'specific' &&
        (bookingType === 'offline' || (bookingType === 'consultation' && consultationType === 'own_guruji')) &&
        (!selectedGurujiId || !gurujis.some((guruji: any) => String(guruji.id) === selectedGurujiId))) {
      toast({ title: 'Please select an available Guruji', description: 'Choose a Guruji for the selected date and time.', variant: 'destructive' });
      return;
    }
    if (activeStep === 3) {
      // Authentication can remount this form. Preserve the selection before login.
      saveBookingDraft({
        returnTo: bookingUrl, activeStep: 4, bookingType, consultationType, gurujiSelectionMode,
        selectedPujaId, selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
        selectedTime, selectedCity, address, pincode, selectedGurujiId, withSamagri,
      });
    }
    setActiveStep(prev => prev + 1);
  };

  const handlePreviousStep = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmitBooking = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to book a puja",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Format date and time for API
      const dateTime = bookingDateTime(selectedDate!, selectedTime);

      // Create booking data with correct TypeScript interface
      const bookingData: any = {
        pujaId: parseInt(selectedPujaId),
        type: bookingType,
        amount: calculateAmount(),
        city: selectedCity,
        address: address,
        pincode: pincode || undefined,
        date: dateTime.toISOString(),
        calendarDate: format(selectedDate!, 'yyyy-MM-dd'),
        time: selectedTime,
        duration: selectedPuja?.duration || 120,
        notes: '',
        isImmediate: bookingType === 'consultation' && consultationType === 'immediate',
      };

      if (bookingType === 'consultation') {
        bookingData.consultationType = consultationType;
      }

      // Only assign guruji directly if user selected a specific guruji (not auto-search)
      if (selectedGurujiId && gurujiSelectionMode === 'specific') {
        bookingData.gurujiId = parseInt(selectedGurujiId);
      }
      // If auto-search mode, don't set gurujiId - it will be handled by the API

      const response = await apiRequest('POST', '/api/bookings', bookingData);
      const data = await response.json();
      if (typeof data.id !== 'number') throw new Error('Booking response did not include an ID');

      // Invalidate bookings cache to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/booking-requests'] });

      toast({
        title: "Booking request sent",
        description: "Your booking is pending until a Guruji accepts it.",
      });

      clearBookingDraft();
      setLocation(`/booking/${data.id}`);
    } catch (error) {
      console.error('Booking error:', error);
      if (String(error).includes('409:')) {
        setActiveStep(3);
        queryClient.invalidateQueries({ queryKey: [gurujiQueryUrl] });
      }
      toast({
        title: "Booking failed",
        description: String(error).includes('409:') ? "That Guruji is now busy. Please select another Guruji or time." : "There was an error processing your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-populate city from user's profile city if not specified in URL
  useEffect(() => {
    if (user && !selectedCity && !searchParams.get('city') && user.city) {
      setSelectedCity(user.city.toLowerCase());
    }
  }, [user]);

  // Require login before the booking-request review.
  useEffect(() => {
    if (activeStep === 4 && user === null) {
      setShowLoginModal(true);
    }
  }, [activeStep, user]);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 font-poppins">Book Your Service</h1>
        <p className="text-neutral-600">Complete the steps below to book your puja or consultation</p>
        
        {/* Display the selected puja name if available */}
        {initialPujaName && (
          <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <h2 className="text-xl font-semibold text-primary-700">
              Selected Service: <span className="font-bold">{initialPujaName}</span>
            </h2>
          </div>
        )}
      </div>

      {/* Animated Progress Indicator */}
      <div className="mb-8 max-w-3xl mx-auto">
        <BookingProgressIndicator
          steps={[
            { id: 1, label: 'Select Service', description: 'Choose your puja type' },
            { id: 2, label: 'Date & Location', description: 'Pick date and venue' },
            { id: 3, label: 'Select Guruji', description: 'Choose your guide' },
            { id: 4, label: 'Review Request', description: 'No payment for now' },
          ]}
          currentStep={activeStep}
          variant="horizontal"
          size="md"
        />
      </div>

      {activeStep === 1 && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Select Service Type</CardTitle>
            <CardDescription>Choose the type of service you need</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={bookingType} onValueChange={(value) => setBookingType(value as any)}>
              <TabsList className="grid grid-cols-3 mb-8 h-auto">
                <TabsTrigger value="offline" className="px-2 py-2 text-xs sm:text-sm">Offline Puja</TabsTrigger>
                <TabsTrigger value="online" className="px-2 py-2 text-xs sm:text-sm">Online Puja</TabsTrigger>
                <TabsTrigger value="consultation" className="px-2 py-2 text-xs sm:text-sm">Consultation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="offline">
                <div className="mb-6">
                  <p className="mb-4">Book an in-person puja at your home or preferred location with an experienced Guruji</p>
                </div>
              </TabsContent>
              
              <TabsContent value="online">
                <div className="mb-6">
                  <p className="mb-4">Participate in a puja virtually through a video call with a Guruji from anywhere</p>
                </div>
              </TabsContent>
              
              <TabsContent value="consultation">
                <div className="mb-6">
                  <p className="mb-4">Get expert advice and guidance from a Guruji for marriage dates, muhurtas, or any other puja suggestions</p>
                  
                  <div className="mt-4">
                    <Label className="mb-2 block">Consultation Type</Label>
                    <RadioGroup 
                      value={consultationType} 
                      onValueChange={(value) => setConsultationType(value as any)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="own_guruji" id="own_guruji" />
                        <Label htmlFor="own_guruji">Select your own Guruji</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="auto_select" id="auto_select" />
                        <Label htmlFor="auto_select">Auto select best available Guruji</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="immediate" id="immediate" />
                        <Label htmlFor="immediate">
                          Immediate consultation
                          <Badge className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-100">
                            3x Regular Price
                          </Badge>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Separator className="my-6" />
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="block">
                  {initialPujaId ? 'Selected Puja' : 'Select Puja'}
                </Label>
                {initialPujaId && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      // Clear the initial selection to show all pujas
                      const url = new URL(window.location.href);
                      url.searchParams.delete('puja');
                      url.searchParams.delete('pujaName');
                      window.history.replaceState({}, '', url.toString());
                      setSelectedPujaId('');
                      window.location.reload(); // Reload to reset initialPujaId
                    }}
                    className="text-primary hover:text-primary-700"
                  >
                    Change Selection
                  </Button>
                )}
              </div>
              {isPujasLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {(initialPujaId ? (pujas as any[])?.filter((puja: any) => puja.id.toString() === initialPujaId) : (pujas as any[]))?.map((puja: any) => (
                    <div 
                      key={puja.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        initialPujaId 
                          ? 'border-primary bg-primary-50 cursor-default' 
                          : `cursor-pointer hover:border-primary ${selectedPujaId === puja.id.toString() ? 'border-primary bg-primary-50' : ''}`
                      }`}
                      onClick={() => {
                        if (!initialPujaId) {
                          setSelectedPujaId(puja.id.toString());
                        }
                      }}
                    >
                      <div className="flex justify-between">
                        <h3 className="font-medium">{puja.name}</h3>
                        <span className="font-medium text-primary">₹{puja.price}</span>
                      </div>
                      <p className="text-sm text-neutral-600 mt-1">{puja.description}</p>
                      <div className="flex items-center mt-2 text-xs text-neutral-500">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{puja.duration} minutes</span>
                      </div>
                      {selectedPujaId === puja.id.toString() && puja.type === 'offline' && (
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="without-samagri"
                                name="samagri"
                                checked={!withSamagri}
                                onChange={() => setWithSamagri(false)}
                                className="h-4 w-4"
                              />
                              <label htmlFor="without-samagri">Without Samagri</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="with-samagri"
                                name="samagri"
                                checked={withSamagri}
                                onChange={() => setWithSamagri(true)}
                                className="h-4 w-4"
                              />
                              <label htmlFor="with-samagri">With Samagri (+₹{puja.samagriPrice || 0})</label>
                            </div>
                          </div>
                          {withSamagri && puja.samagri && (
                            <div className="bg-neutral-50 p-4 rounded-lg">
                              <h4 className="font-medium mb-2">Included Samagri Items:</h4>
                              <ul className="text-sm space-y-1">
                                {puja.samagri.map((item, index) => (
                                  <li key={index} className="flex justify-between">
                                    <span>{item.name} × {item.quantity}</span>
                                    {item.optional && <span className="text-neutral-500">(Optional)</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={handleNextStep}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {activeStep === 2 && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Date & Location</CardTitle>
            <CardDescription>Choose when and where the service should take place</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="mb-2 block">Date</Label>
                <div className="border rounded-md p-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="mx-auto"
                    disabled={(date) => date < new Date() || date > new Date(new Date().setMonth(new Date().getMonth() + 3))}
                  />
                </div>
              </div>
              
              <div>
                <Label className="mb-2 block">Time</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      type="button"
                      variant={selectedTime === time ? "default" : "outline"}
                      className="justify-start px-2 sm:px-4 text-xs sm:text-sm"
                      onClick={() => setSelectedTime(time)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {(bookingType === 'offline' || (bookingType === 'consultation' && consultationType === 'own_guruji')) && (
              <div className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger id="city" className="mt-1">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {!isCitiesLoading && cities.map((city) => (
                        <SelectItem key={city.value} value={city.value}>
                          {city.label}
                        </SelectItem>
                      ))}
                      {isCitiesLoading && (
                        <SelectItem value="" disabled>
                          Loading cities...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {bookingType === 'offline' && (
                  <>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter your full address"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="6-digit pincode (e.g. 440001)"
                        maxLength={6}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Used to find the nearest available Guruji in your area</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={handlePreviousStep}>
              Back
            </Button>
            <Button onClick={handleNextStep}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {activeStep === 3 && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>
              {bookingType === 'consultation' && consultationType !== 'own_guruji' 
                ? 'Review Details' 
                : 'Select Guruji'}
            </CardTitle>
            <CardDescription>
              {bookingType === 'consultation' && consultationType !== 'own_guruji' 
                ? 'The best available Guruji will be assigned to your booking' 
                : 'Choose a Guruji for your service'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(bookingType === 'offline' || (bookingType === 'consultation' && consultationType === 'own_guruji')) ? (
              <div className="space-y-6">
                {/* Guruji Selection Mode Toggle */}
                <div className="bg-neutral-50 p-4 rounded-lg border">
                  <p className="text-sm font-medium mb-4">How would you like to find your Guruji?</p>
                  <div className="space-y-3">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-white transition-colors" style={{borderColor: gurujiSelectionMode === 'specific' ? '#7c3aed' : '#e5e7eb', backgroundColor: gurujiSelectionMode === 'specific' ? '#f3e8ff' : 'white'}}>
                      <input
                        type="radio"
                        name="gurujiMode"
                        value="specific"
                        checked={gurujiSelectionMode === 'specific'}
                        onChange={(e) => setGurujiSelectionMode(e.target.value as 'specific' | 'auto_nearby')}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium text-sm">Select a Specific Guruji</p>
                        <p className="text-xs text-neutral-500">Choose from available Gurujis in your area</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-white transition-colors" style={{borderColor: gurujiSelectionMode === 'auto_nearby' ? '#7c3aed' : '#e5e7eb', backgroundColor: gurujiSelectionMode === 'auto_nearby' ? '#f3e8ff' : 'white'}}>
                      <input
                        type="radio"
                        name="gurujiMode"
                        value="auto_nearby"
                        checked={gurujiSelectionMode === 'auto_nearby'}
                        onChange={(e) => setGurujiSelectionMode(e.target.value as 'specific' | 'auto_nearby')}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium text-sm">Auto-Search Nearby Gurujis</p>
                        <p className="text-xs text-neutral-500">Send request to all available Gurujis in your location (first to accept gets the booking)</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Show guruji list only in specific mode */}
                {gurujiSelectionMode === 'specific' && (
                  <div>
                     {isGurujiLoading || (gurujis.length === 0 && isMatchingLoading) ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                     ) : isGurujiError || isMatchingError ? (
                       <div className="text-center py-8 text-red-700" role="alert">
                         Unable to check Guruji availability. Please try again.
                       </div>
                    ) : gurujis && gurujis.length > 0 ? (
                      <div className="space-y-4">
                        {gurujis.map((guruji) => (
                      <div
                        key={guruji.id}
                        role="button"
                        aria-pressed={selectedGurujiId === guruji.id.toString()}
                        tabIndex={0}
                        className={`border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors ${
                          selectedGurujiId === guruji.id.toString() ? 'border-primary bg-primary-50' : ''
                        }`}
                        onClick={() => setSelectedGurujiId(guruji.id.toString())}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedGurujiId(guruji.id.toString());
                          }
                        }}
                      >
                        <div className="flex items-start">
                          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary mr-4">
                            <User className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h3 className="font-medium">Pandit {guruji.firstName} {guruji.lastName}</h3>
                              <div className="flex items-center">
                                <Badge variant="default" className="mr-2">Available</Badge>
                                {guruji.totalReviews > 0 ? (
                                  <>
                                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                    <span className="ml-1 text-sm">{Number(guruji.rating).toFixed(1)} ({guruji.totalReviews} reviews)</span>
                                  </>
                                ) : (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">✨ New on portal</span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-neutral-600 mt-1">
                              Experience: {guruji.experience || 5} years • {guruji.location || selectedCity}
                            </p>
                            <p className="text-sm text-neutral-600 mt-1">
                              {resolveSpecialization(guruji.specialization) || `Specializes in ${selectedPuja?.name || 'various pujas'}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserX className="h-8 w-8 text-neutral-400" />
                    </div>
                     <h3 className="text-lg font-medium mb-2">
                       {matchingGurujis?.length ? 'No available time slots' : 'No matching Gurujis'}
                     </h3>
                    <p className="text-neutral-600">
                       {matchingGurujis?.length
                         ? 'Matching Gurujis are booked at this date and time. Please try a different date or time.'
                         : 'There are no approved Gurujis in the selected location for this service. Please try a different location or service.'}
                    </p>
                  </div>
                )}
                    </div>
                  )}

                {/* Show auto-search summary when auto-search is selected */}
                {gurujiSelectionMode === 'auto_nearby' && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-4">
                        <Check className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-blue-800">Auto-Search Active</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Your request will be sent to all available Gurujis in <strong>{selectedCity}</strong> for the <strong>{selectedPuja?.name}</strong>. 
                          The first Guruji to accept will be assigned to your booking.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-neutral-50 rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-4">Booking Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Service Type:</span>
                      <span className="font-medium">
                        {bookingType === 'offline' ? 'Offline Puja' : 
                         bookingType === 'online' ? 'Online Puja' : 'Consultation'}
                        {bookingType === 'consultation' && ` (${consultationType === 'auto_select' ? 'Auto-select' : 'Immediate'})`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Puja:</span>
                      <span className="font-medium">{selectedPuja?.name || 'Not selected'}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-neutral-600">City:</span>
                      <span className="font-medium" data-testid="selected-city">
                        {selectedCity 
                          ? cities.find(c => c.value === selectedCity)?.label || selectedCity 
                          : 'Not selected'}
                      </span>
                    </div>
                    
                    {bookingType === 'offline' && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Address:</span>
                        <span className="font-medium">{address || 'Not provided'}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Date & Time:</span>
                      <span className="font-medium">
                        {selectedDate ? format(selectedDate, 'PPP') : 'Not selected'} {selectedTime ? `at ${selectedTime}` : ''}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Amount:</span>
                      <span className="font-medium">₹{calculateAmount()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-4">
                      <Check className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-green-800">Automated Assignment</h3>
                      <p className="text-sm text-green-700 mt-1">
                        A qualified Guruji will be automatically assigned to your booking based on availability and expertise.
                        You will receive the Guruji's details once your booking is confirmed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={handlePreviousStep}>
              Back
            </Button>
            <Button onClick={handleNextStep}>
              Review Booking Request
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {activeStep === 4 && selectedPuja && user?.role === 'customer' && (
        <PaymentPage 
          amount={calculateAmount()}
          pujaName={selectedPuja.name}
          onBack={handlePreviousStep}
          onSuccess={handleSubmitBooking}
        />
      )}

      {/* Login modal — shown before an unauthenticated customer can send a request */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          // If user still not logged in after closing, go back to step 3
          if (!user) setActiveStep(3);
        }}
        onRegisterClick={goToRegistration}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          setActiveStep(4);
        }}
      />
    </div>
  );
}

const Star = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);
