import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Loader2, Calendar, Clock, MapPin, User, ArrowLeft, XCircle, MessageSquare,
  Star, Send, IndianRupee,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { RatingDialog } from '@/components/rating/RatingSystem';
import { bookingStatusLabel } from '@shared/bookingLifecycle';
import BookingCompletionControls from '@/components/booking/BookingCompletionControls';
import BookingAddressVisibility from '@/components/booking/BookingAddressVisibility';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  pending_approval: 'bg-orange-100 text-orange-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  in_progress: 'bg-purple-100 text-purple-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function BookingDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRate, setShowRate] = useState(false);
  const [queryMsg, setQueryMsg] = useState('');

  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const r = await fetch('/api/auth/me', { credentials: 'include' });
      return r.ok ? r.json() : null;
    },
    staleTime: 30000,
  });

  const { data: booking, isLoading, isPending: isBookingPending, error } = useQuery<any>({
    queryKey: [`/api/bookings/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${id}`, { credentials: 'include' });
      if (res.status === 401) {
        setLocation('/');
        throw new Error('Please log in to view this booking');
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to fetch booking');
      }
      return res.json();
    },
    enabled: !!id,
    refetchInterval: 15000,
    retry: false,
  });

  const { data: existingReview, isError: isReviewError, isLoading: isReviewLoading, refetch: refetchReview } = useQuery<any>({
    queryKey: ['/api/reviews/booking', id],
    queryFn: async () => {
      const r = await fetch(`/api/reviews/booking/${id}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Could not check whether this booking has been rated.');
      return r.json();
    },
    enabled: !!id && booking?.status === 'completed',
  });

  const { data: cancelPreview } = useQuery<any>({
    queryKey: [`/api/bookings/${id}/cancellation-preview`],
    queryFn: async () => {
      const r = await fetch(`/api/bookings/${id}/cancellation-preview`, { credentials: 'include' });
      return r.ok ? r.json() : null;
    },
    enabled: showCancel,
  });

  const { data: queries = [] } = useQuery<any[]>({
    queryKey: [`/api/bookings/${id}/queries`],
    queryFn: async () => {
      const r = await fetch(`/api/bookings/${id}/queries`, { credentials: 'include' });
      return r.ok ? r.json() : [];
    },
    enabled: !!id && !!user,
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', `/api/bookings/${id}/cancel`, { reason: cancelReason });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Booking cancelled', description: 'Your booking has been cancelled.' });
      setShowCancel(false);
      setCancelReason('');
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const rateMutation = useMutation({
    mutationFn: async ({ rating, review }: { rating: number; review: string }) => {
      const r = await apiRequest('POST', '/api/reviews', {
        bookingId: Number(id),
        gurujiId: booking.gurujiId,
        rating,
        review,
        fromRole: 'customer',
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to submit rating. Please try again.');
      }
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Thank you!', description: 'Your rating has been submitted.' });
      setShowRate(false);
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/booking', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/booking', id, 'guruji-side'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ratings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gurujis'] });
      queryClient.invalidateQueries({ predicate: (query) => typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/gurujis?') });
      queryClient.invalidateQueries({ queryKey: ['/api/guruji'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const queryMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', `/api/bookings/${id}/query`, { message: queryMsg });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: 'Query sent', description: 'The Sanatan Guruji support team will respond soon.' });
      setQueryMsg('');
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${id}/queries`] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (isLoading || isBookingPending) {
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
            <Button onClick={() => setLocation('/dashboard')}>Back to Dashboard</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isOwner = user && booking.customerId === user.id;
  const isCustomer = user?.role === 'customer';
  const canCancel = isOwner && ['pending', 'pending_approval', 'confirmed'].includes(booking.status);
  const canRate = isOwner && booking.status === 'completed' && !isReviewLoading && !isReviewError && !existingReview;
  const isPending = ['pending', 'pending_approval'].includes(booking.status);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Helmet><title>{`Booking #${booking.id} | Sanatan Guruji`}</title></Helmet>
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <button
            onClick={() => setLocation(isCustomer ? '/my-bookings' : '/dashboard')}
            className="flex items-center gap-2 text-violet-600 hover:text-violet-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {/* Status banner for pending bookings */}
          {isPending && (
            <Card className="mb-4 border-amber-300 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-amber-800">
                   {booking.status === 'pending'
                     ? 'Your booking request is pending. It is not confirmed until a Guruji accepts.'
                     : booking.gurujiId
                       ? 'Waiting for the Guruji to accept your booking. You will be notified once confirmed.'
                       : 'Your request was sent to nearby Gurujis. The first to accept will be assigned.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Main card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <CardTitle className="text-2xl">{booking.pujaName || `Booking #${booking.id}`}</CardTitle>
                  <CardDescription>
                    {new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </CardDescription>
                </div>
                <Badge className={STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-800'}>
                  {bookingStatusLabel(booking.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-xs text-neutral-500">Date</p>
                    <p className="font-medium">{new Date(booking.date).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                {booking.time && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-violet-500" />
                    <div>
                      <p className="text-xs text-neutral-500">Time</p>
                      <p className="font-medium">{booking.time}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-xs text-neutral-500">Location</p>
                    <p className="font-medium">{booking.city || 'TBD'}</p>
                    {user?.role === 'guruji' ? (
                      <BookingAddressVisibility booking={booking} showNotes onRefresh={() => queryClient.invalidateQueries({ queryKey: [`/api/bookings/${id}`] })} />
                    ) : (isOwner || user?.role === 'admin') && booking.address ? (
                      <p className="text-sm text-neutral-600">{booking.address}{booking.pincode ? ` · ${booking.pincode}` : ''}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <IndianRupee className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-xs text-neutral-500">Amount</p>
                    <p className="font-medium text-violet-700">₹{(booking.amount || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              {booking.pricingSnapshot && (() => {
                const snapshot = booking.pricingSnapshot.quote ?? booking.pricingSnapshot;
                if (snapshot.pujaPrice == null && snapshot.regularPrice == null && snapshot.totalAmount == null) return null;
                return (
                  <section className="rounded-lg border border-violet-100 bg-violet-50/60 p-4" aria-label="Saved booking price breakdown">
                    <h3 className="mb-3 font-semibold">Price at booking</h3>
                    <dl className="space-y-2 text-sm">
                      {snapshot.regularPrice != null && <div className="flex justify-between gap-4"><dt className="text-neutral-600">Regular puja price</dt><dd>₹{Number(snapshot.regularPrice).toLocaleString('en-IN')}</dd></div>}
                      {snapshot.regularAdjustment != null ? (
                        <>
                          {Number(snapshot.regularAdjustment) !== 0 && <div className="flex justify-between gap-4"><dt className="text-neutral-600">Dated price adjustment</dt><dd>{Number(snapshot.regularAdjustment) > 0 ? '+' : '−'}₹{Math.abs(Number(snapshot.regularAdjustment)).toLocaleString('en-IN')}</dd></div>}
                          {Number(snapshot.timeAdjustment ?? 0) !== 0 && <div className="flex justify-between gap-4"><dt className="text-neutral-600">Short-notice adjustment</dt><dd>{Number(snapshot.timeAdjustment) > 0 ? '+' : '−'}₹{Math.abs(Number(snapshot.timeAdjustment)).toLocaleString('en-IN')}</dd></div>}
                        </>
                      ) : snapshot.pujaPrice != null && snapshot.regularPrice != null && Number(snapshot.pujaPrice) !== Number(snapshot.regularPrice) ? (
                        <div className="flex justify-between gap-4"><dt className="text-neutral-600">Price adjustment</dt><dd>{Number(snapshot.pujaPrice) - Number(snapshot.regularPrice) > 0 ? '+' : '−'}₹{Math.abs(Number(snapshot.pujaPrice) - Number(snapshot.regularPrice)).toLocaleString('en-IN')}</dd></div>
                      ) : null}
                      {snapshot.samagriPrice != null && <div className="flex justify-between gap-4"><dt className="text-neutral-600">Samagri</dt><dd>₹{Number(snapshot.samagriPrice).toLocaleString('en-IN')}</dd></div>}
                      {snapshot.totalAmount != null && <div className="flex justify-between gap-4 border-t border-violet-200 pt-2 font-semibold"><dt>Total at booking</dt><dd>₹{Number(snapshot.totalAmount).toLocaleString('en-IN')}</dd></div>}
                      {snapshot.explanation && <p className="pt-1 text-xs text-neutral-600">{snapshot.explanation}</p>}
                    </dl>
                  </section>
                );
              })()}

              {booking.gurujiId && (
                <div className="bg-violet-50 p-4 rounded-lg border border-violet-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center text-violet-600">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Assigned Guruji</p>
                      <p className="font-semibold">{booking.gurujiName || `Guruji #${booking.gurujiId}`}</p>
                    </div>
                  </div>
                </div>
              )}

              {booking.cancellation_charge > 0 && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                  <p className="text-sm font-medium text-red-800">
                    Cancellation Charge: ₹{booking.cancellation_charge}
                  </p>
                  {booking.cancellation_reason && (
                    <p className="text-xs text-red-600 mt-1">Reason: {booking.cancellation_reason}</p>
                  )}
                </div>
              )}

              {booking.notes && user?.role !== 'guruji' && (
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Notes</p>
                  <p className="text-sm bg-neutral-50 p-3 rounded">{booking.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <BookingCompletionControls booking={booking} />

          {/* Action buttons */}
          {isOwner && (
            <div className="flex gap-3 flex-wrap mb-6">
              {isReviewError && (
                <div role="alert" className="flex items-center gap-2 text-sm text-red-700">
                  <span>Rating status could not be checked.</span>
                  <Button variant="outline" size="sm" onClick={() => refetchReview()}>Retry</Button>
                </div>
              )}
              {canCancel && (
                <Button variant="destructive" onClick={() => setShowCancel(true)} className="gap-2">
                  <XCircle className="h-4 w-4" /> Cancel Booking
                </Button>
              )}
              {canRate && (
                <Button onClick={() => setShowRate(true)} className="gap-2 bg-amber-500 hover:bg-amber-600">
                  <Star className="h-4 w-4" /> Rate Guruji
                </Button>
              )}
              {existingReview && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-md border border-amber-200">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium">You rated: {existingReview.rating}/5</span>
                </div>
              )}
            </div>
          )}

          {/* Queries section */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-violet-500" />
                  Queries to Sanatan Guruji Support Team
                </CardTitle>
                <CardDescription>
                  Have a question about this booking? Send a message to the Sanatan Guruji support team.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    value={queryMsg}
                    onChange={e => setQueryMsg(e.target.value)}
                    placeholder="Type your question for the Sanatan Guruji support team..."
                    aria-label="Message to the Sanatan Guruji support team"
                    rows={3}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => queryMutation.mutate()}
                    aria-label="Send message to the Sanatan Guruji support team"
                    disabled={!queryMsg.trim() || queryMutation.isPending}
                    className="self-end"
                  >
                    {queryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="space-y-3">
                  {queries.length === 0 ? (
                    <p className="text-center text-sm text-neutral-500 py-4">No queries yet</p>
                  ) : (
                    queries.map((q: any) => (
                      <div key={q.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium">You asked:</p>
                          <span className="text-xs text-neutral-400">
                            {q.created_at ? new Date(q.created_at).toLocaleString('en-IN') : ''}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-700 bg-neutral-50 p-2 rounded">{q.message}</p>
                        {q.admin_reply ? (
                          <div className="border-l-2 border-violet-400 pl-3 mt-2">
                            <p className="text-xs font-medium text-violet-600 mb-1">Sanatan Guruji support team reply:</p>
                            <p className="text-sm text-neutral-700">{q.admin_reply}</p>
                            {q.replied_at && (
                              <p className="text-xs text-neutral-400 mt-1">
                                {new Date(q.replied_at).toLocaleString('en-IN')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Awaiting reply
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Cancel dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>
              {cancelPreview ? (
                cancelPreview.charge > 0 ? (
                  <span>
                    A cancellation charge of <strong className="text-red-600">₹{cancelPreview.charge}</strong> will apply
                    {cancelPreview.rule?.description && ` (${cancelPreview.rule.description})`}.
                  </span>
                ) : (
                  <span className="text-green-600">No cancellation charge will apply.</span>
                )
              ) : (
                'Loading charge details...'
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (optional)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)}>Keep Booking</Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating dialog */}
      {booking && (
        <RatingDialog
          isOpen={showRate}
          onClose={() => setShowRate(false)}
          booking={{
            id: String(booking.id),
            gurujiName: booking.gurujiName || 'Guruji',
            serviceName: booking.pujaName || 'Service',
            date: booking.date,
          }}
          onSubmitRating={async (rating, review) => {
            await rateMutation.mutateAsync({ rating, review });
          }}
        />
      )}

      <Footer />
    </div>
  );
}
