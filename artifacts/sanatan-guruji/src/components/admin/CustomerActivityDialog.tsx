import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, ReceiptText, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type EntryType = 'payment' | 'refund' | 'additional_charge' | 'credit';
type PaidBy = 'portal' | 'guruji';

interface Booking {
  id: number; pujaName: string; status: string; bookedAt: string | null; date: string | null; time: string | null;
  cancellationReason: string | null; cancelledBy: string | null; policyCharge: number;
  recordedPaid: number; refunded: number; refundOwed: number; additionalPaymentDue: number; adjustments: number;
}
interface Activity {
  customer: { id: number; firstName: string; lastName: string };
  summary: {
    bookingCount: number; cancelledCount: number; completedCount: number; recordedPaid: number;
    refundOwed: number; refunded: number; additionalPaymentDue: number;
  };
  bookings: Booking[];
  entries: { id: string | number; bookingId: number; type: string; amount: number; reference: string | null; reason: string | null; createdAt: string; paidBy: string | null }[];
  cancellationEvents: { id: number | string; bookingId: number; reason: string | null; kind: string; status: string; charge: number; createdAt: string }[];
}

const money = (v: unknown) => `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const stamp = (v?: string | null) => {
  if (!v) return 'Not recorded';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST';
};
const label = (v?: string | null) => (v || '').replaceAll('_', ' ') || 'None';
const typeLabels: Record<EntryType, string> = {
  payment: 'Payment received', refund: 'Refund paid manually', additional_charge: 'Additional charge', credit: 'Credit',
};
const blank = { bookingId: '', type: 'payment' as EntryType, amount: '', reference: '', reason: '', paidBy: 'portal' as PaidBy };

function Stat({ title, value, tone }: { title: string; value: string | number; tone?: string }) {
  return (
    <div className="min-w-0 border-l-2 border-primary/40 py-1 pl-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
      <p className={`mt-1 truncate font-mono text-lg font-semibold ${tone || ''}`}>{value}</p>
    </div>
  );
}

function Body({ customerId, customerName }: { customerId: number; customerName: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(blank);
  const key = [`/api/admin/customers/${customerId}/activity`];

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<Activity>({
    refetchInterval: 15000,
    queryKey: key,
    queryFn: async () => (await apiRequest('GET', `/api/admin/customers/${customerId}/activity`)).json(),
    staleTime: 0,
  });

  const isActual = form.type === 'payment' || form.type === 'refund';
  const amountNum = Number(form.amount);
  const amountOk = form.amount !== '' && amountNum > 0 && Math.round(amountNum * 100) / 100 === amountNum;
  const valid = Number(form.bookingId) > 0 && amountOk && form.reason.trim().length >= 5 &&
    (!isActual || form.reference.trim().length >= 3);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/admin/customers/${customerId}/finance`, {
        bookingId: Number(form.bookingId), type: form.type, amount: amountNum,
        reference: form.reference.trim(), reason: form.reason.trim(), paidBy: form.paidBy,
      });
      return (await res.json()) as { message: string };
    },
    onSuccess: result => {
      setForm(blank);
      ['/api/admin/customers', '/api/admin/bookings', '/api/admin/guruji-finance', '/api/notifications']
        .forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
      queryClient.invalidateQueries({ queryKey: key });
      toast({ title: 'Record saved', description: result.message });
    },
    onError: (e: Error) => toast({ title: 'Could not save record', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="space-y-3" aria-label="Loading activity"><div className="h-24 animate-pulse rounded-lg bg-muted" /><div className="h-48 animate-pulse rounded-lg bg-muted" /></div>;
  if (isError || !data) return (
    <div role="alert" className="rounded-lg border border-destructive/30 p-5">
      <p className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4 text-destructive" />Activity could not be loaded.</p>
      <p className="mt-1 text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Please try again.'}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
    </div>
  );

  const s = data.summary;
  const set = (patch: Partial<typeof blank>) => setForm(c => ({ ...c, ...patch }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat title="Total bookings" value={s.bookingCount} />
        <Stat title="Cancelled" value={s.cancelledCount} />
        <Stat title="Completed" value={s.completedCount} />
        <Stat title="Payments recorded" value={money(s.recordedPaid)} tone="text-emerald-800" />
        <Stat title="Refund owed" value={money(s.refundOwed)} tone="text-amber-800" />
        <Stat title="Refunds recorded" value={money(s.refunded)} />
        <Stat title="Additional money due" value={money(s.additionalPaymentDue)} tone="text-rose-800" />
      </div>

      <section className="space-y-3">
        <h3 className="font-semibold">Bookings</h3>
        {data.bookings.length === 0 ? (
          <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">This customer has no bookings yet.</div>
        ) : data.bookings.map(b => {
          const events = data.cancellationEvents.filter(e => e.bookingId === b.id);
          const entries = data.entries.filter(e => e.bookingId === b.id);
          return (
            <article key={b.id} className="rounded-lg border p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{b.pujaName} <span className="text-xs text-muted-foreground">Booking #{b.id}</span></p>
                  <p className="text-xs text-muted-foreground">Booked {stamp(b.bookedAt)}</p>
                  <p className="text-xs text-muted-foreground">Scheduled {b.date || 'no date'}{b.time ? ` at ${b.time}` : ''}</p>
                </div>
                <Badge variant="outline" className="capitalize">{label(b.status)}</Badge>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
                {([['Paid', b.recordedPaid], ['Refunded', b.refunded], ['Refund owed', b.refundOwed],
                  ['Additional due', b.additionalPaymentDue], ['Policy charge', b.policyCharge], ['Adjustments', b.adjustments]] as const)
                  .map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-mono">{money(v)}</dd></div>)}
              </dl>
              {(b.cancellationReason || b.cancelledBy) && (
                <p className="mt-3 rounded-md bg-muted/40 p-2 text-xs">Cancelled by {label(b.cancelledBy)}: {b.cancellationReason || 'No reason given'}</p>
              )}
              {events.length > 0 && (
                <div className="mt-3 space-y-1 text-xs">
                  <p className="font-semibold">Cancellation history</p>
                  {events.map(e => <p key={e.id} className="border-l pl-2 text-muted-foreground">{stamp(e.createdAt)} · {label(e.kind)} · {label(e.status)} · charge {money(e.charge)}{e.reason ? ` · ${e.reason}` : ''}</p>)}
                </div>
              )}
              {entries.length > 0 && (
                <div className="mt-3 space-y-1 text-xs">
                  <p className="font-semibold">Finance records</p>
                  {entries.map(e => <p key={e.id} className="border-l pl-2 text-muted-foreground">{stamp(e.createdAt)} · {label(e.type)} · {money(e.amount)}{e.paidBy ? ` · by ${e.paidBy}` : ''}{e.reference ? ` · ref ${e.reference}` : ''}{e.reason ? ` · ${e.reason}` : ''}</p>)}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <h3 className="font-semibold">Record finance entry</h3>
        <p className="text-xs leading-5 text-muted-foreground">
          Records only. This does not transfer, charge or refund any money automatically. Record a payment or refund only after it has really happened. Closed bookings and refunds above what was paid are rejected.
        </p>
        {data.bookings.length === 0 ? <p className="text-sm text-muted-foreground">A booking is required before a record can be added.</p> : (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); if (valid) mutation.mutate(); }}>
            <div className="space-y-1.5">
              <Label htmlFor="cad-booking">Booking</Label>
              <select id="cad-booking" required value={form.bookingId} onChange={e => set({ bookingId: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select booking</option>
                {data.bookings.map(b => <option key={b.id} value={b.id}>#{b.id} · {b.pujaName} · {label(b.status)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cad-type">Record type</Label>
              <select id="cad-type" value={form.type} onChange={e => set({ type: e.target.value as EntryType })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {(Object.keys(typeLabels) as EntryType[]).map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cad-amount">Amount (INR)</Label>
              <Input id="cad-amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={e => set({ amount: e.target.value })} />
              {form.amount !== '' && !amountOk && <p className="text-xs text-destructive">Enter a positive amount with at most 2 decimals.</p>}
            </div>
            {isActual && (
              <div className="space-y-1.5">
                <Label htmlFor="cad-paidby">{form.type === 'payment' ? 'Received by' : 'Refund paid by'}</Label>
                <select id="cad-paidby" value={form.paidBy} onChange={e => set({ paidBy: e.target.value as PaidBy })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="portal">Portal</option>
                  <option value="guruji">Guruji</option>
                </select>
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cad-ref">{isActual ? 'Transaction reference (min 3 characters)' : 'Reference (optional)'}</Label>
              <Input id="cad-ref" maxLength={200} value={form.reference} onChange={e => set({ reference: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cad-reason">Reason (min 5 characters)</Label>
              <Textarea id="cad-reason" rows={3} maxLength={500} value={form.reason} onChange={e => set({ reason: e.target.value })} />
            </div>
            <div className="flex items-center justify-between gap-3 sm:col-span-2">
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />Refresh
              </Button>
              <Button type="submit" disabled={!valid || mutation.isPending} aria-label={`Save record for ${customerName}`}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save record
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default function CustomerActivityDialog({ customerId, customerName }: { customerId: number; customerName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} aria-label={`View activity and finance for ${customerName}`}>
        <ReceiptText className="mr-1.5 h-3.5 w-3.5" /> Activity
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Activity and finance: {customerName}</DialogTitle>
            <DialogDescription>Bookings, cancellations and recorded money for customer #{customerId}.</DialogDescription>
          </DialogHeader>
          {open && <Body key={customerId} customerId={customerId} customerName={customerName} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
