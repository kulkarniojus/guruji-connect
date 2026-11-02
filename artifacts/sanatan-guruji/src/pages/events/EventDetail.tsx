import { useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/layouts/MainLayout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import {
  useGetEvent, getGetEventQueryKey, useRegisterForEvent, useStartEventCheckout,
  getListEventsQueryKey, getListMyEventRegistrationsQueryKey,
} from "@workspace/api-client-react";
import { EventsNav, Price, StatusBadge, DAYS, errMsg, fmtDate, fmtDateTime, newRequestId } from "@/components/events/eventUtils";
import { openCashfreeCheckout } from "@/components/payments/cashfreeCheckout";

function safeStripeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    if (u.hostname === "checkout.stripe.com") return u.toString();
  } catch { /* invalid */ }
  return null;
}

export default function EventDetail() {
  const params = useParams<{ eventId: string }>();
  const eventId = Number(params.eventId);
  const qc = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { data: ev, isLoading, isError, refetch } = useGetEvent(eventId, {
    query: { queryKey: [...getGetEventQueryKey(eventId), user?.id ?? "visitor"], enabled: Number.isInteger(eventId) && eventId > 0, refetchInterval: 30000 },
  });
  const register = useRegisterForEvent();
  const checkout = useStartEventCheckout();
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [consent, setConsent] = useState(false);
  const [method, setMethod] = useState<"online" | "manual">("manual");
  const [error, setError] = useState("");
  const [done, setDone] = useState<string>("");
  const [pendingReg, setPendingReg] = useState<{ id: string; fp: string } | null>(null);
  const requestId = useRef<string>(newRequestId());
  const fingerprint = useRef("");

  const returnTo = `/services/events/${eventId}`;
  const curFp = ev ? JSON.stringify([childName.trim(), Number(childAge), ev.currentPrice > 0 ? (ev.paymentMode === "both" ? method : ev.paymentMode) : "manual", ev.version]) : "";
  const stale = !!pendingReg && pendingReg.fp !== curFp;
  const busy = register.isPending || checkout.isPending;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
    qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
    qc.invalidateQueries({ queryKey: getListMyEventRegistrationsQueryKey() });
  };

  const startCheckout = (registrationId: string) => {
    checkout.mutate({ registrationId }, {
      onSuccess: async res => {
        try {
          if (res.paymentSessionId) { await openCashfreeCheckout(res.paymentSessionId,res.mode); return; }
          if (res.url) {
            const url = safeStripeUrl(res.url);
            if (url) { window.location.assign(url); return; }
          }
          if (res.orderId) { window.location.assign(`/events/registrations?registrationId=${encodeURIComponent(registrationId)}&payment=return`); return; }
          throw new Error("The payment provider did not return a checkout session.");
        } catch(e) { setError(errMsg(e)); }
      },
      onError: e => { setError(errMsg(e) + " Your seat is held for a short time; resume payment from My event registrations."); invalidate(); },
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ev) return;
    setError("");
    const age = Number(childAge);
    if (!childName.trim()) return setError("Enter the child's name.");
    if (!Number.isInteger(age) || age < ev.ageMin || age > ev.ageMax) return setError(`Child's age must be between ${ev.ageMin} and ${ev.ageMax}.`);
    if (!consent) return setError("Guardian consent is required.");
    const paid = ev.currentPrice > 0;
    const pm = !paid ? "manual" : ev.paymentMode === "online" ? "online" : ev.paymentMode === "manual" ? "manual" : method;
    // Same request id is reused for retries of the same input; new input gets a new id.
    const fp = JSON.stringify([childName.trim(), age, pm, ev.version]);
    if (fp !== fingerprint.current) { requestId.current = newRequestId(); fingerprint.current = fp; }
    if (pendingReg && pendingReg.fp === fp && pm === "online") return startCheckout(pendingReg.id);
    register.mutate({ eventId, data: { requestId: requestId.current, childName: childName.trim(), childAge: age, guardianConsent: true, paymentMethod: pm, eventVersion: ev.version } }, {
      onSuccess: reg => {
        invalidate();
        if (pm === "online" && paid) { setPendingReg({ id: reg.id, fp }); startCheckout(reg.id); }
        else { setDone(pm === "manual" && paid ? "Registration received. It is awaiting confirmation by the Vaidik Dhara support team and is not confirmed yet. Check My event registrations for updates and payment records." : "Registration received."); requestId.current = newRequestId(); fingerprint.current = ""; }
      },
      onError: err => { setError(errMsg(err)); refetch(); },
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto max-w-4xl py-12">
        <EventsNav active="list" />
        {isLoading ? <div className="h-96 animate-pulse rounded-lg bg-muted" /> : isError || !ev ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <span>This event could not be loaded. It may not be published.</span>
            <Button variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
          </div>
        ) : (
          <>
            {ev.media.find(m => m.kind === "banner") && <img src={ev.media.find(m => m.kind === "banner")!.url} alt="" className="mb-6 h-64 w-full rounded-lg object-cover" />}
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold" data-testid="text-event-name">{ev.name}</h1>
              <StatusBadge status={ev.status} />
            </div>
            <p className="mb-4 text-muted-foreground">{ev.classType} - ages {ev.ageMin} to {ev.ageMax} - {ev.mode === "online" ? "Online" : `${ev.location} · ${ev.city}, ${ev.state}`}</p>
            {ev.status === "cancelled" && <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">This event was cancelled.{ev.cancellationReason ? ` Reason: ${ev.cancellationReason}` : ""}</div>}
            <p className="mb-6 whitespace-pre-line">{ev.description}</p>
            <div className="mb-8 grid gap-4 rounded-lg border bg-card p-4 text-sm sm:grid-cols-2">
              <div><div className="text-muted-foreground">Fee</div><Price event={ev} /></div>
              <div><div className="text-muted-foreground">Seats left</div>{ev.availableSeats} of {ev.capacity}</div>
              <div><div className="text-muted-foreground">Schedule</div>{fmtDate(ev.startDate)} to {fmtDate(ev.endDate)}, {ev.startTime} IST, {ev.durationMinutes} min, {ev.frequency}{ev.frequency === "weekly" ? ` (${ev.weekdays.map(d => DAYS[d]).join(", ")})` : ""}</div>
              <div><div className="text-muted-foreground">Register by</div>{fmtDateTime(ev.registrationDeadline)}</div>
              <div><div className="text-muted-foreground">Instructor</div>{ev.instructorName}</div>
              <div className="sm:col-span-2 whitespace-pre-line text-muted-foreground">{ev.instructorDetails}</div>
              {ev.meetingUrl ? <div className="sm:col-span-2"><a href={ev.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">Join link <ExternalLink className="h-3 w-3" /></a></div>
                : ev.mode === "online" && <div className="sm:col-span-2 text-muted-foreground">The join link is shown only after your registration is fully paid (or if the event is free).</div>}
            </div>
            <h2 className="mb-2 text-lg font-semibold">Sessions</h2>
            <ul className="mb-8 divide-y rounded-lg border text-sm" data-testid="list-sessions">
              {ev.sessions.length === 0 && <li className="p-3 text-muted-foreground">No sessions scheduled.</li>}
              {ev.sessions.map(s => (
                <li key={s.id} className={`flex items-center justify-between p-3 ${s.status === "cancelled" ? "text-muted-foreground line-through" : ""}`}>
                  <span>{fmtDateTime(s.startAt)}</span>
                  {s.status === "cancelled" && <Badge variant="destructive">Cancelled after reschedule</Badge>}
                </li>
              ))}
            </ul>
            {ev.media.filter(m => m.kind !== "banner").length > 0 && (
              <div className="mb-8 flex flex-wrap gap-3">{ev.media.filter(m => m.kind !== "banner").map(m => m.kind === "photo"
                ? <img key={m.url} src={m.url} alt={m.label} className="h-28 rounded-md object-cover" loading="lazy" />
                : <a key={m.url} href={m.url} target="_blank" rel="noopener noreferrer" className="rounded-md border px-3 py-2 text-sm underline">{m.label || m.kind}</a>)}</div>
            )}

            <section className="rounded-lg border bg-card p-6" aria-labelledby="reg-h">
              <h2 id="reg-h" className="mb-1 text-xl font-semibold">Register a child</h2>
              <p className="mb-4 text-sm text-muted-foreground">One child per registration. The registration is private to your account.</p>
              {(ev.checkoutMode === "test") && <p className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900"><AlertTriangle className="h-4 w-4" />Online payment is in test mode. No real money is charged.</p>}
              {authLoading ? <div className="h-24 animate-pulse rounded bg-muted" /> : !user ? (
                <Button asChild data-testid="button-login-to-register"><Link href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>Sign in or create an account to register</Link></Button>
              ) : user.role !== "customer" ? (
                <p className="text-sm text-muted-foreground">Only customer accounts can register children for events.</p>
              ) : done ? (
                <div className="space-y-3"><p data-testid="text-registered">{done}</p><Button asChild><Link href="/events/registrations">View my event registrations</Link></Button></div>
              ) : !ev.registrationOpen ? (
                <div className="space-y-3">
                  {pendingReg ? <p className="text-sm">Your earlier seat reservation is recorded. Review it and resume payment in My event registrations.</p>
                    : <p className="text-sm" data-testid="text-registration-closed">Registration is closed{ev.availableSeats <= 0 ? " - the event is full" : ""}.</p>}
                  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                  {pendingReg && <Button asChild><Link href="/events/registrations">View my event registrations</Link></Button>}
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div><Label htmlFor="cn">Child's name</Label><Input id="cn" value={childName} onChange={e => setChildName(e.target.value)} maxLength={100} data-testid="input-child-name" /></div>
                  <div><Label htmlFor="ca">Child's age ({ev.ageMin}-{ev.ageMax})</Label><Input id="ca" type="number" inputMode="numeric" value={childAge} onChange={e => setChildAge(e.target.value)} data-testid="input-child-age" /></div>
                  {ev.currentPrice > 0 && ev.paymentMode === "both" && (
                    <RadioGroup value={method} onValueChange={v => setMethod(v as "online" | "manual")}>
                      <div className="flex items-center gap-2"><RadioGroupItem value="manual" id="pm-m" /><Label htmlFor="pm-m">Pay the team directly (recorded manually)</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="online" id="pm-o" disabled={!ev.checkoutAvailable} /><Label htmlFor="pm-o">Pay online{!ev.checkoutAvailable ? " (unavailable)" : ""}</Label></div>
                    </RadioGroup>
                  )}
                  {ev.currentPrice > 0 && ev.paymentMode === "online" && <p className="text-sm">Payment is online. Your seat is held for 35 minutes; checkout expires about 30 minutes after it starts.</p>}
                  {ev.currentPrice > 0 && ev.paymentMode === "manual" && <p className="text-sm">Pay the Vaidik Dhara support team directly. Your registration will remain unconfirmed until the team confirms it.</p>}
                  <div className="flex items-start gap-2"><Checkbox id="gc" checked={consent} onCheckedChange={v => setConsent(v === true)} data-testid="checkbox-consent" /><Label htmlFor="gc" className="leading-snug">I am the parent or legal guardian and consent to my child attending this event.</Label></div>
                  {stale && <p role="status" className="text-sm text-amber-900">Details changed since your earlier held registration. Submitting creates a new registration; the earlier one stays under My event registrations and can be paid or cancelled there.</p>}
                  {error && <p role="alert" className="text-sm text-destructive" data-testid="text-register-error">{error}</p>}
                  <Button type="submit" disabled={busy} data-testid="button-register">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{pendingReg && pendingReg.fp === curFp ? "Resume payment" : ev.currentPrice === 0 ? "Register for free" : "Register"}</Button>
                </form>
              )}
            </section>
          </>
        )}
      </div>
    </MainLayout>
  );
}
