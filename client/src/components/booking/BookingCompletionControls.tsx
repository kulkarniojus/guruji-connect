import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock3, KeyRound, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type CompletionData = {
  bookingId: number;
  status: string;
  requestedAt: string | null;
  expiresAt: string | null;
  canResendAt: string | null;
  attemptsRemaining: number;
  verifiedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  completionMethod: 'customer_otp' | 'admin_override' | null;
  otp?: string;
  history?: Array<{ id: number; action: string; actorRole: string; actorUserId: number; actorName?: string; reason?: string; createdAt: string }>;
};

const dateLabel = (value?: string | null) => value
  ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not recorded';

async function sendAction(path: string, body: Record<string, unknown>) {
  const response = await apiRequest('POST', path, body);
  const data = await response.json().catch(() => ({}));
  return data;
}

function readableError(error: Error) {
  const raw = error.message.replace(/^\d+:\s*/, '');
  try {
    const parsed = JSON.parse(raw);
    return parsed.message || parsed.error || raw;
  } catch {
    return raw || 'Please try again.';
  }
}

export default function BookingCompletionControls({ booking }: { booking: { id: number; status: string; [key: string]: any } }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const client = useQueryClient();
  const [otp, setOtp] = useState('');
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [now, setNow] = useState(Date.now);
  const role = user?.role;
  const isAdmin = role === 'admin';
  const allowed = isAdmin || role === 'customer' || role === 'guruji';
  // Never reuse one customer's private code cache for a different signed-in user.
  const queryKey = [`/api/bookings/${booking.id}/completion`, user?.id, role];
  const completionQuery = useQuery<CompletionData>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/bookings/${booking.id}/completion`, { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Completion details could not be loaded.');
      }
      return response.json();
    },
    enabled: !!user && allowed && (isAdmin || booking.status === 'in_progress'),
    refetchInterval: 15000,
    gcTime: 0,
    retry: false,
  });

  const refreshAfterAction = () => {
    [
      ['/api/bookings'],
      ['/api/admin/bookings'],
      ['/api/guruji/bookings'],
      [`/api/bookings/${booking.id}`],
      ['/api/notifications'],
      queryKey,
    ].forEach(key => client.invalidateQueries({ queryKey: key }));
  };
  const actionMutation = useMutation({
    mutationFn: ({ action, body }: { action: 'request' | 'verify' | 'override'; body: Record<string, unknown> }) =>
      sendAction(`/api/bookings/${booking.id}/completion/${action}`, body),
    onSuccess: (_data, variables) => {
      refreshAfterAction();
      setOtp('');
      if (variables.action === 'override') {
        setOverrideOpen(false);
        setReason('');
      }
      toast({ title: variables.action === 'verify' ? 'Puja completion verified' : variables.action === 'override' ? 'Manual completion recorded' : 'Completion code requested', description: 'Booking records have been refreshed.' });
    },
    onError: (error: Error) => {
      client.invalidateQueries({ queryKey });
      toast({ title: 'Action not completed', description: readableError(error), variant: 'destructive' });
    },
  });

  const data = completionQuery.data;
  const status = data?.status ?? booking.status;
  useEffect(() => {
    if (!data?.requestedAt || status !== 'in_progress') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [data?.requestedAt, status]);
  useEffect(() => {
    if (!data || data.status === booking.status) return;
    ['/api/bookings', '/api/admin/bookings', '/api/guruji/bookings', `/api/bookings/${booking.id}`].forEach(key =>
      client.invalidateQueries({ queryKey: [key] }),
    );
  }, [data?.status, booking.status, booking.id, client]);

  if (!user || !allowed || (!isAdmin && status !== 'in_progress')) return null;
  const codeExpired = !!data?.expiresAt && new Date(data.expiresAt).getTime() <= now;
  const locked = data?.attemptsRemaining === 0;
  const cooldown = !!data?.canResendAt && new Date(data.canResendAt).getTime() > now;
  const customerHasCode = role === 'customer' && status === 'in_progress' && !!data?.otp && !codeExpired && !locked;
  const showRequest = status === 'in_progress' && !data?.verifiedAt && !locked &&
    (!data?.requestedAt || codeExpired || (!cooldown && role === 'customer'));
  const canAdminRequest = isAdmin && status === 'in_progress' && !data?.verifiedAt;
  const requestCode = (resend = false) => actionMutation.mutate({ action: 'request', body: resend ? { resend: true } : {} });

  return (
    <Card className="mt-3 border-violet-200 bg-violet-50/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-violet-100 p-2 text-violet-700"><KeyRound className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-violet-950">Puja completion</h3>
            {completionQuery.isLoading ? (
              <div className="mt-2 h-4 w-48 animate-pulse rounded bg-violet-100" aria-label="Loading completion details" />
            ) : completionQuery.isError ? (
              <div role="alert" className="mt-2 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />{completionQuery.error.message}
                <Button size="sm" variant="outline" onClick={() => completionQuery.refetch()}>Retry</Button>
              </div>
            ) : (
              <div className="mt-1 text-sm text-violet-900">
                {status === 'completed' ? (
                  <p className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />{data?.completionMethod === 'admin_override' ? 'Completed by admin override.' : data?.completionMethod === 'customer_otp' ? 'Completed using the customer OTP.' : 'Completed. The completion method was not recorded for this booking.'}</p>
                ) : data?.verifiedAt ? (
                  <p className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" />Customer code verified. Completion is recorded.</p>
                ) : locked ? (
                  <p role="status">Code entry is locked after five unsuccessful attempts. Ask an admin for help.</p>
                ) : customerHasCode ? (
                  <div className="space-y-1">
                    <p>Your one-time completion code:</p>
                    <p className="font-mono text-2xl font-bold tracking-[0.3em] text-violet-950" aria-label="Completion code">{data?.otp}</p>
                    <p className="text-xs">Share this six-digit code with your Guruji to confirm the puja is complete. Valid until {dateLabel(data?.expiresAt)}.</p>
                  </div>
                ) : data?.requestedAt && !codeExpired ? (
                  <p className="flex items-center gap-1.5"><Clock3 className="h-4 w-4" />Code requested. The customer should share their code with the Guruji. Expires {dateLabel(data.expiresAt)}.</p>
                ) : codeExpired ? (
                  <p>The previous code has expired. Request a new code when ready.</p>
                ) : (
                  <p>Completion requires a one-time code shared by the customer. No checkout or payment step is needed.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {!completionQuery.isLoading && !completionQuery.isError && status === 'in_progress' && !data?.verifiedAt && (
          <div className="flex flex-col gap-3 border-t border-violet-200 pt-3">
            {role === 'guruji' && (
              <>
                {locked ? (
                  <Button size="sm" className="w-fit" onClick={() => requestCode(true)} disabled={actionMutation.isPending || cooldown}>
                    {actionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Request a fresh customer code
                  </Button>
                ) : !data?.requestedAt || codeExpired ? (
                  <Button size="sm" className="w-fit" onClick={() => requestCode(false)} disabled={actionMutation.isPending}>
                    {actionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Request customer code
                  </Button>
                ) : cooldown ? (
                  <p className="text-xs text-violet-800">Another code can be requested at {dateLabel(data.canResendAt)}.</p>
                ) : (
                  <Button size="sm" variant="outline" className="w-fit" onClick={() => requestCode(true)} disabled={actionMutation.isPending}>
                    {actionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Resend customer code
                  </Button>
                )}
                {data?.requestedAt && codeExpired && <p className="text-xs text-violet-800">Request a fresh code before entering it.</p>}
                {data?.requestedAt && !codeExpired && !locked && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      aria-label="Customer-shared six-digit completion code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      className="sm:max-w-56 bg-white tracking-widest"
                    />
                    <Button size="sm" onClick={() => actionMutation.mutate({ action: 'verify', body: { otp } })} disabled={otp.length !== 6 || actionMutation.isPending}>
                      {actionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verify & complete
                    </Button>
                  </div>
                )}
              </>
            )}
            {role === 'customer' && (
              <div className="flex flex-wrap items-center gap-2">
                {locked && (
                  <Button size="sm" variant="outline" onClick={() => requestCode(true)} disabled={actionMutation.isPending || cooldown}>
                    {actionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Get a new code
                  </Button>
                )}
                {showRequest && (
                  <Button size="sm" variant="outline" onClick={() => requestCode(!!data?.requestedAt)} disabled={actionMutation.isPending || cooldown}>
                    {actionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {data?.requestedAt ? 'Get a new code' : 'Request completion code'}
                  </Button>
                )}
                {cooldown && <span className="text-xs text-violet-800">You can request another code at {dateLabel(data?.canResendAt)}.</span>}
                {!customerHasCode && data?.requestedAt && !codeExpired && !cooldown && <span className="text-xs text-violet-800">A code is active. Ask your Guruji to enter the code you share.</span>}
              </div>
            )}
            {canAdminRequest && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => requestCode(!!data?.requestedAt)} disabled={actionMutation.isPending}>
                  {actionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {data?.requestedAt ? 'Resend customer code' : 'Request customer code'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setOverrideOpen(true)} disabled={actionMutation.isPending}>Manual completion</Button>
              </div>
            )}
          </div>
        )}

        {isAdmin && data && (
          <div className="border-t border-violet-200 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-800">Admin audit</p>
            <div className="grid grid-cols-1 gap-x-5 gap-y-1 text-xs text-violet-950 sm:grid-cols-2">
              <p>Code requested: {dateLabel(data.requestedAt)}</p>
              <p>Code expires: {dateLabel(data.expiresAt)}</p>
               <p>Code state: {data.verifiedAt ? 'Verified and consumed' : data.completionMethod === 'admin_override' ? 'Invalidated by admin override' : status !== 'in_progress' && data.requestedAt ? 'Unavailable (booking closed)' : locked ? 'Locked' : codeExpired ? 'Expired' : data.requestedAt ? 'Active' : 'Not requested'}</p>
              <p>Attempts remaining: {data.attemptsRemaining}</p>
              <p>Verification: {data.verifiedAt ? dateLabel(data.verifiedAt) : 'Not verified'}</p>
              <p>Started: {dateLabel(data.startedAt)}</p>
              <p>Completed: {dateLabel(data.completedAt)}</p>
               <p>Completion method: {data.completionMethod === 'admin_override' ? 'Admin override (not OTP verified)' : data.completionMethod === 'customer_otp' ? 'Customer OTP verified' : status === 'completed' ? 'Not recorded (legacy booking)' : 'Not completed'}</p>
            </div>
            {!!data.history?.length && (
              <div className="mt-3 space-y-2 border-t border-violet-200 pt-3">
                <p className="text-xs font-semibold text-violet-900">Completion history</p>
                {data.history.map(item => (
                  <div key={item.id} className="rounded-md bg-white/80 p-2 text-xs">
                    <p className="font-medium">{item.action.replace(/_/g, ' ')} · {item.actorName || item.actorRole} · {dateLabel(item.createdAt)}</p>
                    {item.reason && <p className="mt-1 text-violet-800">Reason: {item.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={overrideOpen} onOpenChange={open => !actionMutation.isPending && setOverrideOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete booking by admin override</DialogTitle>
            <DialogDescription>This records an explicit manual completion, not an OTP verification. The reason is included in the audit history.</DialogDescription>
          </DialogHeader>
          <label htmlFor={`override-reason-${booking.id}`} className="text-sm font-medium">Reason (10–1000 characters)</label>
          <Textarea
            id={`override-reason-${booking.id}`}
            value={reason}
            onChange={event => setReason(event.target.value.slice(0, 1000))}
            minLength={10}
            maxLength={1000}
            rows={4}
            placeholder="Explain why this in-progress booking needs manual completion."
          />
          <p className="text-right text-xs text-muted-foreground">{reason.trim().length}/1000</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)} disabled={actionMutation.isPending}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 10 || actionMutation.isPending}
              onClick={() => actionMutation.mutate({ action: 'override', body: { reason: reason.trim() } })}
            >
              {actionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}