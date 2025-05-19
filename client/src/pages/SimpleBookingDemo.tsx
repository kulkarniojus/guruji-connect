import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BellIcon, CheckIcon, XIcon, UserIcon, BookOpenIcon } from 'lucide-react';

const SimpleBookingDemo = () => {
  const [activeTab, setActiveTab] = useState('customer');
  const [currentGuruji, setCurrentGuruji] = useState('');
  const [bookingStatus, setBookingStatus] = useState('pending');
  const [requestsSent, setRequestsSent] = useState(false);
  const [customerNotifications, setCustomerNotifications] = useState<string[]>([]);
  const [gurujiNotifications, setGurujiNotifications] = useState<{[key: string]: string[]}>({
    'guru1': [],
    'guru2': [],
    'guru3': []
  });
  const [responseMessage, setResponseMessage] = useState('');

  const sendRequests = () => {
    if (bookingStatus !== 'pending') return;
    
    setBookingStatus('pending_approval');
    setRequestsSent(true);
    
    // Add notification for customer
    setCustomerNotifications([
      'Your booking request has been sent to nearby gurujis.',
      ...customerNotifications
    ]);
    
    // Add notifications for all gurujis
    setGurujiNotifications({
      'guru1': ['New booking request received for Demo Griha Pravesh ceremony.', ...gurujiNotifications.guru1],
      'guru2': ['New booking request received for Demo Griha Pravesh ceremony.', ...gurujiNotifications.guru2],
      'guru3': ['New booking request received for Demo Griha Pravesh ceremony.', ...gurujiNotifications.guru3],
    });
  };
  
  const resetDemo = () => {
    setBookingStatus('pending');
    setRequestsSent(false);
    setCustomerNotifications([]);
    setGurujiNotifications({
      'guru1': [],
      'guru2': [],
      'guru3': []
    });
    setResponseMessage('');
  };
  
  const handleGurujiChange = (gurujiId: string) => {
    setCurrentGuruji(gurujiId);
  };
  
  const acceptRequest = () => {
    if (!currentGuruji || bookingStatus !== 'pending_approval') return;
    
    setBookingStatus('confirmed');
    
    // Add notification for customer
    setCustomerNotifications([
      `Your booking has been accepted by ${currentGuruji.replace('guru', 'Guruji ')}!`,
      ...customerNotifications
    ]);
    
    // Add notifications for other gurujis
    const updatedNotifications = {...gurujiNotifications};
    Object.keys(updatedNotifications).forEach(gurujiId => {
      if (gurujiId !== currentGuruji) {
        updatedNotifications[gurujiId] = [
          'A booking request you received has been accepted by another guruji.',
          ...updatedNotifications[gurujiId]
        ];
      }
    });
    
    setGurujiNotifications(updatedNotifications);
  };
  
  const declineRequest = () => {
    if (!currentGuruji || bookingStatus !== 'pending_approval') return;
    
    // Add notification for customer
    setCustomerNotifications([
      `${currentGuruji.replace('guru', 'Guruji ')} has declined your booking request.`,
      ...customerNotifications
    ]);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'pending_approval':
        return <Badge className="bg-blue-100 text-blue-800">Pending Approval</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Booking Notification Demo</h1>
        <Button variant="outline" onClick={resetDemo}>Reset Demo</Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="customer">
            <UserIcon className="w-4 h-4 mr-2" />
            Customer View
          </TabsTrigger>
          <TabsTrigger value="guruji">
            <BookOpenIcon className="w-4 h-4 mr-2" />
            Guruji View
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="customer" className="space-y-6">
          {/* Customer's booking */}
          <Card>
            <CardHeader>
              <CardTitle>Demo Booking</CardTitle>
              <CardDescription>Griha Pravesh Ceremony</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p>{new Date(Date.now() + 86400000).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p>10:00 AM</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p>Mumbai, Maharashtra</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div className="mt-1">{getStatusBadge(bookingStatus)}</div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={sendRequests}
                disabled={bookingStatus !== 'pending'}
              >
                Send Booking Request to Gurujis
              </Button>
            </CardFooter>
          </Card>
          
          {/* Customer's notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {customerNotifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No notifications yet
                </div>
              ) : (
                <div className="space-y-4">
                  {customerNotifications.map((msg, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border rounded">
                      <BellIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <p>{msg}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="guruji" className="space-y-6">
          {/* Guruji selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Guruji</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button 
                  variant={currentGuruji === 'guru1' ? 'default' : 'outline'} 
                  onClick={() => handleGurujiChange('guru1')}
                >
                  Guruji 1
                </Button>
                <Button 
                  variant={currentGuruji === 'guru2' ? 'default' : 'outline'} 
                  onClick={() => handleGurujiChange('guru2')}
                >
                  Guruji 2
                </Button>
                <Button 
                  variant={currentGuruji === 'guru3' ? 'default' : 'outline'} 
                  onClick={() => handleGurujiChange('guru3')}
                >
                  Guruji 3
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Booking requests */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {!currentGuruji ? (
                <Alert>
                  <AlertTitle>No guruji selected</AlertTitle>
                  <AlertDescription>
                    Please select a guruji to view booking requests
                  </AlertDescription>
                </Alert>
              ) : !requestsSent ? (
                <Alert>
                  <AlertTitle>No requests available</AlertTitle>
                  <AlertDescription>
                    Switch to Customer view and send booking requests first
                  </AlertDescription>
                </Alert>
              ) : bookingStatus === 'confirmed' && (
                <Alert>
                  <AlertTitle>Booking already confirmed</AlertTitle>
                  <AlertDescription>
                    This booking has already been confirmed
                  </AlertDescription>
                </Alert>
              )}
              
              {currentGuruji && requestsSent && bookingStatus === 'pending_approval' && (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Demo Griha Pravesh</h3>
                    {getStatusBadge('pending_approval')}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Customer</p>
                      <p>Demo Customer</p>
                    </div>
                    <div>
                      <p className="font-medium">Date & Time</p>
                      <p>{new Date(Date.now() + 86400000).toLocaleDateString()} at 10:00 AM</p>
                    </div>
                    <div>
                      <p className="font-medium">Location</p>
                      <p>Mumbai, Maharashtra</p>
                    </div>
                    <div>
                      <p className="font-medium">Amount</p>
                      <p>₹2,000</p>
                    </div>
                  </div>
                  
                  <div className="pt-3">
                    <p className="font-medium text-sm mb-2">Response Message (Optional)</p>
                    <Textarea 
                      placeholder="Add any notes or special instructions..."
                      value={responseMessage}
                      onChange={e => setResponseMessage(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-3">
                    <Button className="flex-1" onClick={acceptRequest}>
                      <CheckIcon className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={declineRequest}>
                      <XIcon className="w-4 h-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Guruji's notifications */}
          {currentGuruji && (
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                {gurujiNotifications[currentGuruji].length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No notifications yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gurujiNotifications[currentGuruji].map((msg, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 border rounded">
                        <BellIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <p>{msg}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date().toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimpleBookingDemo;