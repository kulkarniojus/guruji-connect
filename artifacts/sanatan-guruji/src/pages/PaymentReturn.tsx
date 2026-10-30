import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { PaymentCheckoutResult, PaymentOrderSummary } from '@workspace/api-client-react';
import { clearBookingDraft } from '@/components/booking/bookingDraft';
import { checkoutReturnPath, clearCheckoutAttempt } from '@/components/payments/bookingCheckout';
import { queryClient } from '@/lib/queryClient';

export default function PaymentReturn() {
  const params=new URLSearchParams(window.location.search);
  const sessionId=params.get('session_id'),orderId=params.get('order_id');
  const result=useQuery<PaymentCheckoutResult>({
    queryKey:['payment-return',sessionId,orderId],
    queryFn:async()=>{
      let id=sessionId;
      if (!id && orderId) {
        const response=await fetch(`/api/payments/orders/${encodeURIComponent(orderId)}`,{credentials:'include'});
        if (!response.ok) throw new Error('Your checkout could not be loaded. Please retry verification.');
        const order=await response.json() as PaymentOrderSummary;
        id=order.sessionId;
      }
      if (!id) throw new Error('No payment attempt was found. Check My Bookings before starting again.');
      const response=await fetch(`/api/payments/checkout/${encodeURIComponent(id)}`,{credentials:'include',cache:'no-store'});
      const data=await response.json();
      if (!response.ok) throw new Error(data.message||'Payment verification is unavailable. Do not pay again.');
      if (data.state==='paid') {
        clearBookingDraft(); clearCheckoutAttempt();
        void queryClient.invalidateQueries({queryKey:['/api/bookings']});
      }
      if (data.state==='expired'||data.state==='failed') clearCheckoutAttempt();
      return data;
    },
    retry:false,
    refetchInterval:query=>query.state.data?.state==='processing'?3000:false,
  });
  const paid=result.data?.state==='paid';
  return <main className="mx-auto max-w-xl px-4 py-16">
    <Helmet><title>Payment verification | Vaidik Dhara</title><meta name="description" content="Verify your puja booking advance securely." /></Helmet>
    <Card>
      <CardHeader><CardTitle>{paid?result.data?.testMode?'Test checkout completed':'Advance payment received':'Verify your booking payment'}</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {result.isFetching && <p className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Checking directly with Stripe…</p>}
        {result.error && <p role="alert" className="text-sm text-red-700">{result.error.message} If money was debited, do not pay again; contact the Vaidik Dhara support team.</p>}
        {paid && <div className="space-y-2 text-sm">
          <p>{result.data?.testMode?'This was a Stripe test transaction. No real money was collected or recorded as a finance receipt.':
            `Your ₹${result.data?.advanceAmount?.toLocaleString('en-IN')} advance has been verified and recorded.`}</p>
          <p>Booking #{result.data?.bookingId} still requires genuine Guruji acceptance.</p>
          {result.data?.needsSupport && <p>The selected time or Guruji became unavailable during checkout. Your booking and payment are saved; the support team has been alerted to assist with reassignment or your cancellation/refund request.</p>}
          <p>The remaining booking balance is paid directly to your Guruji. Refunds, when owed under the cancellation policy, are handled and recorded by the support team.</p>
        </div>}
        {result.data && !paid && <p className="text-sm">{result.data.state==='processing'
          ?'Stripe is still processing the payment. Do not pay again; this page will recheck.'
          :'Checkout is not completed. No booking request has been sent from this attempt. You can return to review your selection.'}</p>}
        <div className="flex flex-wrap gap-3">
          {paid ? <Link href={`/booking/${result.data?.bookingId}`}><Button>View booking request</Button></Link> :
            <Button onClick={()=>void result.refetch()} disabled={result.isFetching}>Recheck payment</Button>}
          {!paid && <Link href={checkoutReturnPath()}><Button variant="outline">Return to booking</Button></Link>}
          <Link href="/my-bookings"><Button variant="outline">My bookings</Button></Link>
        </div>
      </CardContent>
    </Card>
  </main>;
}
