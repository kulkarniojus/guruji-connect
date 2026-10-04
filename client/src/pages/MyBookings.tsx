import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BOOKING_STATUS_LABELS as STATUS_LABELS } from '@shared/bookingLifecycle';
import {
  Loader2, Calendar, MapPin, IndianRupee, ChevronRight, Star,
  Clock, CheckCircle2, XCircle, MessageSquare, BookOpen,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-500',
  pending: 'bg-amber-500',
  pending_approval: 'bg-amber-400',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-400',
  in_progress: 'bg-purple-500',
  rejected: 'bg-red-500',
};

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const Icon = icon;
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}

function BookingCard({ booking }: { booking: any }) {
  return (
    <Link href={`/booking/${booking.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[booking.status] || 'bg-gray-400'}`} />
              <span className="text-sm font-medium">{STATUS_LABELS[booking.status] || booking.status}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </div>
          <h3 className="font-semibold text-lg mb-1">{booking.pujaName || `Booking #${booking.id}`}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600 mb-2">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {booking.date ? new Date(booking.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
              {booking.time && ` · ${booking.time}`}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {booking.city || 'TBD'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="flex items-center gap-1 font-semibold text-violet-700">
              <IndianRupee className="h-4 w-4" />
              {(booking.amount || 0).toLocaleString('en-IN')}
            </span>
            {booking.gurujiName && (
              <span className="text-xs text-neutral-500">Guruji: {booking.gurujiName}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function MyBookings() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const r = await fetch('/api/auth/me', { credentials: 'include' });
      return r.ok ? r.json() : null;
    },
  });

  const { data: bookings = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const r = await fetch('/api/bookings', { credentials: 'include' });
      if (!r.ok) throw new Error('Could not load bookings');
      return r.json();
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 20000,
  });

  useEffect(() => {
    if (!userLoading && !user) setLocation('/');
  }, [userLoading, user, setLocation]);

  if (userLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div>;
  }

  const upcoming = bookings.filter(b => ['pending', 'pending_approval', 'confirmed', 'in_progress'].includes(b.status));
  const past = bookings.filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status));
  const completed = bookings.filter(b => b.status === 'completed');
  const totalSpent = completed.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Helmet><title>My Bookings | Sanatan Guruji</title></Helmet>
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold">My Bookings</h1>
              <p className="text-neutral-600 mt-1">Manage all your puja bookings, payments, ratings and queries.</p>
            </div>
            <Link href="/booking">
              <Button className="gap-2">
                <BookOpen className="h-4 w-4" /> Book a New Puja
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Clock} label="Upcoming" value={upcoming.length} color="bg-amber-500" />
            <StatCard icon={CheckCircle2} label="Completed" value={completed.length} color="bg-green-500" />
            <StatCard icon={XCircle} label="Cancelled" value={bookings.filter(b => b.status === 'cancelled').length} color="bg-red-400" />
            <StatCard icon={IndianRupee} label="Total Spent" value={`₹${totalSpent.toLocaleString('en-IN')}`} color="bg-violet-500" />
          </div>

          <Tabs defaultValue="upcoming">
            <TabsList className="mb-4">
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
              <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
            </TabsList>

            {(['upcoming', 'past', 'all'] as const).map(key => {
              const list = key === 'upcoming' ? upcoming : key === 'past' ? past : bookings;
              return (
                <TabsContent key={key} value={key}>
                  {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>
                  ) : list.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <MessageSquare className="h-10 w-10 mx-auto text-neutral-300 mb-3" />
                        <p className="text-neutral-500">No {key === 'all' ? '' : key} bookings yet</p>
                        {key !== 'past' && (
                          <Link href="/booking">
                            <Button variant="outline" className="mt-4">Book Your First Puja</Button>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {list.map(b => <BookingCard key={b.id} booking={b} />)}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
