import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminCheckoutRecord } from '@workspace/api-client-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function CheckoutHistory() {
  const client=useQueryClient(),{toast}=useToast();
  const orders=useQuery<AdminCheckoutRecord[]>({
    queryKey:['/api/admin/payments/checkouts'],refetchInterval:15000,
    queryFn:async()=>{
      const response=await apiRequest('GET','/api/admin/payments/checkouts');
      return response.json();
    },
  });
  const check=useMutation({
    mutationFn:async(id:string)=>(await apiRequest('POST',`/api/admin/payments/checkouts/${id}/reconcile`)).json(),
    onSuccess:result=>{
      void client.invalidateQueries({queryKey:['/api/admin/payments/checkouts']});
      void client.invalidateQueries({queryKey:['/api/admin/bookings']});
      toast({title:result.state==='paid'?'Payment verified; booking saved':`Payment status: ${result.state}`,
        description:'This action only checks the original gateway. It does not charge the customer.'});
    },
    onError:error=>toast({title:'Verification unavailable',description:String(error),variant:'destructive'}),
  });
  return <Card>
    <CardHeader>
      <CardTitle>Checkout attempts</CardTitle>
      <CardDescription>Latest 100 Cashfree and legacy Stripe attempts. Verified live advances also appear in Customer Activity and Guruji Finance. Refunds are managed under Refund approvals.</CardDescription>
    </CardHeader>
    <CardContent>
      <Button variant="outline" size="sm" onClick={()=>void orders.refetch()} disabled={orders.isFetching}>Refresh history</Button>
      {orders.isLoading && <p className="mt-4 text-sm">Loading checkout history…</p>}
      {orders.isError && <p role="alert" className="mt-4 text-sm text-red-700">Checkout history could not be loaded.</p>}
      {orders.data?.length===0 && <p className="mt-4 text-sm text-muted-foreground">No checkout attempts yet.</p>}
      {!!orders.data?.length && <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead><tr className="border-b"><th className="p-2">Created (IST)</th><th className="p-2">Customer / booking</th><th className="p-2">Amount</th><th className="p-2">Outcome</th><th className="p-2">Verification</th></tr></thead>
          <tbody>{orders.data.map(order=><tr key={order.id} className="border-b align-top">
            <td className="p-2">{new Date(order.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}<p className="mt-1 text-xs font-medium">{order.provider||'stripe'} · {order.livemode?'LIVE':'TEST — no real collection'}</p></td>
            <td className="p-2">{order.customerName} #{order.customerId}<p>{order.bookingId?`Booking #${order.bookingId}`:'No booking yet'}</p></td>
            <td className="p-2">Advance ₹{Number(order.advanceAmount).toLocaleString('en-IN')} ({order.advancePercentage}%)<p className="text-xs text-muted-foreground">Total ₹{Number(order.totalAmount).toLocaleString('en-IN')}</p></td>
            <td className="p-2 capitalize">{order.state}{order.needsSupport && <p className="max-w-40 text-xs text-red-700">Paid checkout needs support-team reassignment / refund review.</p>}<p className="max-w-44 break-all text-xs normal-case text-muted-foreground">{order.paymentReference||'Payment not verified'}</p></td>
            <td className="p-2"><Button size="sm" variant="outline" disabled={check.isPending||!order.sessionId} onClick={()=>check.mutate(order.id)}>Check payment</Button></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </CardContent>
  </Card>;
}
