import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckIcon, XIcon, RefreshCcw, BellIcon, UserIcon, BookOpenIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Demo data types
interface DemoCredential {
  role: string;
  email: string;
  password: string;
}

interface DemoUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'customer' | 'guruji' | 'admin';
}

interface DemoBooking {
  id: number;
  customerId: number;
  pujaId: number;
  date: string;
  time: string;
  address: string;
  city: string;
  status: string;
  amount: number;
  gurujiId?: number;
}

interface DemoPuja {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
}

interface DemoBookingRequest {
  id: number;
  bookingId: number;
  gurujiId: number;
  status: string;
  createdAt: string;
  booking?: DemoBooking;
  puja?: DemoPuja;
  customer?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface DemoNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// Mock data for demo
const mockDemoCredentials: DemoCredential[] = [
  {
    role: 'customer',
    email: 'demo.customer@example.com',
    password: 'demo123',
  },
  {
    role: 'guruji1',
    email: 'demo.guruji1@example.com',
    password: 'demo123',
  },
  {
    role: 'guruji2',
    email: 'demo.guruji2@example.com',
    password: 'demo123',
  },
  {
    role: 'guruji3',
    email: 'demo.guruji3@example.com',
    password: 'demo123',
  },
];

const mockCustomer: DemoUser = {
  id: 1,
  firstName: 'Demo',
  lastName: 'Customer',
  email: 'demo.customer@example.com',
  role: 'customer',
};

const mockGurujiUsers: DemoUser[] = [
  {
    id: 2,
    firstName: 'Demo Guruji 1',
    lastName: 'Sharma',
    email: 'demo.guruji1@example.com',
    role: 'guruji',
  },
  {
    id: 3,
    firstName: 'Demo Guruji 2',
    lastName: 'Sharma',
    email: 'demo.guruji2@example.com',
    role: 'guruji',
  },
  {
    id: 4,
    firstName: 'Demo Guruji 3',
    lastName: 'Sharma',
    email: 'demo.guruji3@example.com',
    role: 'guruji',
  },
];

const mockPuja: DemoPuja = {
  id: 1,
  name: 'Demo Griha Pravesh',
  description: 'A demo housewarming ceremony performed before entering a new home.',
  price: 2000,
  duration: 180,
};

const mockBooking: DemoBooking = {
  id: 1,
  customerId: 1,
  pujaId: 1,
  date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  time: '10:00 AM',
  address: '123 Demo Street, Apartment 4B',
  city: 'Mumbai',
  status: 'pending',
  amount: 2000,
};

const BookingNotificationDemo: React.FC = () => {
  const [demoCredentials] = useState<DemoCredential[]>(mockDemoCredentials);
  const [booking, setBooking] = useState<DemoBooking>(mockBooking);
  const [activeTab, setActiveTab] = useState('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [currentGuruji, setCurrentGuruji] = useState<string | null>(null);
  const [bookingRequests, setBookingRequests] = useState<DemoBookingRequest[]>([]);
  const [customerNotifications, setCustomerNotifications] = useState<DemoNotification[]>([]);
  const [gurujiNotifications, setGurujiNotifications] = useState<DemoNotification[]>([]);
  const [responseMessage, setResponseMessage] = useState('');
  
  const sendBookingRequests = async () => {
    try {
      setIsSending(true);
      
      // Create demo booking requests
      const requests: DemoBookingRequest[] = mockGurujiUsers.map((guruji, index) => ({
        id: 100 + index,
        bookingId: mockBooking.id,
        gurujiId: guruji.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
        booking: mockBooking,
        puja: mockPuja,
        customer: {
          id: mockCustomer.id,
          firstName: mockCustomer.firstName,
          lastName: mockCustomer.lastName,
          email: mockCustomer.email,
        },
      }));
      
      // Update booking status
      const updatedBooking = { ...booking, status: 'pending_approval' };
      setBooking(updatedBooking);
      
      // Create notifications for customer
      const customerNotification: DemoNotification = {
        id: Date.now(),
        userId: mockCustomer.id,
        title: 'Booking Request Sent',
        message: 'Your booking request has been sent to available gurujis in your area.',
        type: 'booking_sent',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      
      setCustomerNotifications(prev => [customerNotification, ...prev]);
      
      // Create notifications for gurujis
      const gurujiNotificationsNew = mockGurujiUsers.map((guruji, index) => ({
        id: Date.now() + index + 1,
        userId: guruji.id,
        title: 'New Booking Request',
        message: 'You have a new booking request for a ceremony.',
        type: 'booking_request',
        isRead: false,
        createdAt: new Date().toISOString(),
      }));
      
      // Set demo data
      setBookingRequests(requests);
      
      toast({
        title: "Booking Requests Sent",
        description: `${requests.length} booking requests have been sent to gurujis.`,
      });
    } catch (error) {
      console.error('Error sending booking requests:', error);
      toast({
        title: "Sending Failed",
        description: "Failed to send booking requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const resetDemoBooking = async () => {
    try {
      setIsResetting(true);
      
      // Reset booking to pending state
      setBooking({ ...mockBooking, status: 'pending', gurujiId: undefined });
      setBookingRequests([]);
      setCustomerNotifications([]);
      setGurujiNotifications([]);
      
      toast({
        title: "Demo Reset",
        description: "Demo booking has been reset to initial state.",
      });
    } catch (error) {
      console.error('Error resetting demo:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset demo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  const fetchGurujiBookingRequests = (email: string) => {
    try {
      setIsLoading(true);
      
      const guruji = mockGurujiUsers.find(g => g.email === email);
      if (!guruji) return;
      
      const gurujiRequests = bookingRequests.filter(r => r.gurujiId === guruji.id);
      setGurujiNotifications(prevNotifications => {
        // Filter to show only notifications for this guruji
        return prevNotifications.filter(n => n.userId === guruji.id);
      });
      
    } catch (error) {
      console.error('Error fetching guruji booking requests:', error);
      toast({
        title: "Fetching Failed",
        description: "Failed to fetch booking requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const respondToBookingRequest = async (requestId: number, response: 'accept' | 'decline') => {
    try {
      if (!currentGuruji) {
        toast({
          title: "Error",
          description: "Please select a guruji first.",
          variant: "destructive",
        });
        return;
      }
      
      setIsLoading(true);
      const guruji = mockGurujiUsers.find(g => g.email === currentGuruji);
      if (!guruji) return;
      
      // Find the request
      const request = bookingRequests.find(r => r.id === requestId);
      if (!request) return;
      
      if (response === 'accept') {
        // Update booking
        setBooking(prev => ({
          ...prev,
          status: 'confirmed',
          gurujiId: guruji.id,
        }));
        
        // Update request status
        setBookingRequests(prev => 
          prev.map(r => r.id === requestId 
            ? { ...r, status: 'accepted' } 
            : { ...r, status: 'expired' }
          )
        );
        
        // Create notification for customer
        const customerNotification: DemoNotification = {
          id: Date.now(),
          userId: mockCustomer.id,
          title: 'Booking Confirmed',
          message: `Your booking has been accepted by ${guruji.firstName} ${guruji.lastName}.`,
          type: 'booking_confirmed',
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        
        setCustomerNotifications(prev => [customerNotification, ...prev]);
        
        // Create notifications for other gurujis
        mockGurujiUsers.forEach(otherGuruji => {
          if (otherGuruji.id !== guruji.id) {
            const notification: DemoNotification = {
              id: Date.now() + otherGuruji.id,
              userId: otherGuruji.id,
              title: 'Booking Already Accepted',
              message: 'A booking request you received has been accepted by another guruji.',
              type: 'booking_expired',
              isRead: false,
              createdAt: new Date().toISOString(),
            };
            
            setGurujiNotifications(prev => [notification, ...prev]);
          }
        });
        
        toast({
          title: "Request Accepted",
          description: "You have successfully accepted the booking request.",
        });
      } else {
        // Update request status
        setBookingRequests(prev => 
          prev.map(r => r.id === requestId 
            ? { ...r, status: 'declined' } 
            : r
          )
        );
        
        // Check if all requests are declined
        const updatedRequests = bookingRequests.map(r => 
          r.id === requestId ? { ...r, status: 'declined' } : r
        );
        
        const allDeclined = updatedRequests.every(r => 
          r.status === 'declined' || r.status === 'expired' || r.status === 'cancelled'
        );
        
        if (allDeclined) {
          setBooking(prev => ({
            ...prev,
            status: 'pending',
          }));
          
          // Notify customer
          const customerNotification: DemoNotification = {
            id: Date.now(),
            userId: mockCustomer.id,
            title: 'Booking Update',
            message: `We couldn't find an available guruji for your booking. Please try again later or choose a different date/time.`,
            type: 'booking_update',
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          
          setCustomerNotifications(prev => [customerNotification, ...prev]);
        }
        
        toast({
          title: "Request Declined",
          description: "You have declined the booking request.",
        });
      }
      
      setResponseMessage('');
    } catch (error) {
      console.error('Error responding to booking request:', error);
      toast({
        title: "Response Failed",
        description: "Failed to respond to booking request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGurujiChange = (email: string) => {
    setCurrentGuruji(email);
    fetchGurujiBookingRequests(email);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending Approval</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Confirmed</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Accepted</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Declined</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Booking Notification Demo</h1>
          <p className="text-gray-500">Test the booking request notification flow in demo mode.</p>
        </div>
        <Button 
          onClick={resetDemoBooking} 
          variant="outline" 
          disabled={isResetting}
        >
          {isResetting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
          Reset Demo
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="customer">
            <UserIcon className="h-4 w-4 mr-2" />
            Customer View
          </TabsTrigger>
          <TabsTrigger value="guruji">
            <BookOpenIcon className="h-4 w-4 mr-2" />
            Guruji View
          </TabsTrigger>
        </TabsList>
        
        {/* Customer View */}
        <TabsContent value="customer" className="space-y-6">
          {/* Demo Credentials */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Demo Account</CardTitle>
              <CardDescription>Use this account to login as a customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm">{demoCredentials[0].email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Password</p>
                    <p className="text-sm">{demoCredentials[0].password}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Customer Booking */}
          <Card>
            <CardHeader>
              <CardTitle>Demo Booking</CardTitle>
              <CardDescription>Customer's booking information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Booking ID</p>
                    <p className="text-sm">{booking.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <div className="mt-1">{getStatusBadge(booking.status)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm">{new Date(booking.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm">{booking.time}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm">{booking.address}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">City</p>
                    <p className="text-sm">{booking.city}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Amount</p>
                    <p className="text-sm">₹{booking.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Guruji ID</p>
                    <p className="text-sm">{booking.gurujiId || 'Not assigned yet'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={sendBookingRequests}
                disabled={isSending || booking.status !== 'pending'}
              >
                {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Send Booking Requests to Gurujis
              </Button>
            </CardFooter>
          </Card>
          
          {/* Customer Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notifications</CardTitle>
                <Badge variant="outline" className="ml-2">
                  {customerNotifications.length}
                </Badge>
              </div>
              <CardDescription>Customer's notifications for bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                {customerNotifications.length > 0 ? (
                  <div className="space-y-4">
                    {customerNotifications.map((notification) => (
                      <div key={notification.id} className="flex items-start gap-4 p-3 rounded-lg border">
                        <BellIcon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium">{notification.title}</h4>
                          <p className="text-sm text-gray-500">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-gray-500">No notifications yet.</p>
                    <p className="text-gray-400 text-sm">Start the booking process to receive notifications.</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Guruji View */}
        <TabsContent value="guruji" className="space-y-6">
          {/* Guruji Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Guruji</CardTitle>
              <CardDescription>Choose a guruji to view their booking requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {demoCredentials.filter(c => c.role.includes('guruji')).map((credential) => (
                  <Button
                    key={credential.email}
                    variant={currentGuruji === credential.email ? "default" : "outline"}
                    onClick={() => handleGurujiChange(credential.email)}
                  >
                    {credential.role}
                  </Button>
                ))}
              </div>
              
              {currentGuruji && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm">{currentGuruji}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Password</p>
                      <p className="text-sm">{demoCredentials.find(c => c.email === currentGuruji)?.password}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Guruji's Booking Requests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Booking Requests</CardTitle>
                <Badge variant="outline" className="ml-2">
                  {currentGuruji 
                    ? bookingRequests.filter(r => {
                        const guruji = mockGurujiUsers.find(g => g.email === currentGuruji);
                        return guruji && r.gurujiId === guruji.id && r.status === 'pending';
                      }).length 
                    : 0
                  }
                </Badge>
              </div>
              <CardDescription>Booking requests sent to this guruji</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : !currentGuruji ? (
                <Alert>
                  <AlertTitle>No guruji selected</AlertTitle>
                  <AlertDescription>
                    Please select a guruji above to view their booking requests.
                  </AlertDescription>
                </Alert>
              ) : bookingRequests.filter(r => {
                  const guruji = mockGurujiUsers.find(g => g.email === currentGuruji);
                  return guruji && r.gurujiId === guruji.id;
                }).length === 0 ? (
                <Alert>
                  <AlertTitle>No booking requests</AlertTitle>
                  <AlertDescription>
                    This guruji has no booking requests yet. Go to the Customer view and send booking requests.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {bookingRequests
                      .filter(request => {
                        const guruji = mockGurujiUsers.find(g => g.email === currentGuruji);
                        return guruji && request.gurujiId === guruji.id;
                      })
                      .map((request) => (
                        <Card key={request.id} className="border border-gray-200">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-lg">{request.puja?.name || 'Unnamed Puja'}</CardTitle>
                              {getStatusBadge(request.status)}
                            </div>
                            <CardDescription>
                              Request ID: {request.id} • Created: {new Date(request.createdAt).toLocaleString()}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium">Customer</p>
                                <p className="text-sm">{request.customer?.firstName} {request.customer?.lastName}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Date & Time</p>
                                <p className="text-sm">
                                  {request.booking ? 
                                    `${new Date(request.booking.date).toLocaleDateString()} at ${request.booking.time}` : 
                                    'Not specified'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-2 grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium">Location</p>
                                <p className="text-sm">{request.booking?.city || 'Not specified'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Amount</p>
                                <p className="text-sm">₹{request.booking?.amount || 0}</p>
                              </div>
                            </div>
                            
                            {request.status === 'pending' && (
                              <>
                                <Separator className="my-4" />
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Response Message (Optional)</p>
                                  <Textarea
                                    placeholder="Enter any specific notes or information..."
                                    value={responseMessage}
                                    onChange={(e) => setResponseMessage(e.target.value)}
                                    className="h-20"
                                  />
                                </div>
                              </>
                            )}
                          </CardContent>
                          
                          {request.status === 'pending' && (
                            <CardFooter className="flex gap-2">
                              <Button
                                className="flex-1"
                                onClick={() => respondToBookingRequest(request.id, 'accept')}
                                disabled={isLoading}
                              >
                                <CheckIcon className="w-4 h-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                className="flex-1"
                                variant="outline"
                                onClick={() => respondToBookingRequest(request.id, 'decline')}
                                disabled={isLoading}
                              >
                                <XIcon className="w-4 h-4 mr-2" />
                                Decline
                              </Button>
                            </CardFooter>
                          )}
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          
          {/* Guruji Notifications */}
          {currentGuruji && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Notifications</CardTitle>
                  <Badge variant="outline" className="ml-2">
                    {gurujiNotifications.filter(n => {
                      const guruji = mockGurujiUsers.find(g => g.email === currentGuruji);
                      return guruji && n.userId === guruji.id;
                    }).length}
                  </Badge>
                </div>
                <CardDescription>Guruji's notifications for bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  {gurujiNotifications.filter(n => {
                    const guruji = mockGurujiUsers.find(g => g.email === currentGuruji);
                    return guruji && n.userId === guruji.id;
                  }).length > 0 ? (
                    <div className="space-y-4">
                      {gurujiNotifications
                        .filter(notification => {
                          const guruji = mockGurujiUsers.find(g => g.email === currentGuruji);
                          return guruji && notification.userId === guruji.id;
                        })
                        .map((notification) => (
                          <div key={notification.id} className="flex items-start gap-4 p-3 rounded-lg border">
                            <BellIcon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                            <div>
                              <h4 className="text-sm font-medium">{notification.title}</h4>
                              <p className="text-sm text-gray-500">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-500">No notifications for this guruji yet.</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BookingNotificationDemo;