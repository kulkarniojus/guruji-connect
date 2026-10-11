import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function CancellationHistory({bookingId}: {bookingId?:number}) {
  const path=bookingId ? `/api/bookings/${bookingId}/cancellation-history` : '/api/guruji/cancellation-history';
  const {data=[],isError}=useQuery<any[]>({
    queryKey:[path],queryFn:async()=>(await apiRequest('GET',path)).json(),refetchInterval:15000,
  });
  if (isError) return <p className="text-sm text-red-600" role="alert">Unable to load cancellation history. Please refresh.</p>;
  if (!data.length) return null;
  return <section aria-label="Cancellation and reassignment history" className="rounded-lg border bg-white p-4 space-y-3">
    <h3 className="font-semibold">Cancellation &amp; reassignment history</h3>
    {data.map(event=><div key={event.id} className="border-t pt-2 text-sm space-y-1">
      {!bookingId && <p>Booking #{event.booking_id}</p>}
      <p>{event.kind==='guruji_withdrawal' ? 'Guruji withdrew — booking kept open' : event.kind==='admin_reassignment' ? 'Support team reassignment' : event.kind==='admin_cancel' ? 'Support team cancellation' : event.kind.replaceAll('_',' ')} · {event.status}</p>
      <p>{event.reason}</p>
      {event.review_reason && <p>Support team decision: {event.review_reason}</p>}
      <p>{event.status==='rejected' || event.status==='superseded' ? 'No charge applied for this request.' :
        `${event.status==='pending' ? 'Proposed' : 'Recorded'} ${event.user_type==='none' ? '' : event.user_type} charge: ₹${Number(event.charge).toLocaleString('en-IN')}`}</p>
      <p className="text-xs text-muted-foreground">No money deducted or refunded. {new Date(event.created_at).toLocaleString('en-IN')}</p>
    </div>)}
  </section>;
}
