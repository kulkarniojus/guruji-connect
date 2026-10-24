import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw } from "lucide-react";
import {
  useListEventParticipants, getListEventParticipantsQueryKey, useRecordEventPayment, useConfirmManualEventRegistration,
  useGetEventAttendance, getGetEventAttendanceQueryKey,
  useSaveEventAttendance, useNotifyEventParticipants, useCancelEventRegistration, getListAdminEventsQueryKey, getGetEventQueryKey,
  type EventRecord, type EventRegistration,
} from "@workspace/api-client-react";
import { StatusBadge, errMsg, fmtDateTime, rupees } from "./eventUtils";

function AdminCancel({ r, eventId }: { r: EventRegistration; eventId: number }) {
  const qc = useQueryClient();
  const cancel = useCancelEventRegistration();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  if (r.status.includes("cancel")) return null;
  const go = () => {
    if (reason.trim().length < 3) return setErr("A reason is required.");
    cancel.mutate({ registrationId: r.id, data: { reason: reason.trim() } }, {
      onSuccess: () => {
        setOpen(false); setReason(""); setErr("");
        qc.invalidateQueries({ queryKey: getListEventParticipantsQueryKey(eventId) });
        qc.invalidateQueries({ queryKey: getListAdminEventsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
      },
      onError: e => setErr(errMsg(e)),
    });
  };
  if (!open) return <Button size="sm" variant="destructive" className="mt-2" onClick={() => setOpen(true)} data-testid={`button-admin-cancel-${r.id}`}>Cancel registration</Button>;
  return (
    <div className="mt-2 space-y-2 rounded border border-destructive/30 p-2">
      <p className="text-xs text-muted-foreground">Cancelling frees the seat. Any refund due will appear in Payment → Refund approvals. Online refunds require admin approval; manual payouts are recorded after they are sent.</p>
      <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (required)" aria-label="Cancellation reason" />
      {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
      <div className="flex gap-2"><Button size="sm" variant="destructive" onClick={go} disabled={cancel.isPending} data-testid={`button-admin-confirm-cancel-${r.id}`}>Confirm cancel</Button><Button size="sm" variant="outline" onClick={() => setOpen(false)}>Back</Button></div>
    </div>
  );
}

function PaymentRow({ r, eventId }: { r: EventRegistration; eventId: number }) {
  const qc = useQueryClient();
  const rec = useRecordEventPayment();
  const confirm = useConfirmManualEventRegistration();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const online = r.paymentMethod === "online";
  const pendingManualConfirmation = r.paymentMethod === "manual" && r.status === "pending_confirmation";
  const cancelled = r.status.includes("cancel");
  const save = () => {
    const a = Number(amount);
    if (!(a > 0)) return setErr("Enter an amount above zero.");
    if (!reference.trim()) return setErr("A reference is required.");
    setErr("");
    rec.mutate({ registrationId: r.id, data: { type: "payment", amount: a, reference: reference.trim(), note: note.trim() } }, {
      onSuccess: () => { setAmount(""); setReference(""); setNote(""); qc.invalidateQueries({ queryKey: getListEventParticipantsQueryKey(eventId) }); qc.invalidateQueries({ queryKey: getListAdminEventsQueryKey() }); qc.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) }); },
      onError: e => setErr(errMsg(e)),
    });
  };
  const confirmOffline = () => {
    setErr("");
    confirm.mutate({ registrationId: r.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListEventParticipantsQueryKey(eventId) });
        qc.invalidateQueries({ queryKey: getListAdminEventsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
      },
      onError: e => setErr(errMsg(e)),
    });
  };
  return (
    <li className="rounded-lg border p-3 text-sm" data-testid={`row-participant-${r.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><strong>{r.childName} (age {r.childAge})</strong><StatusBadge status={r.status} /></div>
      <p className="text-muted-foreground">Guardian: {r.guardianName} - {r.paymentMethod}{r.isTest ? " - TEST registration (test money, not real)" : ""}</p>
      <p>{r.isTest ? "Test amounts: " : ""}Fee {rupees(r.fee)} - Paid {rupees(r.paid)} - Refunded {rupees(r.refunded)} - Balance {rupees(r.balanceDue)} - Refund due {rupees(r.refundDue)}</p>
      <div className="mt-2"><p className="font-medium">Payment records</p>{r.payments.length > 0
        ? <ul className="text-xs text-muted-foreground">{r.payments.map((p, i) => <li key={i}>{p.type === "refund" ? "Refund recorded manually" : online ? "Online payment (verified by Stripe)" : "Offline payment (recorded by support team)"} — {rupees(p.amount)} — ref {p.reference} — {fmtDateTime(p.createdAt)}</li>)}</ul>
        : <p className="text-xs text-muted-foreground">{r.paymentMethod === "free" ? "No payment required." : online ? "No online payment has been verified yet." : "No offline payment has been recorded yet."}</p>}
      </div>
      {pendingManualConfirmation && <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
        <p className="font-medium text-amber-950">Offline registration awaiting confirmation</p>
        <p className="mt-1 text-xs text-amber-950">Confirm only after verifying the offline payment. Any balance not covered by recorded payments will remain visible.</p>
        <Button size="sm" className="mt-2" onClick={confirmOffline} disabled={confirm.isPending} data-testid={`button-confirm-offline-${r.id}`}>
          {confirm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm offline payment &amp; registration
        </Button>
      </div>}
      {!cancelled && r.paymentMethod === "manual" && <div className="mt-2 flex flex-wrap items-end gap-2">
        <Input className="w-28" type="number" placeholder="Rs." value={amount} onChange={e => setAmount(e.target.value)} aria-label="Amount" />
        <Input className="w-40" placeholder="Payment reference" value={reference} onChange={e => setReference(e.target.value)} aria-label="Payment reference" />
        <Input className="w-48" placeholder="Note" value={note} onChange={e => setNote(e.target.value)} aria-label="Note" />
        <Button size="sm" onClick={save} disabled={rec.isPending} data-testid={`button-record-${r.id}`}>Record payment</Button>
      </div>}
      {online && <p className="mt-1 text-xs text-muted-foreground">Online payments are recorded after Stripe verification. Refunds are reviewed in Payment → Refund approvals.</p>}
      {cancelled && r.refundDue > 0 && <p className="mt-2 text-xs text-amber-800">Refund due: ₹{r.refundDue}. Review and approve it in Payment → Refund approvals.</p>}
      {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
      <AdminCancel r={r} eventId={eventId} />
    </li>
  );
}

function Attendance({ event, regs }: { event: EventRecord; regs: EventRegistration[] }) {
  const qc = useQueryClient();
  const sessions = event.sessions;
  const [sid, setSid] = useState<number>(sessions.find(s => s.status !== "cancelled")?.id ?? sessions[0]?.id ?? 0);
  const { data, isLoading, isError, refetch } = useGetEventAttendance(event.id, sid, { query: { queryKey: getGetEventAttendanceQueryKey(event.id, sid), enabled: sid > 0 } });
  const save = useSaveEventAttendance();
  const [err, setErr] = useState("");
  const active = regs.filter(r => !r.status.includes("cancel") && !r.status.includes("expired") && !r.status.includes("pending"));
  const mark = (registrationId: string, status: "present" | "absent" | "excused") =>
    save.mutate({ eventId: event.id, data: { sessionId: sid, registrationId, status } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetEventAttendanceQueryKey(event.id, sid) }),
      onError: e => setErr(errMsg(e)),
    });
  if (sessions.length === 0) return <p className="text-sm text-muted-foreground">No sessions yet.</p>;
  return (
    <div className="space-y-3">
      <select aria-label="Session" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={sid} onChange={e => setSid(Number(e.target.value))}>
        {sessions.map(s => <option key={s.id} value={s.id}>{fmtDateTime(s.startAt)}{s.status === "cancelled" ? " (cancelled)" : ""}</option>)}
      </select>
      {sessions.find(s => s.id === sid)?.status === "cancelled" && <p className="text-sm text-amber-800">This session was cancelled (superseded by a reschedule).</p>}
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      {isLoading ? <div className="h-20 animate-pulse rounded bg-muted" /> : isError ? <Button variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button> : active.length === 0 ? <p className="text-sm text-muted-foreground">No confirmed participants.</p> : (
        <ul className="space-y-2">{active.map(r => {
          const cur = (data ?? []).find(a => a.registrationId === r.id)?.status;
          return (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm">
              <span>{r.childName}</span>
              <span className="flex gap-1">{(["present", "absent", "excused"] as const).map(s => (
                <Button key={s} size="sm" variant={cur === s ? "default" : "outline"} onClick={() => mark(r.id, s)} disabled={save.isPending} data-testid={`button-${s}-${r.id}`}>{s}</Button>
              ))}</span>
            </li>
          );
        })}</ul>
      )}
    </div>
  );
}

function Notify({ eventId }: { eventId: number }) {
  const notify = useNotifyEventParticipants();
  const [message, setMessage] = useState("");
  const [res, setRes] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Sent as in-app notifications to guardians only. WhatsApp and email are not connected.</p>
      <Textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} placeholder="Message to guardians" data-testid="input-notice" />
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      {res && <p role="status" className="text-sm">{res}</p>}
      <Button disabled={notify.isPending || !message.trim()} data-testid="button-send-notice" onClick={() => { setErr(""); setRes(""); notify.mutate({ eventId, data: { message: message.trim() } }, { onSuccess: r => { setRes(`In-app notice sent to ${r.notified} guardian account(s).`); setMessage(""); }, onError: e => setErr(errMsg(e)) }); }}>
        {notify.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send in-app notice
      </Button>
    </div>
  );
}

export default function EventParticipants({ event }: { event: EventRecord }) {
  const { data, isLoading, isError, refetch } = useListEventParticipants(event.id, { query: { queryKey: getListEventParticipantsQueryKey(event.id), refetchInterval: 20000 } });
  const regs = data ?? [];
  const confirmedCount = regs.filter(r => r.status === "registered").length;
  const pendingManualCount = regs.filter(r => r.status === "pending_confirmation").length;
  const pendingOnlineCount = regs.filter(r => r.status === "pending_payment").length;
  return (
    <Tabs defaultValue="participants">
      <TabsList><TabsTrigger value="participants">Registrations &amp; payments</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger><TabsTrigger value="notify">Notice</TabsTrigger></TabsList>
      <TabsContent value="participants">
        {isLoading ? <div className="h-24 animate-pulse rounded bg-muted" /> : isError ? <Button variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button> : regs.length === 0 ? <p className="text-sm text-muted-foreground" data-testid="text-no-participants">No registrations yet.</p> : (
          <div className="space-y-3">
            <div className="rounded-md bg-muted p-3 text-sm" data-testid="text-registration-summary">
              {regs.length} child registration(s) · {confirmedCount} confirmed · {pendingManualCount} awaiting offline confirmation · {pendingOnlineCount} awaiting online payment
            </div>
            <ul className="space-y-3" data-testid="list-event-registrations">{regs.map(r => <PaymentRow key={r.id} r={r} eventId={event.id} />)}</ul>
          </div>
        )}
      </TabsContent>
      <TabsContent value="attendance"><Attendance event={event} regs={regs} /></TabsContent>
      <TabsContent value="notify"><Notify eventId={event.id} /></TabsContent>
    </Tabs>
  );
}
