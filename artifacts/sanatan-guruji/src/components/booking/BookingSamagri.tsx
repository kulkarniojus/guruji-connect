import { useGetBookingSamagri, useResendBookingSamagri, getGetBookingSamagriQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function BookingSamagri({ bookingId, admin = false }: { bookingId: number; admin?: boolean }) {
  const [open, setOpen] = useState(!admin);
  const { toast } = useToast();
  const query = useGetBookingSamagri(bookingId, {
    query: { queryKey: getGetBookingSamagriQueryKey(bookingId), enabled: open && Number.isSafeInteger(bookingId), staleTime: 0, refetchInterval: open ? 30000 : false },
  });
  const resend = useResendBookingSamagri({
    mutation: {
      onSuccess: async () => {
        await query.refetch();
        toast({ title: 'Samagri list resent in-app', description: 'WhatsApp was not sent because WhatsApp Business is not connected.' });
      },
      onError: (error) => toast({ title: 'Could not resend', description: error.message, variant: 'destructive' }),
    },
  });
  return <section className="rounded-lg border bg-white p-4 space-y-3" aria-label="Booking samagri">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">Puja samagri checklist</h3>
      {admin && <Button type="button" variant="outline" size="sm" onClick={() => setOpen(value => !value)}>
        {open ? 'Hide samagri' : 'View / resend samagri'}
      </Button>}
    </div>
    {open && <>
      {query.isLoading && <p role="status" className="text-sm">Loading samagri…</p>}
      {query.isError && <div><p className="text-sm text-red-700">Unable to load samagri.</p><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></div>}
      {query.data && <>
        <p className="text-sm text-muted-foreground">For {query.data.pujaName} · booking #{bookingId}. Please prepare the mandatory items; optional items are not required.</p>
        {!query.data.items.length ? <p className="text-sm">The samagri list has not been configured for this puja yet. Please contact the Vaidik Dhara support team.</p>
          : [false, true].map(optional => {
            const items = query.data.items.filter(item => item.optional === optional);
            return items.length > 0 && <div key={String(optional)}>
              <h4 className="mb-2 text-sm font-semibold">{optional ? 'Optional items' : 'Mandatory items'}</h4>
              <ul className="space-y-2">{items.map((item, index) => <li key={index} className="flex items-center gap-3 rounded border p-2">
                {item.imageUrl && <a href={item.imageUrl} target="_blank" rel="noreferrer" aria-label={`View photo of ${item.name}`}>
                  <img loading="lazy" src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded object-cover" />
                </a>}
                <div className="min-w-0"><p className="text-sm font-medium break-words">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Quantity: {item.quantity} {item.unit ?? ''}</p></div>
              </li>)}</ul>
            </div>;
          })}
        {admin && <div className="space-y-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">Resending uses the latest saved puja list, updates this booking’s checklist, and notifies its customer in-app.</p>
          <Button type="button" size="sm" disabled={resend.isPending}
            onClick={() => resend.mutate({ bookingId })}>{resend.isPending ? 'Sending…' : 'Resend latest samagri list in-app'}</Button>
          <Button type="button" size="sm" variant="outline" disabled title={query.data.whatsappReason} className="ml-2">
            Resend on WhatsApp · not connected
          </Button>
          <p className="text-xs text-amber-800">{query.data.whatsappReason}</p>
          {query.data.history.length > 0 && <details className="text-xs"><summary className="cursor-pointer">Samagri delivery history</summary>
            <ul className="mt-2 space-y-1">{query.data.history.map((event, index) => <li key={index}>
              {new Date(event.createdAt).toLocaleString('en-IN')} · {event.channel === 'whatsapp' ? 'WhatsApp' : 'In-app'} · {event.status.replaceAll('_', ' ')}
            </li>)}</ul></details>}
        </div>}
      </>}
    </>}
  </section>;
}
