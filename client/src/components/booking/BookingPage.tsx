import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
import { CalendarIcon, Clock, MapPin, User, ArrowRight, CreditCard, Calendar as CalendarIcon2, Check } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import PaymentPage from '@/components/payments/PaymentPage';

// This component handles different booking types: offline, online puja, and consultation
export default function BookingPage() {
  // Parse query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const initialType = searchParams.get('type') || 'offline';
  const initialPujaId = searchParams.get('puja') || '';
  const initialCity = searchParams.get('city') || '';
  const initialDate = searchParams.get('date') ? new Date(searchParams.get('date')!) : undefined;

  // State for the booking form
  const [activeStep, setActiveStep] = useState<number>(1);
  const [bookingType, setBookingType] = useState<'offline' | 'online' | 'consultation'>(initialType as any);
  const [consultationType, setConsultationType] = useState<'own_guruji' | 'auto_select' | 'immediate'>('auto_select');
  const [selectedPujaId, setSelectedPujaId] = useState<string>(initialPujaId);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>(initialCity);
  const [address, setAddress] = useState<string>('');
  const [selectedGurujiId, setSelectedGurujiId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch available pujas
  const { data: pujas, isLoading: isPujasLoading } = useQuery({
    queryKey: ['/api/pujas'],
  });

  // Fetch available gurujis based on criteria
  const { data: gurujis, isLoading: isGurujiLoading } = useQuery({
    queryKey: ['/api/gurujis', { city: selectedCity, pujaId: selectedPujaId }],
    enabled: !!selectedCity && activeStep === 3 && (bookingType === 'offline' || (bookingType === 'consultation' && consultationType === 'own_guruji')),
  });

  // Time slots that can be selected
  const timeSlots = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', 
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM'
  ];

  // Cities available for selection
  const cities = [
    { value: 'mumbai', label: 'Mumbai' },
    { value: 'delhi', label: 'Delhi' },
    { value: 'bangalore', label: 'Bangalore' },
    { value: 'pune', label: 'Pune' },
    { value: 'chennai', label: 'Chennai' }
  ];

  // Selected puja details
  const selectedPuja = pujas?.find(p => p.id.toString() === selectedPujaId);

  // Calculate booking amount based on type and consultation type
  const calculateAmount = () => {
    if (!selectedPuja) return 0;
    
    if (bookingType === 'consultation') {
      if (consultationType === 'immediate') {
        return selectedPuja.price * 3; // 3x for immediate consultation
      }
    }
    
    return selectedPuja.price;
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
      const dateTime = new Date(selectedDate!);
      const [hours, minutes, period] = selectedTime.split(/:|\s/);
      const hour = parseInt(hours) + (period === 'PM' && hours !== '12' ? 12 : 0);
      dateTime.setHours(hour, parseInt(minutes));

      const bookingData = {
        pujaId: parseInt(selectedPujaId),
        type: bookingType,
        amount: calculateAmount(),
        city: selectedCity,
        address: address,
        date: dateTime.toISOString(),
        duration: selectedPuja?.duration || 120,
        notes: '',
        isImmediate: bookingType === 'consultation' && consultationType === 'immediate',
      };

      if (bookingType === 'consultation') {
        bookingData.consultationType = consultationType;
      }

      if (selectedGurujiId) {
        bookingData.gurujiId = parseInt(selectedGurujiId);
      }

      const response = await apiRequest('POST', '/api/bookings', bookingData);
      const data = await response.json();

      toast({
        title: "Booking successful",
        description: "Your booking has been placed successfully",
      });

      // Redirect to dashboard
      setLocation('/dashboard');
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Booking failed",
        description: "There was an error processing your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if the user is logged in before proceeding to payment
  useEffect(() => {
    if (activeStep === 4 && !user) {
      toast({
        title: "Login required",
        description: "Please login to continue with the booking",
        variant: "destructive",
      });
      setActiveStep(3);
    }
  }, [activeStep, user, toast]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 font-poppins">Book Your Service</h1>
        <p className="text-neutral-600">Complete the steps below to book your puja or consultation</p>
      </div>

      {/* Progress steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  activeStep >= step 
                    ? 'bg-primary text-white' 
                    : 'bg-neutral-200 text-neutral-500'
                }`}
              >
                {step}
              </div>
              <span className={`text-xs mt-2 ${activeStep >= step ? 'text-primary' : 'text-neutral-500'}`}>
                {step === 1 ? 'Select Service' : 
                 step === 2 ? 'Date & Location' : 
                 step === 3 ? 'Select Guruji' : 'Payment'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {activeStep === 1 && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Select Service Type</CardTitle>
            <CardDescription>Choose the type of service you need</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={bookingType} onValueChange={(value) => setBookingType(value as any)}>
              <TabsList className="grid grid-cols-3 mb-8">
                <TabsTrigger value="offline">Offline Puja</TabsTrigger>
                <TabsTrigger value="online">Online Puja</TabsTrigger>
                <TabsTrigger value="consultation">Consultation</TabsTrigger>
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
              <Label className="mb-2 block">Select Puja</Label>
              {isPujasLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {pujas?.map((puja) => (
                    <div 
                      key={puja.id}
                      className={`border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors ${
                        selectedPujaId === puja.id.toString() ? 'border-primary bg-primary-50' : ''
                      }`}
                      onClick={() => setSelectedPujaId(puja.id.toString())}
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
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      type="button"
                      variant={selectedTime === time ? "default" : "outline"}
                      className="justify-start"
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
                      {cities.map((city) => (
                        <SelectItem key={city.value} value={city.value}>
                          {city.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {bookingType === 'offline' && (
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
              <div>
                {isGurujiLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : gurujis && gurujis.length > 0 ? (
                  <div className="space-y-4">
                    {gurujis.map((guruji) => (
                      <div
                        key={guruji.id}
                        className={`border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors ${
                          selectedGurujiId === guruji.id.toString() ? 'border-primary bg-primary-50' : ''
                        }`}
                        onClick={() => setSelectedGurujiId(guruji.id.toString())}
                      >
                        <div className="flex items-start">
                          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary mr-4">
                            <User className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h3 className="font-medium">Pandit {guruji.firstName} {guruji.lastName}</h3>
                              <div className="flex items-center">
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                <span className="ml-1 text-sm">{guruji.rating || 4.8} ({guruji.totalReviews || 24})</span>
                              </div>
                            </div>
                            <p className="text-sm text-neutral-600 mt-1">
                              Experience: {guruji.experience || 5} years • {guruji.location || selectedCity}
                            </p>
                            <p className="text-sm text-neutral-600 mt-1">
                              {guruji.specialization || `Specializes in ${selectedPuja?.name || 'various pujas'}`}
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
                    <h3 className="text-lg font-medium mb-2">No Gurujis available</h3>
                    <p className="text-neutral-600">
                      There are no Gurujis available in the selected location for the chosen service.
                      Please try a different location or date.
                    </p>
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
                        {bookingType === 'online' ? 'Online Puja' : 'Consultation'}
                        {bookingType === 'consultation' && ` (${consultationType === 'auto_select' ? 'Auto-select' : 'Immediate'})`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Puja:</span>
                      <span className="font-medium">{selectedPuja?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Date & Time:</span>
                      <span className="font-medium">
                        {selectedDate ? format(selectedDate, 'PPP') : ''} at {selectedTime}
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
              Proceed to Payment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {activeStep === 4 && selectedPuja && (
        <PaymentPage 
          bookingId={0} // This will be populated after booking is created
          amount={calculateAmount()}
          pujaName={selectedPuja.name}
          onBack={handlePreviousStep}
          onSuccess={() => {
            handleSubmitBooking(); // Create the booking when payment is successful
          }}
        />
      )}
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
