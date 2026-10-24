import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type RefundRequest = {
  id: number;
  bookingId: number | null;
  eventRegistrationId: string | null;
  customerName: string;
  amount: number;
  stripeAmount: number;
  manualAmount: number;
  sourceKind: 'stripe' | 'manual' | 'mixed';
  status: 'pending' | 'processing' | 'manual_pending' | 'paid' | 'failed';
  reason: string;
  stripeRefundId: string | null;
  stripeFailure: string | null;
  manualReference: string | null;
  createdAt: string;
  pujaName: string | null;
  pujaDate: string | null;
  pujaTime: string | null;
  eventName: string | null;
  childName: string | null;
};

const rupees = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const stamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
  }) + ' IST';
};
const statusText: Record<RefundRequest['status'], string> = {
  pending: 'Awaiting approval',
  processing: 'Stripe processing',
  manual_pending: 'Manual payout needed',
  paid: 'Paid',
  failed: 'Needs review',
};

export default function RefundRequestsAdmin() {
  const client = useQueryClient();
  const { toast } = useToast();
  const [references, setReferences] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<RefundRequest[]>({
    queryKey: ['/api/admin/refunds'],
    queryFn: async () => (await apiRequest('GET', '/api/admin/refunds')).json(),
    refetchInterval: 15000,
    staleTime: 0,
  });
  const refreshData = () => {
    ['/api/admin/refunds', '/api/admin/bookings', '/api/admin/customers', '/api/notifications',
      '/api/admin/events', '/api/event-registrations'].forEach(key => client.invalidateQueries({ queryKey: [key] }));
  };
  const approve = useMutation({
    mutationFn: async (id: number) => (await apiRequest('POST', `/api/admin/refunds/${id}/approve`, {})).json(),
    onSuccess: (result: any) => { toast({ title: 'Refund decision saved', description: result.message }); refreshData(); },
    onError: (error: Error) => toast({ title: 'Refund approval failed', description: error.message, variant: 'destructive' }),
  });
  const reconcile = useMutation({
    mutationFn: async (id: number) => (await apiRequest('POST', `/api/admin/refunds/${id}/reconcile`, {})).json(),
    onSuccess: (result: any) => { toast({ title: 'Refund status updated', description: `Status: ${statusText[result.status as RefundRequest['status']] || result.status}` }); refreshData(); },
    onError: (error: Error) => toast({ title: 'Could not refresh Stripe status', description: error.message, variant: 'destructive' }),
  });
  const settle = useMutation({
    mutationFn: async (item: RefundRequest) => (await apiRequest('POST', `/api/admin/refunds/${item.id}/settle`, {
      reference: references[item.id]?.trim(), note: notes[item.id]?.trim() || '',
    })).json(),
    onSuccess: (result: any, item) => {
      setReferences(current => ({ ...current, [item.id]: '' }));
      setNotes(current => ({ ...current, [item.id]: '' }));
      toast({ title: 'Manual payout recorded', description: result.message });
      refreshData();
    },
    onError: (error: Error) => toast({ title: 'Payout record failed', description: error.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading refund approvals…</div>;
  if (isError) return <div role="alert" className="rounded-lg border p-4">
    <p>Refund approvals could not be loaded.</p>
    <Button variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>Retry</Button>
  </div>;

  const pendingCount = data.filter(item => item.status !== 'paid').length;
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-amber-700" />Refund approvals</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Cancellations remain unchanged. Approving a live Stripe refund sends it to the original payment method.
            Manual refunds must be paid outside the app, then marked paid here with the payout reference.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{pendingCount} refund request(s) need action · {data.length} total</p>
      {data.length === 0 ? <div className="rounded-md bg-muted/40 p-5 text-center text-sm text-muted-foreground">
        No refunds are awaiting review. New requests appear here when a paid puja or event registration is cancelled.
      </div> : (
        <ul className="space-y-3">
          {data.map(item => {
            const isEvent = Boolean(item.eventRegistrationId);
            const title = isEvent
              ? `${item.eventName || 'Event'}${item.childName ? ` · ${item.childName}` : ''}`
              : `${item.pujaName || 'Puja'} · Booking #${item.bookingId}`;
            const busy = approve.isPending || reconcile.isPending || settle.isPending;
            const pendingApproval = item.status === 'pending' || item.status === 'failed';
            const transferReference = references[item.id] || '';
            return (
              <li key={item.id} className="space-y-3 rounded-lg border bg-background p-4" data-testid={`refund-request-${item.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">Customer: {item.customerName} · Created {stamp(item.createdAt)}</p>
                    {!isEvent && <p className="text-sm text-muted-foreground">Scheduled {item.pujaDate || 'date not recorded'}{item.pujaTime ? ` at ${item.pujaTime}` : ''}</p>}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    item.status === 'paid' ? 'bg-green-100 text-green-800'
                      : item.status === 'failed' ? 'bg-red-100 text-red-800'
                        : item.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900'
                  }`}>{statusText[item.status]}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <p><span className="text-muted-foreground">Total due</span><br /><strong>{rupees(item.amount)}</strong></p>
                  {item.stripeAmount > 0 && <p><span className="text-muted-foreground">Stripe to original method</span><br /><strong>{rupees(item.stripeAmount)}</strong></p>}
                  {item.manualAmount > 0 && <p><span className="text-muted-foreground">Manual payout</span><br /><strong>{rupees(item.manualAmount)}</strong></p>}
                  <p><span className="text-muted-foreground">Payment source</span><br /><strong className="capitalize">{item.sourceKind}</strong></p>
                </div>
                <p className="text-sm"><span className="font-medium">Cancellation reason:</span> {item.reason}</p>
                {item.stripeRefundId && <p className="text-xs text-muted-foreground">Stripe refund reference: {item.stripeRefundId}</p>}
                {item.stripeFailure && <p role="alert" className="text-sm text-red-700">Stripe status needs review: {item.stripeFailure}</p>}

                {pendingApproval && <div className="space-y-2">
                  {item.stripeAmount > 0 && <p className="text-xs text-amber-900">
                    Approval sends {rupees(item.stripeAmount)} through Stripe to the original payment method. Check this amount before approving.
                  </p>}
                  <Button size="sm" variant={item.stripeAmount > 0 ? 'destructive' : 'default'} disabled={busy}
                    onClick={() => {
                      const prompt = item.stripeAmount > 0
                        ? `Issue a Stripe refund of ${rupees(item.stripeAmount)} to the original payment method for ${title}?`
                        : `Approve the manual refund of ${rupees(item.manualAmount)} for ${title}?`;
                      if (window.confirm(prompt)) approve.mutate(item.id);
                    }}>
                    {approve.isPending && approve.variables === item.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {item.status === 'failed' ? 'Retry Stripe refund safely' : item.stripeAmount > 0 ? 'Approve & issue Stripe refund' : 'Approve manual payout'}
                  </Button>
                </div>}
                {item.status === 'processing' && <Button size="sm" variant="outline" disabled={busy}
                  onClick={() => reconcile.mutate(item.id)}>
                  {reconcile.isPending && reconcile.variables === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                  Check Stripe status
                </Button>}
                {item.status === 'manual_pending' && <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
                  <Input value={transferReference} onChange={event => setReferences(current => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="Bank / UPI payout reference" aria-label={`Payout reference for refund ${item.id}`} />
                  <Textarea value={notes[item.id] || ''} onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="Optional payout note" aria-label={`Payout note for refund ${item.id}`} rows={1} />
                  <Button size="sm" disabled={busy || transferReference.trim().length < 2}
                    onClick={() => settle.mutate(item)}>
                    {settle.isPending && settle.variables?.id === item.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Mark manual payout paid
                  </Button>
                </div>}
                {item.status === 'paid' && <p className="text-sm text-green-800">Refund completed{item.manualReference ? ` · manual reference ${item.manualReference}` : ''}.</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
