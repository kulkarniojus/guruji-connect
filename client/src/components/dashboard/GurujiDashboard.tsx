import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Loader2, Calendar, Clock, MapPin, Check, X,
  User, IndianRupee, Phone, Bell, CheckCircle2,
  XCircle, Package2, AlertCircle
} from 'lucide-react';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-violet-100 text-violet-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
    pending_approval: 'bg-orange-100 text-orange-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700';
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
}

export default function GurujiDashboard() {
  const { toast } = useToast();
  const [declineReason, setDeclineReason] = useState<Record<number, string>>({});
  const [showDeclineFor, setShowDeclineFor] = useState<number | null>(null);

  // Fetch current user
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });

  // Fetch pending booking requests sent to this guruji
  const { data: bookingRequests = [], isLoading: reqLoading, refetch: refetchRequests } = useQuery<any[]>({
    queryKey: ['/api/guruji/booking-requests'],
    queryFn: async () => {
      const res = await fetch('/api/guruji/booking-requests', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });

  // Fetch this guruji's confirmed / completed bookings
  const { data: myBookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const res = await fetch('/api/bookings', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });

  const pendingRequests = bookingRequests.filter((r: any) => r.status === 'pending');
  const upcoming = myBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'in_progress');
  const completed = myBookings.filter((b: any) => b.status === 'completed');
  const totalEarnings = completed.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

  // Accept a booking request
  const acceptMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest('POST', `/api/booking-requests/${requestId}/respond`, {
        response: 'accept',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to accept');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Booking accepted!', description: 'The customer has been notified.' });
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Decline a booking request
  const declineMutation = useMutation({
    mutationFn: async ({ requestId, message }: { requestId: number; message: string }) => {
      const res = await apiRequest('POST', `/api/booking-requests/${requestId}/respond`, {
        response: 'decline',
        message,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to decline');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Request declined', description: 'The booking request has been declined.' });
      setShowDeclineFor(null);
      queryClient.invalidateQueries({ queryKey: ['/api/guruji/booking-requests'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  if (reqLoading || bookingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Welcome, {user?.firstName || 'Guruji'}!</h1>
        <p className="text-neutral-600">Manage your booking requests and upcoming services.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">New Requests</p>
                <p className="text-3xl font-bold text-amber-600">{pendingRequests.length}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-full">
                <Bell className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Upcoming</p>
                <p className="text-3xl font-bold text-blue-600">{upcoming.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Completed</p>
                <p className="text-3xl font-bold text-green-600">{completed.length}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Earnings</p>
                <p className="text-3xl font-bold text-violet-600">₹{totalEarnings.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3 bg-violet-50 rounded-full">
                <IndianRupee className="h-5 w-5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="mb-6">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Booking Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            <Calendar className="h-4 w-4 mr-2" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="all-requests">
            <Package2 className="h-4 w-4 mr-2" />
            All Requests
          </TabsTrigger>
        </TabsList>

        {/* ── PENDING BOOKING REQUESTS ── */}
        <TabsContent value="requests">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <Bell className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-lg font-medium">No pending requests</p>
              <p className="text-sm mt-1">New booking requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req: any) => (
                <Card key={req.id} className="border-amber-200 bg-amber-50/30">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-800 border-0">New Request</Badge>
                          <span className="text-xs text-neutral-500">#{req.id}</span>
                        </div>

                        <h3 className="text-lg font-semibold">
                          {req.puja?.name || req.booking?.type || 'Puja Service'}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm text-neutral-700">
                          {req.customer && (
                            <span className="flex items-center gap-1.5">
                              <User className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                              {req.customer.firstName} {req.customer.lastName}
                            </span>
                          )}
                          {req.customer?.mobile && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                              {req.customer.mobile}
                            </span>
                          )}
                          {req.booking?.date && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                              {formatDate(req.booking.date)}
                              {req.booking.time ? ` · ${req.booking.time}` : ''}
                            </span>
                          )}
                          {req.booking?.city && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                              {req.booking.city}{req.booking.pincode ? ` – ${req.booking.pincode}` : ''}
                            </span>
                          )}
                          {req.booking?.address && (
                            <span className="flex items-center gap-1.5 col-span-2">
                              <MapPin className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                              {req.booking.address}
                            </span>
                          )}
                          {req.booking?.amount != null && (
                            <span className="flex items-center gap-1.5 font-medium text-violet-700">
                              <IndianRupee className="h-4 w-4 flex-shrink-0" />
                              ₹{req.booking.amount.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Accept / Decline buttons */}
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => acceptMutation.mutate(req.id)}
                          disabled={acceptMutation.isPending}
                        >
                          {acceptMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => setShowDeclineFor(showDeclineFor === req.id ? null : req.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </div>

                    {/* Decline reason box */}
                    {showDeclineFor === req.id && (
                      <div className="mt-4 space-y-2 border-t pt-4">
                        <p className="text-sm font-medium text-neutral-700">Reason for declining (optional):</p>
                        <Textarea
                          placeholder="e.g. Not available on this date..."
                          value={declineReason[req.id] || ''}
                          onChange={(e) =>
                            setDeclineReason(prev => ({ ...prev, [req.id]: e.target.value }))
                          }
                          className="resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              declineMutation.mutate({ requestId: req.id, message: declineReason[req.id] || '' })
                            }
                            disabled={declineMutation.isPending}
                          >
                            {declineMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : null}
                            Confirm Decline
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowDeclineFor(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── UPCOMING BOOKINGS ── */}
        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-lg font-medium">No upcoming bookings</p>
              <p className="text-sm mt-1">Accepted bookings will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── COMPLETED BOOKINGS ── */}
        <TabsContent value="completed">
          {completed.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-lg font-medium">No completed bookings yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completed.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ALL REQUESTS (history) ── */}
        <TabsContent value="all-requests">
          {bookingRequests.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <Package2 className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-lg font-medium">No request history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookingRequests.map((req: any) => (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-medium">
                          {req.puja?.name || req.booking?.type || 'Puja Service'}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {req.customer
                            ? `${req.customer.firstName} ${req.customer.lastName}`
                            : 'Customer'
                          }
                          {req.booking?.date ? ` · ${formatDate(req.booking.date)}` : ''}
                          {req.booking?.city ? ` · ${req.booking.city}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {req.booking?.amount != null && (
                          <span className="text-sm font-medium">
                            ₹{req.booking.amount.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge(req.status)}`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookingCard({ booking }: { booking: any }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(booking.status)}`}>
                {booking.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-neutral-500">#{booking.id}</span>
            </div>
            <h3 className="font-semibold">{booking.pujaName || booking.type || 'Puja Service'}</h3>
            <div className="text-sm text-neutral-600 space-y-0.5">
              {booking.date && (
                <p className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                  {new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {booking.time ? ` · ${booking.time}` : ''}
                </p>
              )}
              {booking.city && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                  {booking.city}{booking.address ? ` — ${booking.address}` : ''}
                </p>
              )}
            </div>
          </div>
          {booking.amount != null && (
            <div className="text-right">
              <p className="text-lg font-bold text-violet-700">₹{booking.amount.toLocaleString('en-IN')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
