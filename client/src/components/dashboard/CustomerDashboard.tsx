import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { Loader2, Calendar, User, CreditCard, FileText, ChevronRight, Star, CheckCircle2 } from 'lucide-react';
import { RatingDialog, RatingDisplay } from '@/components/rating/RatingSystem';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-500',
  pending: 'bg-amber-500',
  pending_approval: 'bg-amber-400',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-400',
  in_progress: 'bg-purple-500',
  rejected: 'bg-red-500',
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  pending_approval: 'Pending Approval',
  completed: 'Completed',
  cancelled: 'Cancelled',
  in_progress: 'In Progress',
  rejected: 'Rejected',
};

function BookingCard({ booking, onRate }: { booking: any; onRate?: (b: any) => void }) {
  const { data: existingReview } = useQuery({
    queryKey: ['/api/reviews/booking', booking.id],
    queryFn: async () => {
      const res = await fetch(`/api/reviews/booking/${booking.id}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: booking.status === 'completed',
  });

  const isCompleted = booking.status === 'completed';
  const canRate = isCompleted && onRate && existingReview === null;
  const hasRated = isCompleted && existingReview;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[booking.status] || 'bg-gray-400'}`} />
            <span className="text-sm font-medium text-gray-600">{STATUS_LABELS[booking.status] || booking.status}</span>
          </div>
          <p className="text-sm text-gray-400">
            {booking.date ? new Date(booking.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
          </p>
        </div>
        <CardTitle className="text-lg mt-1">
          {booking.pujaName || booking.title || `Booking #${booking.id}`}
        </CardTitle>
        <CardDescription>{booking.city || booking.location || 'Location TBD'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-t pt-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Amount</span>
            <span className="font-semibold">₹{(booking.amount || 0).toLocaleString('en-IN')}</span>
          </div>
          {booking.gurujiName && (
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Guruji</span>
              <span className="text-sm font-medium">{booking.gurujiName}</span>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div>
            {hasRated && (
              <div className="flex items-center gap-1 text-sm text-amber-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>Rated {existingReview.rating}/5</span>
              </div>
            )}
            {canRate && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary p-0"
                onClick={() => onRate!(booking)}
              >
                <Star className="h-4 w-4 mr-1" />
                Rate Service
              </Button>
            )}
          </div>
          <Link href={`/booking/${booking.id}`}>
            <Button variant="outline" size="sm">View Details</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CustomerDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedBookingForRating, setSelectedBookingForRating] = useState<any>(null);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);

  const { data: bookings = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const res = await fetch('/api/bookings', { credentials: 'include' });
      if (!res.ok) {
        // Return mock data if not authenticated
        return [
          { id: 1, pujaName: 'Satyanarayan Puja', city: 'Mumbai', date: new Date().toISOString(), amount: 1500, gurujiName: 'Pandit Ramesh Ji', status: 'confirmed' },
          { id: 2, pujaName: 'Ganesh Puja', city: 'Online', date: new Date(Date.now() + 86400000).toISOString(), amount: 1200, status: 'pending' },
          { id: 3, pujaName: 'Griha Pravesh Puja', city: 'Pune', date: new Date(Date.now() - 15 * 86400000).toISOString(), amount: 2500, gurujiName: 'Pandit Suresh Ji', gurujiId: 1, status: 'completed' },
        ];
      }
      return res.json();
    },
  });

  const ratingMutation = useMutation({
    mutationFn: async ({ bookingId, gurujiId, rating, review }: any) => {
      const res = await apiRequest('POST', '/api/reviews', { bookingId, gurujiId, rating, review });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/booking', selectedBookingForRating?.id] });
      toast({ title: 'Thank You!', description: 'Your rating has been submitted successfully.' });
      setIsRatingDialogOpen(false);
      setSelectedBookingForRating(null);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to submit rating.', variant: 'destructive' });
    },
  });

  const upcomingBookings = bookings.filter(b => ['confirmed', 'pending', 'pending_approval', 'in_progress'].includes(b.status));
  const pastBookings = bookings.filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status));
  const totalSpent = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 font-poppins">Welcome back!</h1>
        <p className="text-neutral-600">Manage your bookings and spiritual journey here.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Total Bookings</p>
                <p className="text-3xl font-bold">{bookings.length}</p>
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
                <p className="text-3xl font-bold">₹{totalSpent.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <CreditCard className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h2 className="text-2xl font-bold font-poppins">Your Bookings</h2>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/my-bookings">View All</Link>
          </Button>
          <Button asChild>
            <Link href="/booking">Book a Puja</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-neutral-300 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No upcoming bookings</h3>
                <p className="text-neutral-500 mb-6 text-center">You don't have any upcoming puja bookings.</p>
                <Button asChild><Link href="/booking">Book a Puja</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingBookings.map(b => <BookingCard key={b.id} booking={b} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {pastBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-neutral-300 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No past bookings</h3>
                <p className="text-neutral-500 text-center">You don't have any past puja bookings.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pastBookings.map(b => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onRate={(booking) => {
                    setSelectedBookingForRating(booking);
                    setIsRatingDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Spiritual Journey */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-poppins">Your Spiritual Growth</h2>
          <Button asChild><Link href="/spiritual-journey">View All</Link></Button>
        </div>
        <Card className="hover:shadow-md transition-shadow mb-10">
          <CardHeader>
            <CardTitle>Personal Journey Progress</CardTitle>
            <CardDescription>Track your spiritual milestones and growth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-medium">{Math.min(100, pastBookings.filter(b => b.status === 'completed').length * 20)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${Math.min(100, pastBookings.filter(b => b.status === 'completed').length * 20)}%` }} />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Continue your spiritual growth by completing recommended pujas and tracking your journey.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/spiritual-journey">
                <div className="flex items-center justify-center w-full">
                  View Your Journey <ChevronRight className="h-4 w-4 ml-2" />
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Help */}
      <div className="mt-6">
        <h2 className="text-2xl font-bold font-poppins mb-6">Need Help?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { href: '/faq', title: 'FAQ', desc: 'Find answers to common questions' },
            { href: '/contact', title: 'Contact Support', desc: 'Get help from our team' },
            { href: '/profile', title: 'Profile Settings', desc: 'Update your account information' },
          ].map(item => (
            <Card key={item.href} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <Button variant="ghost" className="w-full justify-between" asChild>
                  <Link href={item.href}>
                    <div className="flex flex-col items-start">
                      <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                      <p className="text-neutral-500 text-sm text-left">{item.desc}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-neutral-400" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Rating Dialog */}
      {selectedBookingForRating && (
        <RatingDialog
          isOpen={isRatingDialogOpen}
          onClose={() => {
            setIsRatingDialogOpen(false);
            setSelectedBookingForRating(null);
          }}
          booking={{
            id: String(selectedBookingForRating.id),
            gurujiName: selectedBookingForRating.gurujiName || 'Guruji',
            serviceName: selectedBookingForRating.pujaName || selectedBookingForRating.title || 'Puja Service',
            date: selectedBookingForRating.date
              ? new Date(selectedBookingForRating.date).toLocaleDateString('en-IN')
              : '',
          }}
          onSubmitRating={async (rating: number, review: string) => {
            await ratingMutation.mutateAsync({
              bookingId: selectedBookingForRating.id,
              gurujiId: selectedBookingForRating.gurujiId,
              rating,
              review,
            });
          }}
        />
      )}
    </div>
  );
}
