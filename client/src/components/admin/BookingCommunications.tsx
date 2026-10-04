import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock3, Loader2, MessageSquareText, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type CommunicationHistory = {
  id: number;
  recipient_role: string;
  kind: string;
  channel: string;
  status: string;
  title: string;
  summary: string;
  created_at: string;
  actorName: string;
};
type Communications = {
  participants: {
    customer: { id: number; name: string; email: string; mobile: string } | null;
    guruji: { id: number; name: string; email: string; mobile: string } | null;
  };
  channels: {
    in_app: { available: true };
    whatsapp: { available: false; reason: string };
    email: { available: false; reason: string };
  };
  history: CommunicationHistory[];
};
type SendForm = {
  recipient: 'customer' | 'guruji' | 'both';
  kind: 'address' | 'otp' | 'notification' | 'message';
  channel: 'in_app' | 'whatsapp' | 'email';
  title: string;
  text: string;
};

function dateLabel(value: string) {
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
}

function readableError(error: Error) {
  const raw = error.message.replace(/^\d+:\s*/, '');
  try {
    const parsed = JSON.parse(raw);
    return parsed.message || parsed.error || raw;
  } catch {
    return raw || 'The message was not sent. Please try again.';
  }
}

export default function BookingCommunications({ booking }: { booking: any }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SendForm>({
    recipient: booking.gurujiId ? 'guruji' : 'customer',
    kind: 'notification',
    channel: 'in_app',
    title: '',
    text: '',
  });
  const [sendError, setSendError] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const endpoint = `/api/admin/bookings/${booking.id}/communications`;
  const { data, isLoading, isError, refetch } = useQuery<Communications>({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await fetch(endpoint, { credentials: 'include', cache: 'no-store' });
      if (!response.ok) throw new Error('Communication details could not be loaded.');
      return response.json();
    },
    enabled: open,
    staleTime: 0,
  });
  const sendMutation = useMutation({
    mutationFn: async (payload: SendForm) => {
      const response = await apiRequest('POST', endpoint, {
        recipient: payload.recipient,
        kind: payload.kind,
        channel: payload.channel,
        ...(['notification', 'message'].includes(payload.kind) && payload.title.trim() ? { title: payload.title.trim() } : {}),
        ...(['notification', 'message'].includes(payload.kind) && payload.text.trim() ? { text: payload.text.trim() } : {}),
      });
      return response.json();
    },
    onSuccess: (result: { message?: string; history?: CommunicationHistory[] }) => {
      setSendError('');
      setForm(current => ({ ...current, title: '', text: '' }));
      queryClient.setQueryData<Communications>([endpoint], old => old ? {
        ...old,
        history: result.history || old.history,
      } : old);
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      refetch();
      toast({ title: 'Communication recorded', description: result.message || 'The in-app notification was sent.' });
    },
    onError: (error: Error) => setSendError(readableError(error)),
  });

  const gurujiAvailable = !!data?.participants.guruji && !!booking.gurujiId;
  const recipientIncludesGuruji = form.recipient === 'guruji' || form.recipient === 'both';
  const recipientInvalid = recipientIncludesGuruji && !gurujiAvailable;
  const otpInvalid = form.kind === 'otp' && booking.status !== 'in_progress';
  const customTextRequired = ['notification', 'message'].includes(form.kind) && !form.text.trim();
  const channelInfo = data?.channels[form.channel];
  const externalUnavailable = form.channel !== 'in_app' && channelInfo?.available === false;
  const sendDisabled = sendMutation.isPending || recipientInvalid || otpInvalid || customTextRequired || externalUnavailable ||
    (form.title.trim().length > 120) || form.text.trim().length > 2000;

  const submit = () => {
    if (sendDisabled) return;
    setSendError('');
    sendMutation.mutate(form);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="flex items-center gap-1.5 text-xs"
        aria-label={`Communicate for booking #${booking.id}`}
        onClick={() => setOpen(true)}
      >
        <MessageSquareText className="h-3.5 w-3.5" />
        Communications
      </Button>
      <Dialog open={open} onOpenChange={value => !sendMutation.isPending && setOpen(value)}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking #{booking.id} communications</DialogTitle>
            <DialogDescription>Audited messages for this booking. Mutual phone numbers are never disclosed.</DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="space-y-3 py-4" aria-label="Loading communication history">
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-20 animate-pulse rounded bg-muted" />
            </div>
          ) : isError || !data ? (
            <div role="alert" className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p>Communications could not be loaded.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-2 sm:grid-cols-2">
                {[['Customer', data.participants.customer], ['Assigned Guruji', data.participants.guruji]].map(([role, participant]) => (
                  <Card key={role as string} className="bg-muted/30">
                    <CardContent className="p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{role as string}</p>
                      <p className="mt-1 font-medium">{(participant as any)?.name || (role === 'Assigned Guruji' ? 'Not assigned' : 'Unavailable')}</p>
                      <p className="truncate text-xs text-muted-foreground">{(participant as any)?.email || 'Email not available'}</p>
                      <p className="text-xs text-muted-foreground">Phone details are private</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <section className="space-y-3 rounded-xl border p-4">
                <div>
                  <h3 className="font-semibold">Send a booking communication</h3>
                  <p className="text-xs text-muted-foreground">Address and OTP details are composed securely by the server; they cannot be pasted here.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Select value={form.recipient} onValueChange={(value: SendForm['recipient']) => setForm(current => ({ ...current, recipient: value }))}>
                    <SelectTrigger aria-label="Recipient"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="guruji" disabled={!gurujiAvailable}>Assigned Guruji</SelectItem>
                      <SelectItem value="both" disabled={!gurujiAvailable}>Both participants</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={form.kind} onValueChange={(value: SendForm['kind']) => setForm(current => ({
                    ...current,
                    kind: value,
                  }))}>
                    <SelectTrigger aria-label="Message type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="message">Message</SelectItem>
                      <SelectItem value="address">Release exact address</SelectItem>
                      <SelectItem value="otp" disabled={booking.status !== 'in_progress'}>Completion OTP</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={form.channel} onValueChange={(value: SendForm['channel']) => setForm(current => ({ ...current, channel: value }))}>
                    <SelectTrigger aria-label="Delivery channel"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_app">In-app inbox</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.channel !== 'in_app' && (
                  <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{(channelInfo as { reason?: string } | undefined)?.reason || `${form.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} connection is not configured. This will not be sent.`}</span>
                  </div>
                )}
                {form.kind === 'otp' && (form.recipient === 'guruji' || form.recipient === 'both') && (
                  <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Sending the completion OTP to the Guruji bypasses customer confirmation. This action is explicitly authorized and will be audited. The code itself is never shown here.</span>
                  </div>
                )}
                {form.kind === 'address' && recipientIncludesGuruji && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                    This explicitly releases the exact booking address to the assigned Guruji now and remains available to them.
                  </div>
                )}
                {form.kind === 'address' && form.recipient === 'customer' && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                    The customer receives their own booking address. This does not release the address to the Guruji.
                  </div>
                )}
                <Input
                  aria-label="Message title"
                  value={form.title}
                  onChange={event => setForm(current => ({ ...current, title: event.target.value.slice(0, 121) }))}
                  maxLength={120}
                  placeholder="Title (optional, up to 120 characters)"
                  disabled={['address', 'otp'].includes(form.kind)}
                />
                {['notification', 'message'].includes(form.kind) && (
                  <div>
                    <Textarea
                      aria-label="Message text"
                      value={form.text}
                      onChange={event => setForm(current => ({ ...current, text: event.target.value.slice(0, 2001) }))}
                      rows={4}
                      maxLength={2000}
                      placeholder="Write a short, booking-specific message..."
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">{form.text.length}/2000</p>
                  </div>
                )}
                {(recipientInvalid || otpInvalid || customTextRequired || (form.title.length > 120) || (form.text.length > 2000)) && (
                  <p role="status" className="text-xs text-amber-800">
                    {recipientInvalid ? 'An assigned Guruji is required for this recipient.' : otpInvalid ? 'Completion OTP can only be sent while the booking is in progress.' : customTextRequired ? 'Enter message text before sending.' : 'Please shorten the title or message to its limit.'}
                  </p>
                )}
                {sendError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{sendError}</p>}
                <DialogFooter>
                  <Button onClick={submit} disabled={sendDisabled}>
                    {sendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareText className="mr-2 h-4 w-4" />}
                    {sendMutation.isPending ? 'Sending…' : form.kind === 'address' ? 'Release address' : form.kind === 'otp' ? 'Send OTP securely' : 'Send in-app'}
                  </Button>
                </DialogFooter>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Audit history</h3>
                    <p className="text-xs text-muted-foreground">Successful sends appear here. Failed attempts show an error above and are not saved to history.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => refetch()}><Clock3 className="mr-1.5 h-4 w-4" />Refresh</Button>
                </div>
                {data.history.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No communications have been recorded for this booking.</p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {data.history.map(item => (
                      <div key={item.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{item.kind === 'otp' ? 'Completion OTP sent securely' : item.title || `${item.kind} · ${item.recipient_role}`}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${item.status === 'sent' || item.status === 'delivered' ? 'bg-green-100 text-green-800' : item.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>{item.status}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{item.recipient_role} · {item.kind} · {item.channel} · {item.actorName} · {dateLabel(item.created_at)}</p>
                        {item.kind === 'otp' ? (
                          <p className="mt-2 text-sm text-muted-foreground">The code itself is intentionally not available in the admin view.</p>
                        ) : item.summary && <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}