import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { Loader2, Calendar, User, CreditCard, Clock, MapPin, Check, X } from 'lucide-react';

export default function GurujiDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  
  // Fetch bookings data
  const { 
    data: bookings, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/guruji/bookings'],
    enabled: !!user,
  });

  // Simulated data for better visualization
  const requestBookings = [
    {
      id: 1,
      pujaName: 'Satyanarayan Puja',
      customerName: 'Rahul Sharma',
      location: 'Mumbai, Maharashtra',
      dateTime: '2023-06-10T17:00:00',
      amount: 1500,
      status: 'pending'
    },
    {
      id: 2,
      pujaName: 'Ganesh Puja',
      customerName: 'Priya Patel',
      location: 'Thane, Maharashtra',
      dateTime: '2023-06-12T10:00:00',
      amount: 1200,
      status: 'pending'
    }
  ];
  
  const upcomingBookings = [
    {
      id: 3,
      pujaName: 'Griha Pravesh Puja',
      customerName: 'Vijay Mehta',
      location: 'Pune, Maharashtra',
      dateTime: '2023-06-15T09:00:00',
      amount: 2500,
      status: 'confirmed'
    }
  ];
  
  const completedBookings = [
    {
      id: 4,
      pujaName: 'Navgraha Shanti Puja',
      customerName: 'Sneha Joshi',
      location: 'Online',
      dateTime: '2023-05-20T11:00:00',
      amount: 1800,
      status: 'completed'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading dashboard data. Please try again later.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 font-poppins">Welcome, Guruji {user?.firstName}!</h1>
        <p className="text-neutral-600">Manage your bookings and services from this dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">New Requests</p>
                <p className="text-3xl font-bold">{requestBookings.length}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-full">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Upcoming</p>
                <p className="text-3xl font-bold">{upcomingBookings.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Completed</p>
                <p className="text-3xl font-bold">{completedBookings.length}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <Check className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Earnings</p>
                <p className="text-3xl font-bold">₹{
                  [...requestBookings, ...upcomingBookings, ...completedBookings]
                    .reduce((total, booking) => total + booking.amount, 0)
                }</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-full">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold font-poppins">Bookings</h2>
      </div>

      <Tabs defaultValue="requests" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="requests">New Requests</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="requests">
          {requestBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="p-3 bg-neutral-100 rounded-full mb-4">
                  <Clock className="h-8 w-8 text-neutral-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No new requests</h3>
                <p className="text-neutral-500 mb-6 text-center">You don't have any new puja booking requests.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {requestBookings.map(booking => (
                <Card key={booking.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                        New Request
                      </Badge>
                      <p className="text-sm text-neutral-500">{formatDate(booking.dateTime)} at {formatTime(booking.dateTime)}</p>
                    </div>
                    <CardTitle className="text-xl mt-2">{booking.pujaName}</CardTitle>
                    <CardDescription className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {booking.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-t pt-3">
                      <div className="flex justify-between mb-2">
                        <span className="text-neutral-500">Customer</span>
                        <span className="font-medium">{booking.customerName}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-neutral-500">Your Earnings</span>
                        <span className="font-medium">₹{Math.floor(booking.amount * 0.8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Platform Fee</span>
                        <span className="font-medium">₹{Math.floor(booking.amount * 0.2)}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-3">
                      <Button variant="outline" size="sm">
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                      <Button size="sm">
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="upcoming">
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="p-3 bg-neutral-100 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-neutral-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No upcoming bookings</h3>
                <p className="text-neutral-500 mb-6 text-center">You don't have any upcoming puja bookings.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {upcomingBookings.map(booking => (
                <Card key={booking.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                        Confirmed
                      </Badge>
                      <p className="text-sm text-neutral-500">{formatDate(booking.dateTime)} at {formatTime(booking.dateTime)}</p>
                    </div>
                    <CardTitle className="text-xl mt-2">{booking.pujaName}</CardTitle>
                    <CardDescription className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {booking.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-t pt-3">
                      <div className="flex justify-between mb-2">
                        <span className="text-neutral-500">Customer</span>
                        <span className="font-medium">{booking.customerName}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-neutral-500">Your Earnings</span>
                        <span className="font-medium">₹{Math.floor(booking.amount * 0.8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Contact</span>
                        <span className="font-medium">Available 4 hours before puja</span>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-3">
                      <Button variant="outline" size="sm">
                        Cancel
                      </Button>
                      <Button size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed">
          {completedBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="p-3 bg-neutral-100 rounded-full mb-4">
                  <Check className="h-8 w-8 text-neutral-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No completed bookings</h3>
                <p className="text-neutral-500 mb-6 text-center">You don't have any completed puja bookings.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {completedBookings.map(booking => (
                <Card key={booking.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                        Completed
                      </Badge>
                      <p className="text-sm text-neutral-500">{formatDate(booking.dateTime)}</p>
                    </div>
                    <CardTitle className="text-xl mt-2">{booking.pujaName}</CardTitle>
                    <CardDescription className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {booking.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-t pt-3">
                      <div className="flex justify-between mb-2">
                        <span className="text-neutral-500">Customer</span>
                        <span className="font-medium">{booking.customerName}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-neutral-500">Earnings</span>
                        <span className="font-medium">₹{Math.floor(booking.amount * 0.8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Rating</span>
                        <span className="font-medium">⭐⭐⭐⭐⭐ 5.0</span>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-poppins">Account Information</h2>
          <Button variant="outline" asChild>
            <Link href="/profile">
              <a>Edit Profile</a>
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Name</span>
                  <span className="font-medium">{user?.firstName} {user?.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Mobile</span>
                  <span className="font-medium">{user?.mobile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Email</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Location</span>
                  <span className="font-medium">Mumbai, Maharashtra</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Service Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Service Area</span>
                  <span className="font-medium">10 km radius</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Online Services</span>
                  <span className="font-medium">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Available Pujas</span>
                  <span className="font-medium">12 pujas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Account Status</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
