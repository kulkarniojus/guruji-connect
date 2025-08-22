import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  Loader2
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
  
  // Fetch available pujas from API (same as desktop version)
  const { data: services = [], isLoading: isServicesLoading } = useQuery<any[]>({
    queryKey: ['/api/pujas'],
  });
  
  // Mock data for Guruji selection
  const gurujis = [
    { id: 1, name: 'Pandit Ramesh Shastri', experience: 15, rating: 4.9, price: 2500, location: 'Mumbai', specialty: 'Vastu', availability: true },
    { id: 2, name: 'Pandit Suresh Joshi', experience: 20, rating: 4.8, price: 3000, location: 'Delhi', specialty: 'Vedic', availability: true },
    { id: 3, name: 'Pandit Kailash Trivedi', experience: 12, rating: 4.7, price: 2200, location: 'Pune', specialty: 'Jyotish', availability: false },
    { id: 4, name: 'Acharya Vishal Sharma', experience: 18, rating: 4.9, price: 2800, location: 'Bangalore', specialty: 'Tantra', availability: true }
  ];
  
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
  
  const selectedServiceData = selectedService ? services.find(s => s.id === selectedService) : null;
  const selectedGurujiData = selectedGuruji ? gurujis.find(g => g.id === selectedGuruji) : null;
  
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
            <p className="text-neutral-600 mb-4">Select the service you need:</p>
            
            {isServicesLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {services.map(service => (
                  <Card 
                    key={service.id}
                    className={`cursor-pointer transition-all hover:border-primary ${selectedService === service.id ? 'border-primary ring-2 ring-primary-50' : ''}`}
                    onClick={() => setSelectedService(service.id)}
                  >
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{service.name}</h3>
                        <div className="text-sm text-neutral-500">
                          <span>{service.duration} min</span> • 
                          <span className="ml-1 capitalize">{service.type}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-primary">₹{service.basePrice || service.price}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Guruji selection step */}
        {currentStep === 'guruji' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-primary-50 text-primary p-3 rounded-lg mb-4">
              <div>
                <p className="font-medium">Selected Service</p>
                <p className="text-sm">{selectedServiceData?.name} • ₹{selectedServiceData?.price}</p>
              </div>
            </div>
            
            <p className="text-neutral-600 mb-2">Choose a Guruji for your service:</p>
            
            <div className="space-y-3">
              {gurujis.map(guruji => (
                <Card 
                  key={guruji.id}
                  className={`cursor-pointer transition-all hover:border-primary ${selectedGuruji === guruji.id ? 'border-primary ring-2 ring-primary-50' : ''} ${!guruji.availability ? 'opacity-60' : ''}`}
                  onClick={() => guruji.availability && setSelectedGuruji(guruji.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Avatar className="h-12 w-12 border">
                        <AvatarFallback className="bg-primary-100 text-primary-800">
                          {guruji.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{guruji.name}</h3>
                        <div className="text-sm text-neutral-500">
                          {guruji.experience} years exp • {guruji.rating} ★
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center text-sm text-neutral-500">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        {guruji.location}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-primary">₹{guruji.price}</div>
                        {!guruji.availability && (
                          <Badge variant="outline" className="text-xs mt-1">Not Available</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                  {selectedServiceData?.name} with {selectedGurujiData?.name}
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
                  {selectedServiceData?.name} with {selectedGurujiData?.name}
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
                  <span>Service Fee ({selectedServiceData?.name})</span>
                  <span>₹{selectedServiceData?.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guruji Fee ({selectedGurujiData?.name})</span>
                  <span>₹{selectedGurujiData?.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span>₹299</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total Amount</span>
                  <span>₹{(selectedServiceData?.price || 0) + (selectedGurujiData?.price || 0) + 299}</span>
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
                  <p className="font-medium">{selectedServiceData?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Guruji</p>
                  <p className="font-medium">{selectedGurujiData?.name}</p>
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
                  <span className="font-medium">₹{(selectedServiceData?.price || 0) + (selectedGurujiData?.price || 0) + 299}</span>
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