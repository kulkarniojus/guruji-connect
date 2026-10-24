import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "wouter";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import {
  useListMyEventRegistrations, getListMyEventRegistrationsQueryKey, useStartEventCheckout,
  useReconcileEventCheckout, useCancelEventRegistration, getGetEventQueryKey, getListEventsQueryKey,
  useGetEvent, getListCustomerRefundsQueryKey, useListCustomerRefunds,
  type EventRegistration,
} from "@workspace/api-client-react";
import { EventsNav, StatusBadge, errMsg, fmtDateTime, rupees } from "@/components/events/eventUtils";
import RefundProgress from "@/components/payments/RefundProgress";

function EventLinks({ eventId }: { eventId: number }) {
  const { data } = useGetEvent(eventId, { query: { queryKey: getGetEventQueryKey(eventId) } });
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <Link href={`/services/events/${eventId}`} className="text-primary underline" data-testid={`link-event-${eventId}`}>Open event</Link>
      {data?.meetingUrl && <a href={data.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline" data-testid={`link-join-${eventId}`}>Join link (available once fully paid)</a>}
    </div>
  );
}

export default function MyEventRegistrations() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useListMyEventRegistrations({
    query: { queryKey: getListMyEventRegistrationsQueryKey(), refetchInterval: 20000 },
  });
  const refunds = useListCustomerRefunds({
    query: {
      queryKey: getListCustomerRefundsQueryKey(),
      refetchInterval: 20000,
      refetchOnWindowFocus: true,
    },
  });
  const checkout = useStartEventCheckout();
  const reconcile = useReconcileEventCheckout();
  const cancel = useCancelEventRegistration();
  const [notice, setNotice] = useState("");
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [cancelFor, setCancelFor] = useState<EventRegistration | null>(null);
  const [reason, setReason] = useState("");
  const [cancelErr, setCancelErr] = useState("");
  const reconciled = useRef(false);

  const refresh = (eventId?: number) => {
    qc.invalidateQueries({ queryKey: getListMyEventRegistrationsQueryKey() });
    qc.invalidateQueries({ queryKey: getListCustomerRefundsQueryKey() });
    if (eventId) qc.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
    qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
  };

  const doReconcile = (id: string, silent = false) => {
    reconcile.mutate({ registrationId: id }, {
      onSuccess: r => {
        qc.setQueryData(getListMyEventRegistrationsQueryKey(), (old: EventRegistration[] | undefined) => old?.map(x => x.id === r.id ? r : x));
        refresh(r.eventId);
        setNotice(r.paid >= r.fee && r.fee > 0 ? "Payment confirmed by the server." : `Payment is not confirmed yet (status: ${r.status.replace(/_/g, " ")}). If you paid, check again shortly.`);
      },
      onError: e => { if (!silent) setMsg(m => ({ ...m, [id]: errMsg(e) })); setNotice("We could not verify your payment yet. Please check again."); },
    });
  };

  useEffect(() => {
    if (reconciled.current) return;
    const p = new URLSearchParams(window.location.search);
    const id = p.get("registrationId");
    if (p.get("payment") === "return" && id && /^[0-9a-f-]{36}$/i.test(id)) {
      reconciled.current = true;
      setNotice("Verifying your payment with the server...");
      doReconcile(id, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resume = (id: string) => {
    checkout.mutate({ registrationId: id }, {
      onSuccess: res => {
        try {
          const u = new URL(res.url);
          if (u.protocol === "https:" && u.hostname === "checkout.stripe.com") { window.location.assign(u.toString()); return; }
        } catch { /* fallthrough */ }
        setMsg(m => ({ ...m, [id]: "Checkout link was not a recognised secure Stripe page." }));
      },
      onError: e => setMsg(m => ({ ...m, [id]: errMsg(e) })),
    });
  };

  const submitCancel = () => {
    if (!cancelFor) return;
    if (reason.trim().length < 3) return setCancelErr("Please give a reason.");
    cancel.mutate({ registrationId: cancelFor.id, data: { reason: reason.trim() } }, {
      onSuccess: () => { refresh(cancelFor.eventId); setCancelFor(null); setReason(""); setCancelErr(""); setNotice("Registration cancelled. Cancelling does not refund automatically; any refund due is shown on the registration."); },
      onError: e => setCancelErr(errMsg(e)),
    });
  };

  const regs = data ?? [];
  return (
    <MainLayout>
      <div className="container mx-auto max-w-4xl py-12">
        <h1 className="mb-2 text-3xl font-bold">My event registrations</h1>
        <p className="mb-6 text-gray-600">Visible only to you.</p>
        <EventsNav active="mine" />
        {refunds.isError && (
          <p role="alert" className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            Refund progress is temporarily unavailable. Refresh this page to try again.
          </p>
        )}
        {notice && <p role="status" className="mb-4 rounded-md border bg-muted p-3 text-sm" data-testid="text-payment-notice">{notice}</p>}
        {isLoading ? <div className="space-y-4">{[0, 1].map(i => <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />)}</div>
          : isError ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <span>Registrations could not be loaded.</span>
              <Button variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
            </div>
          ) : regs.length === 0 ? (
            <div className="rounded-md border bg-card p-10 text-center" data-testid="text-no-registrations">
              <p className="mb-4 text-muted-foreground">You have not registered a child for any event yet.</p>
              <Button asChild><Link href="/services/events">Browse events</Link></Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {regs.map(r => {
                const awaiting = r.paymentMethod === "online" && r.balanceDue > 0 && !r.status.includes("cancel") && !r.status.includes("expired");
                const awaitingManualConfirmation = r.status === "pending_confirmation";
                const cancelled = r.status.includes("cancel");
                return (
                  <li key={r.id} className="rounded-lg border bg-card p-4" data-testid={`card-registration-${r.id}`}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold">{r.eventName}</h2>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">Child: {r.childName}, age {r.childAge} - registered {fmtDateTime(r.createdAt)}</p>
                    {r.isTest && <p className="mt-2 flex items-center gap-2 text-sm text-amber-900"><AlertTriangle className="h-4 w-4" />Test registration. Any payment here is test money, not real.</p>}
                    {awaitingManualConfirmation && <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Your manual-payment registration is awaiting confirmation by the Sanatan Guruji support team. It is not confirmed yet.</p>}
                    <dl className="my-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                      {([[r.isTest ? "Fee (test)" : "Fee", r.fee], [r.isTest ? "Paid (test)" : "Paid", r.paid], [r.isTest ? "Refunded (test)" : "Refunded", r.refunded], ["Balance due", r.balanceDue], ["Refund due", r.refundDue]] as const).map(([k, v]) => (
                        <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{rupees(v)}</dd></div>
                      ))}
                    </dl>
                    {awaiting && r.holdUntil && <p className="text-sm">Seat held until {fmtDateTime(r.holdUntil)}.</p>}
                    {cancelled && r.cancellationReason && <p className="text-sm">Reason: {r.cancellationReason}</p>}
                    {refunds.data?.find(refund => refund.eventRegistrationId === r.id) && (
                      <RefundProgress
                        refund={refunds.data.find(refund => refund.eventRegistrationId === r.id)!}
                        testId={`status-refund-registration-${r.id}`}
                      />
                    )}
                    {r.payments.length > 0 && (
                      <ul className="my-2 text-sm text-muted-foreground">{r.payments.map((p, i) => <li key={i}>{p.type} {rupees(p.amount)} - ref {p.reference || "n/a"} - {fmtDateTime(p.createdAt)}</li>)}</ul>
                    )}
                    {msg[r.id] && <p role="alert" className="text-sm text-destructive">{msg[r.id]}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {awaiting && <Button size="sm" onClick={() => resume(r.id)} disabled={checkout.isPending} data-testid={`button-resume-${r.id}`}>Resume online payment</Button>}
                      {awaiting && <Button size="sm" variant="outline" onClick={() => doReconcile(r.id)} disabled={reconcile.isPending} data-testid={`button-reconcile-${r.id}`}>Check payment status</Button>}
                      {!cancelled && <Button size="sm" variant="outline" onClick={() => { setCancelFor(r); setCancelErr(""); }} data-testid={`button-cancel-${r.id}`}>Cancel registration</Button>}
                      <EventLinks eventId={r.eventId} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
      <Dialog open={!!cancelFor} onOpenChange={o => { if (!o) setCancelFor(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel registration</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cancelling does not refund automatically. The amount paid less any refund is recorded as refund due for our team to settle.</p>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for cancelling" data-testid="input-cancel-reason" />
          {cancelErr && <p role="alert" className="text-sm text-destructive">{cancelErr}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelFor(null)}>Keep registration</Button>
            <Button variant="destructive" onClick={submitCancel} disabled={cancel.isPending} data-testid="button-confirm-cancel">{cancel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cancel registration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
