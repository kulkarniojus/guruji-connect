import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Clock, MapPin, IndianRupee, User, Phone, Mail, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function BookingDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: booking, isLoading, error } = useQuery({
    queryKey: [`/api/bookings/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch booking');
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Booking not found</h1>
            <p className="text-neutral-600 mb-6">The booking you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => setLocation('/dashboard')}>Back to Dashboard</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    pending_approval: 'bg-orange-100 text-orange-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    in_progress: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Helmet>
        <title>Booking #{booking.id} | GurujiConnect</title>
      </Helmet>
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Back Button */}
          <button
            onClick={() => setLocation('/dashboard')}
            className="flex items-center gap-2 text-violet-600 hover:text-violet-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bookings
          </button>

          {/* Main Booking Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">Booking #{booking.id}</CardTitle>
                  <CardDescription>{new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
                </div>
                <Badge className={statusColors[booking.status] || 'bg-gray-100 text-gray-800'}>
                  {booking.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Service Details */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Service Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Puja/Service:</span>
                    <span className="font-medium">{booking.pujaName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Type:</span>
                    <span className="font-medium capitalize">{booking.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Amount:</span>
                    <span className="font-medium text-violet-700">₹{booking.amount?.toLocaleString('en-IN') || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Scheduled Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-600">Date</p>
                      <p className="font-medium">{new Date(booking.date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  {booking.time && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-neutral-400" />
                      <div>
                        <p className="text-sm text-neutral-600">Time</p>
                        <p className="font-medium">{booking.time}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Location</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-600">City</p>
                      <p className="font-medium">{booking.city}</p>
                    </div>
                  </div>
                  {booking.address && (
                    <div className="ml-8">
                      <p className="text-sm text-neutral-600">Address</p>
                      <p className="font-medium">{booking.address}</p>
                    </div>
                  )}
                  {booking.pincode && (
                    <div className="ml-8">
                      <p className="text-sm text-neutral-600">Pincode</p>
                      <p className="font-medium">{booking.pincode}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Guruji Info */}
              {booking.gurujiId && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">Assigned Guruji</h3>
                  <div className="bg-neutral-50 p-4 rounded-lg border">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center text-violet-600">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-medium">{booking.gurujiName || 'Guruji'}</p>
                        <p className="text-sm text-neutral-600 mt-1">ID: {booking.gurujiId}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {booking.notes && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Notes</h3>
                  <p className="text-neutral-700 bg-neutral-50 p-3 rounded">{booking.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={() => setLocation('/dashboard')} className="flex-1">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
