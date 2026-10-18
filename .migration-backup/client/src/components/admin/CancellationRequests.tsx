import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BookingCancellationAdmin from './BookingCancellationAdmin';

export default function CancellationRequests() {
  const {data=[],isLoading,isError}=useQuery<any[]>({
    queryKey:['/api/admin/cancellation-requests'],
    queryFn:async()=>(await apiRequest('GET','/api/admin/cancellation-requests')).json(),
    refetchInterval:15000,
  });
  return <Card><CardHeader><CardTitle>Cancellation requests &amp; withdrawal history</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      {isLoading ? <p>Loading requests…</p> : isError ? <p role="alert">Unable to load cancellation requests. Please refresh.</p>
        : !data.length ? <p>No cancellation requests yet.</p> : data.map(event=>
          <div key={event.id} data-cancellation-event-id={event.id} className="rounded border p-3 text-sm space-y-2">
            <div className="flex flex-wrap gap-2 items-center"><a href={`/booking/${event.booking_id}`} className="font-semibold underline">Booking #{event.booking_id}</a>
              <span>{event.puja_name} · {event.customer_name}</span><Badge variant="outline">{event.status}</Badge></div>
            <p>{event.kind.replaceAll('_',' ')} · Responsible party: {event.user_type} · {event.status==='pending' ? 'Proposed' : 'Recorded'} charge: ₹{event.charge}</p>
            {event.quote?.rule && <p className="text-xs text-muted-foreground">
              Saved rule: {event.quote.rule.name} · {event.quote.rule.time_basis==='within' ? 'within' : 'at least'} {event.quote.rule.hours_threshold} hours before puja
              · Booking amount ₹{event.quote.bookingAmount}
            </p>}
            <p>{event.reason}</p>
            {event.review_reason && <p>Admin decision: {event.review_reason}</p>}
            <p className="text-xs text-muted-foreground">No money deducted. {new Date(event.created_at).toLocaleString('en-IN')}</p>
            {(event.status==='pending' || (event.status==='recorded' && event.user_type==='guruji' && ['guruji_withdrawal','admin_reassignment'].includes(event.kind))) &&
              <BookingCancellationAdmin booking={{id:event.booking_id,status:event.booking_status}} event={event} />}
          </div>)}
    </CardContent>
  </Card>;
}
