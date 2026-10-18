import { useState } from 'react';
import { Link } from 'wouter';
import { 
  Calendar, 
  Clock, 
  User, 
  Star, 
  Bell, 
  Settings, 
  Home,
  PhoneCall
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

// Mock data for upcoming bookings
const upcomingBookings = [
  { 
    id: 'b1', 
    service: 'Satyanarayan Puja', 
    guruji: 'Pandit Ramesh Shastri',
    date: '2023-05-15', 
    time: '10:00 AM', 
    status: 'confirmed',
    amount: 3500
  },
  { 
    id: 'b2', 
    service: 'Griha Pravesh', 
    guruji: 'Pandit Suresh Joshi',
    date: '2023-05-20', 
    time: '09:30 AM', 
    status: 'pending',
    amount: 5200
  }
];

// Mock data for past bookings
const pastBookings = [
  { 
    id: 'b3', 
    service: 'Ganesh Puja', 
    guruji: 'Acharya Vishal Sharma',
    date: '2023-04-10', 
    time: '11:00 AM', 
    status: 'completed',
    amount: 2500,
    rating: 5
  },
  { 
    id: 'b4', 
    service: 'Navgraha Shanti', 
    guruji: 'Pandit Kailash Trivedi',
    date: '2023-03-25', 
    time: '10:30 AM', 
    status: 'completed',
    amount: 3800,
    rating: 4
  }
];

// Mock user profile data
const userProfile = {
  name: 'Amit Sharma',
  email: 'amit.sharma@example.com',
  phone: '+91 9876543210',
  address: '123, ABC Colony, Mumbai, Maharashtra',
  joinedOn: '2023-01-15',
  totalBookings: 4,
  profileComplete: 80
};

// Status colors mapping
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800'
};

export function MobileDashboard() {
  const [activeTab, setActiveTab] = useState('upcoming');
  
  // Format date string to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };
  
  return (
    <div className="pb-16">
      {/* User profile summary */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-14 w-14 border-2 border-white">
            <AvatarFallback className="bg-primary-100 text-primary-800">
              {userProfile.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{userProfile.name}</h1>
            <p className="text-sm text-primary-100">{userProfile.phone}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white bg-opacity-10 rounded-lg p-2 text-center">
            <div className="text-xl font-bold">{userProfile.totalBookings}</div>
            <div className="text-xs">Bookings</div>
          </div>
          <Link href="/profile" className="bg-white bg-opacity-10 rounded-lg p-2 text-center">
            <div className="flex justify-center">
              <User className="h-5 w-5" />
            </div>
            <div className="text-xs mt-1">Profile</div>
          </Link>
          <Link href="/notifications" className="bg-white bg-opacity-10 rounded-lg p-2 text-center">
            <div className="flex justify-center">
              <Bell className="h-5 w-5" />
            </div>
            <div className="text-xs mt-1">Alerts</div>
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="p-4 bg-neutral-50 border-b">
        <div className="grid grid-cols-2 gap-3">
          <Button asChild className="h-auto py-4">
            <Link href="/booking">
              <Calendar className="h-5 w-5 mb-1" />
              <span className="block">Book a Puja</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4">
            <Link href="/chat">
              <PhoneCall className="h-5 w-5 mb-1" />
              <span className="block">Consult a Guruji</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Bookings tab interface */}
      <div className="px-4 py-6">
        <Tabs defaultValue="upcoming" onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="upcoming" className="flex-1">Upcoming</TabsTrigger>
            <TabsTrigger value="past" className="flex-1">Past</TabsTrigger>
            <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map(booking => (
                <Card key={booking.id} className="overflow-hidden">
                  <CardHeader className="py-3 px-4 bg-neutral-50 border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{booking.service}</CardTitle>
                      <CardDescription>{booking.guruji}</CardDescription>
                    </div>
                    <Badge className={statusColors[booking.status]} variant="outline">
                      {booking.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center text-sm">
                      <Calendar className="mr-2 h-4 w-4 text-neutral-500" />
                      <span>{formatDate(booking.date)}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="mr-2 h-4 w-4 text-neutral-500" />
                      <span>{booking.time}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t px-4 py-3 bg-neutral-50 flex justify-between">
                    <span className="text-sm font-medium">₹{booking.amount}</span>
                    <Button size="sm" variant="outline">View Details</Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-neutral-500">No upcoming bookings found</p>
                <Button asChild className="mt-4">
                  <Link href="/booking">Book a Puja</Link>
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="past" className="space-y-4">
            {pastBookings.length > 0 ? (
              pastBookings.map(booking => (
                <Card key={booking.id} className="overflow-hidden">
                  <CardHeader className="py-3 px-4 bg-neutral-50 border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{booking.service}</CardTitle>
                      <CardDescription>{booking.guruji}</CardDescription>
                    </div>
                    <Badge className={statusColors[booking.status]} variant="outline">
                      {booking.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center text-sm">
                      <Calendar className="mr-2 h-4 w-4 text-neutral-500" />
                      <span>{formatDate(booking.date)}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="mr-2 h-4 w-4 text-neutral-500" />
                      <span>{booking.time}</span>
                    </div>
                    
                    <div className="flex items-center text-sm pt-1">
                      <span className="text-neutral-500 mr-2">Your Rating:</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-4 w-4 ${i < (booking.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-neutral-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t px-4 py-3 bg-neutral-50 flex justify-between">
                    <span className="text-sm font-medium">₹{booking.amount}</span>
                    <div className="space-x-2">
                      <Button size="sm" variant="outline">Book Again</Button>
                      <Button size="sm" variant="outline">View Details</Button>
                    </div>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-neutral-500">No past bookings found</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your personal details and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-500">Full Name</span>
                    <span className="font-medium">{userProfile.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-500">Email</span>
                    <span className="font-medium">{userProfile.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-500">Phone</span>
                    <span className="font-medium">{userProfile.phone}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-500">Address</span>
                    <span className="font-medium text-right max-w-[200px]">{userProfile.address}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-500">Member Since</span>
                    <span className="font-medium">{formatDate(userProfile.joinedOn)}</span>
                  </div>
                </div>
                
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Profile Completion</span>
                    <span className="text-sm text-neutral-500">{userProfile.profileComplete}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${userProfile.profileComplete}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-40">
        <div className="flex justify-around">
          <Link href="/" className="flex flex-col items-center p-3">
            <Home className="h-5 w-5 text-neutral-600" />
            <span className="text-xs mt-1 text-neutral-600">Home</span>
          </Link>
          <Link href="/booking" className="flex flex-col items-center p-3">
            <Calendar className="h-5 w-5 text-neutral-600" />
            <span className="text-xs mt-1 text-neutral-600">Book</span>
          </Link>
          <Link href="/dashboard" className="flex flex-col items-center p-3">
            <User className="h-5 w-5 text-primary" />
            <span className="text-xs mt-1 text-primary">Dashboard</span>
          </Link>
          <Link href="/chat" className="flex flex-col items-center p-3">
            <PhoneCall className="h-5 w-5 text-neutral-600" />
            <span className="text-xs mt-1 text-neutral-600">Consult</span>
          </Link>
        </div>
      </div>
    </div>
  );
}