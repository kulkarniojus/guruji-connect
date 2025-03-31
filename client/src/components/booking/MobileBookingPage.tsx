import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  MapPin, 
  Users 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type BookingStep = 'service' | 'guruji' | 'date' | 'details' | 'payment' | 'confirmation';

export function MobileBookingPage() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  
  // Parse query parameters for pre-selected puja
  const searchParams = new URLSearchParams(window.location.search);
  const initialPujaId = searchParams.get('puja') || '';
  const initialPujaName = searchParams.get('pujaName') || '';
  const initialCity = searchParams.get('city') || 'mumbai';
  const initialDate = searchParams.get('date') ? new Date(searchParams.get('date')!) : undefined;
  
  // Use the query API to fetch data
  const { data: pujas, isLoading: isPujasLoading } = useQuery({
    queryKey: ['/api/pujas'],
  });
  
  // Fetch nearby gurujis within 15km radius when needed
  const { data: fetchedGurujis, isLoading: isGurujiLoading } = useQuery({
    queryKey: ['/api/gurujis', { city: initialCity, pujaId: initialPujaId, radius: 15 }],
    enabled: currentStep === 'guruji',
  });
  
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedGuruji, setSelectedGuruji] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const timeSlots = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];
  
  const dates = [
    { date: new Date().toISOString().split('T')[0], label: 'Today' },
    { date: new Date(Date.now() + 86400000).toISOString().split('T')[0], label: 'Tomorrow' },
    { date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], label: new Date(Date.now() + 86400000 * 2).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) },
    { date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], label: new Date(Date.now() + 86400000 * 3).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) },
    { date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0], label: new Date(Date.now() + 86400000 * 4).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) },
  ];
  
  const goToNextStep = () => {
    if (currentStep === 'service') setCurrentStep('guruji');
    else if (currentStep === 'guruji') setCurrentStep('date');
    else if (currentStep === 'date') setCurrentStep('details');
    else if (currentStep === 'details') setCurrentStep('payment');
    else if (currentStep === 'payment') setCurrentStep('confirmation');
    else if (currentStep === 'confirmation') setLocation('/dashboard');
  };
  
  const goToPreviousStep = () => {
    if (currentStep === 'guruji') setCurrentStep('service');
    else if (currentStep === 'date') setCurrentStep('guruji');
    else if (currentStep === 'details') setCurrentStep('date');
    else if (currentStep === 'payment') setCurrentStep('details');
    else if (currentStep === 'confirmation') setCurrentStep('payment');
  };
  
  const isNextDisabled = () => {
    if (currentStep === 'service' && !selectedService) return true;
    if (currentStep === 'guruji' && !selectedGuruji) return true;
    if (currentStep === 'date' && (!selectedDate || !selectedTime)) return true;
    return false;
  };
  
  const getStepTitle = () => {
    switch (currentStep) {
      case 'service': return 'Select Service';
      case 'guruji': return 'Choose Guruji';
      case 'date': return 'Select Date & Time';
      case 'details': return 'Your Details';
      case 'payment': return 'Payment';
      case 'confirmation': return 'Confirmation';
      default: return '';
    }
  };
  
  const getNextButtonText = () => {
    switch (currentStep) {
      case 'service': return 'Choose Guruji';
      case 'guruji': return 'Select Date & Time';
      case 'date': return 'Continue to Details';
      case 'details': return 'Proceed to Payment';
      case 'payment': return 'Complete Booking';
      case 'confirmation': return 'Go to Dashboard';
      default: return 'Next';
    }
  };
  
  // Set the selected service from URL params when component initializes
  useEffect(() => {
    if (initialPujaId) {
      setSelectedService(parseInt(initialPujaId));
    }
  }, [initialPujaId]);

  // Get the selected puja from fetched data
  const selectedPuja = pujas && Array.isArray(pujas) ? 
    pujas.find(p => p.id.toString() === (selectedService ? selectedService.toString() : initialPujaId)) : null;

  // Get selected guruji data
  const selectedGurujiData = selectedGuruji && fetchedGurujis && Array.isArray(fetchedGurujis) ? 
    fetchedGurujis.find(g => g.id === selectedGuruji) : null;
  
  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      {/* Mobile header with back button and title */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="container px-4 py-3 flex items-center">
          {currentStep !== 'service' && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToPreviousStep}
              className="mr-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-medium">{getStepTitle()}</h1>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-neutral-200 h-1">
          <div 
            className="bg-primary h-1 transition-all duration-300"
            style={{ 
              width: 
                currentStep === 'service' ? '16.6%' :
                currentStep === 'guruji' ? '33.3%' :
                currentStep === 'date' ? '50%' :
                currentStep === 'details' ? '66.6%' :
                currentStep === 'payment' ? '83.3%' : '100%'
            }}
          />
        </div>
      </div>
      
      <div className="container px-4 py-6">
        {/* Service selection step */}
        {currentStep === 'service' && (
          <div className="space-y-4">
            <div className="bg-primary-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-primary">Selected Service from Dashboard</h3>
              <p className="text-sm text-primary-700 mt-1">{initialPujaName}</p>
              {initialCity && (
                <p className="text-xs text-primary-600 mt-1">Location: {initialCity}</p>
              )}
            </div>
            
            <p className="text-neutral-600 mb-4">Your selected puja:</p>
            
            <div className="space-y-3">
              {isPujasLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : selectedPuja ? (
                <Card 
                  className="border-primary ring-2 ring-primary-50"
                >
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{selectedPuja.name}</h3>
                      <div className="text-sm text-neutral-500">
                        <span>{selectedPuja.duration} minutes</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-primary">₹{selectedPuja.price}</div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center p-6 border border-amber-200 bg-amber-50 rounded-lg">
                  <p className="text-amber-800">No puja selected. Please go back to the dashboard and select a puja.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Guruji selection step */}
        {currentStep === 'guruji' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-primary-50 text-primary p-3 rounded-lg mb-4">
              <div>
                <p className="font-medium">Selected Service</p>
                <p className="text-sm">{selectedPuja?.name} • ₹{selectedPuja?.price}</p>
              </div>
            </div>
            
            <p className="text-neutral-600 mb-2">Choose a Guruji for your service within 15km:</p>
            
            <div className="space-y-3">
              {isGurujiLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : fetchedGurujis && Array.isArray(fetchedGurujis) && fetchedGurujis.length > 0 ? (
                fetchedGurujis.map(guruji => (
                  <Card 
                    key={guruji.id}
                    className={`cursor-pointer transition-all hover:border-primary ${selectedGuruji === guruji.id ? 'border-primary ring-2 ring-primary-50' : ''} ${!guruji.isAvailable ? 'opacity-60' : ''}`}
                    onClick={() => guruji.isAvailable && setSelectedGuruji(guruji.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <Avatar className="h-12 w-12 border">
                          <AvatarFallback className="bg-primary-100 text-primary-800">
                            {guruji.firstName ? guruji.firstName[0] : ''}
                            {guruji.lastName ? guruji.lastName[0] : ''}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">Pandit {guruji.firstName} {guruji.lastName}</h3>
                          <div className="text-sm text-neutral-500">
                            {guruji.experience || '5'} years exp • {guruji.rating || '4.5'} ★
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center text-sm text-neutral-500">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          {guruji.city || initialCity}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-primary">₹{guruji.pricePerHour}</div>
                          {!guruji.isAvailable && (
                            <Badge variant="outline" className="text-xs mt-1">Not Available</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center p-6 border border-amber-200 bg-amber-50 rounded-lg">
                  <p className="text-amber-800">No Gurujis available within 15km for your selected service. Try a different service or location.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Date and time selection step */}
        {currentStep === 'date' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-primary-50 text-primary p-3 rounded-lg mb-4">
              <div>
                <p className="font-medium">Selected Service & Guruji</p>
                <p className="text-sm">
                  {selectedPuja?.name} with {selectedGurujiData?.name || 'selected Guruji'}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Select Date
              </h3>
              
              <div className="flex overflow-x-auto space-x-2 pb-2">
                {dates.map(date => (
                  <Button
                    key={date.date}
                    variant={selectedDate === date.date ? "default" : "outline"}
                    className="flex-shrink-0 h-auto py-2"
                    onClick={() => setSelectedDate(date.date)}
                  >
                    {date.label}
                  </Button>
                ))}
              </div>
            </div>
            
            {selectedDate && (
              <div className="space-y-2 mt-6">
                <h3 className="font-medium flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Select Time
                </h3>
                
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(time => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      className="text-sm"
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Details form step */}
        {currentStep === 'details' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-primary-50 text-primary p-3 rounded-lg mb-4">
              <div>
                <p className="font-medium">Booking Summary</p>
                <p className="text-sm">
                  {selectedPuja?.name} with {selectedGurujiData ? `Pandit ${selectedGurujiData.firstName} ${selectedGurujiData.lastName}` : 'selected Guruji'}
                </p>
                <p className="text-sm">
                  {selectedDate && new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at {selectedTime}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Location/Address
                </label>
                <Input placeholder="Enter your complete address" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Number of Attendees
                </label>
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-neutral-500" />
                  <Input type="number" min="1" defaultValue="2" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Special Instructions (optional)
                </label>
                <Input placeholder="Any specific requirements or notes" />
              </div>
            </div>
          </div>
        )}
        
        {/* Payment step */}
        {currentStep === 'payment' && (
          <div className="space-y-4">
            <div className="bg-primary-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Service Fee ({selectedPuja?.name})</span>
                  <span>₹{selectedPuja?.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guruji Fee ({selectedGurujiData ? `Pandit ${selectedGurujiData.firstName} ${selectedGurujiData.lastName}` : 'Selected Guruji'})</span>
                  <span>₹{selectedGurujiData?.pricePerHour || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span>₹299</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total Amount</span>
                  <span>₹{(selectedPuja?.price || 0) + (selectedGurujiData?.pricePerHour || 0) + 299}</span>
                </div>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Choose your preferred payment method</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="card">
                  <TabsList className="w-full">
                    <TabsTrigger value="card" className="flex-1">Card</TabsTrigger>
                    <TabsTrigger value="upi" className="flex-1">UPI</TabsTrigger>
                    <TabsTrigger value="cash" className="flex-1">Cash</TabsTrigger>
                  </TabsList>
                  <TabsContent value="card" className="space-y-3 pt-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Card Number
                      </label>
                      <Input placeholder="1234 5678 9012 3456" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Expiry Date
                        </label>
                        <Input placeholder="MM/YY" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          CVV
                        </label>
                        <Input placeholder="123" />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="upi" className="space-y-3 pt-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        UPI ID
                      </label>
                      <Input placeholder="example@upi" />
                    </div>
                  </TabsContent>
                  <TabsContent value="cash" className="pt-3">
                    <p className="text-sm text-neutral-600">
                      Pay cash directly to the Guruji at the time of service. 
                      A booking confirmation will be sent to your phone.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Confirmation step */}
        {currentStep === 'confirmation' && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-neutral-900">Booking Confirmed!</h2>
            
            <p className="text-neutral-600">
              Your puja booking has been confirmed. A confirmation has been sent to your mobile.
            </p>
            
            <Card className="bg-primary-50 text-left mt-8">
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-neutral-500">Service</p>
                  <p className="font-medium">{selectedPuja?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Guruji</p>
                  <p className="font-medium">{selectedGurujiData ? `Pandit ${selectedGurujiData.firstName} ${selectedGurujiData.lastName}` : 'Selected Guruji'}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Date & Time</p>
                  <p className="font-medium">
                    {selectedDate && new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at {selectedTime}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Booking ID</p>
                  <p className="font-medium">GC{Math.floor(100000 + Math.random() * 900000)}</p>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-white">
                <div className="w-full flex justify-between items-center">
                  <span className="text-sm text-neutral-500">Total Amount</span>
                  <span className="font-medium">₹{(selectedPuja?.price || 0) + (selectedGurujiData?.pricePerHour || 0) + 299}</span>
                </div>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
      
      {/* Fixed bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full"
          onClick={goToNextStep}
          disabled={isNextDisabled()}
        >
          {getNextButtonText()}
          {currentStep !== 'confirmation' && <ChevronRight className="ml-1 h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}