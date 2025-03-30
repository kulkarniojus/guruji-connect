import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'wouter';
import { Loader2, Calendar, User, CreditCard, FileText, ChevronRight } from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  
  // Fetch bookings data
  const { 
    data: bookings, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/bookings'],
    enabled: !!user,
  });

  // Separate bookings by status
  const upcomingBookings = bookings?.filter((booking: any) => 
    ['confirmed', 'pending'].includes(booking.status)
  ) || [];
  
  const pastBookings = bookings?.filter((booking: any) => 
    ['completed', 'cancelled'].includes(booking.status)
  ) || [];

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 font-poppins">Welcome, {user?.firstName}!</h1>
        <p className="text-neutral-600">Manage your bookings and account settings here.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Total Bookings</p>
                <p className="text-3xl font-bold">{bookings?.length || 0}</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-full">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Upcoming Bookings</p>
                <p className="text-3xl font-bold">{upcomingBookings.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Spent on Pujas</p>
                <p className="text-3xl font-bold">₹{bookings?.reduce((total: number, booking: any) => total + booking.amount, 0) || 0}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <CreditCard className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-poppins">Your Bookings</h2>
        <Button asChild>
          <Link href="/booking">Book a Puja</Link>
        </Button>
      </div>

      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="p-3 bg-neutral-100 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-neutral-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No upcoming bookings</h3>
                <p className="text-neutral-500 mb-6 text-center">You don't have any upcoming puja bookings.</p>
                <Button asChild>
                  <Link href="/booking">Book a Puja</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* This would show actual booking data when connected to backend */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm font-medium text-green-500">Confirmed</span>
                    </div>
                    <p className="text-sm text-neutral-500">Today at 5:00 PM</p>
                  </div>
                  <CardTitle className="text-xl mt-2">Satyanarayan Puja</CardTitle>
                  <CardDescription>Mumbai, Maharashtra</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-t pt-3">
                    <div className="flex justify-between mb-2">
                      <span className="text-neutral-500">Amount</span>
                      <span className="font-medium">₹1,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Guruji</span>
                      <span className="font-medium">Pandit Ramesh Ji</span>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" className="mr-2">Cancel</Button>
                    <Button size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                      <span className="text-sm font-medium text-amber-500">Pending</span>
                    </div>
                    <p className="text-sm text-neutral-500">Tomorrow at 10:00 AM</p>
                  </div>
                  <CardTitle className="text-xl mt-2">Ganesh Puja</CardTitle>
                  <CardDescription>Online Consultation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-t pt-3">
                    <div className="flex justify-between mb-2">
                      <span className="text-neutral-500">Amount</span>
                      <span className="font-medium">₹1,200</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Status</span>
                      <span className="font-medium">Awaiting Guruji</span>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" className="mr-2">Cancel</Button>
                    <Button size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past">
          {pastBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="p-3 bg-neutral-100 rounded-full mb-4">
                  <FileText className="h-8 w-8 text-neutral-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No past bookings</h3>
                <p className="text-neutral-500 mb-6 text-center">You don't have any past puja bookings.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* This would show actual booking data when connected to backend */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                      <span className="text-sm font-medium text-blue-500">Completed</span>
                    </div>
                    <p className="text-sm text-neutral-500">15 days ago</p>
                  </div>
                  <CardTitle className="text-xl mt-2">Griha Pravesh Puja</CardTitle>
                  <CardDescription>Pune, Maharashtra</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-t pt-3">
                    <div className="flex justify-between mb-2">
                      <span className="text-neutral-500">Amount</span>
                      <span className="font-medium">₹2,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Guruji</span>
                      <span className="font-medium">Pandit Suresh Ji</span>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" className="mr-2">Book Again</Button>
                    <Button size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-poppins">Need Help?</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <Button variant="ghost" className="w-full justify-between" asChild>
                <Link href="/faq">
                  <div className="flex flex-col items-start">
                    <h3 className="text-lg font-semibold mb-1">FAQ</h3>
                    <p className="text-neutral-500 text-sm text-left">Find answers to common questions</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <Button variant="ghost" className="w-full justify-between" asChild>
                <Link href="/contact">
                  <div className="flex flex-col items-start">
                    <h3 className="text-lg font-semibold mb-1">Contact Support</h3>
                    <p className="text-neutral-500 text-sm text-left">Get help from our team</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <Button variant="ghost" className="w-full justify-between" asChild>
                <Link href="/profile">
                  <div className="flex flex-col items-start">
                    <h3 className="text-lg font-semibold mb-1">Profile Settings</h3>
                    <p className="text-neutral-500 text-sm text-left">Update your account information</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
