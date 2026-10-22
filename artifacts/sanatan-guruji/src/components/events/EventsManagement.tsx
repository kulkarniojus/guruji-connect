import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, RefreshCw, Loader2 } from "lucide-react";
import {
  useListAdminEvents, getListAdminEventsQueryKey, useCreateEvent, useUpdateEvent, useChangeEventStatus,
  getListEventsQueryKey, getGetEventQueryKey, type EventRecord, type EventInput,
} from "@workspace/api-client-react";
import EventForm, { emptyEvent, toInput } from "./EventForm";
import EventParticipants from "./EventParticipants";
import { Price, StatusBadge, errMsg, fmtDate } from "./eventUtils";

type Action = "publish" | "unpublish" | "cancel";

export default function EventsManagement() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useListAdminEvents({ query: { queryKey: getListAdminEventsQueryKey(), refetchInterval: 30000 } });
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const change = useChangeEventStatus();
  const [editing, setEditing] = useState<EventRecord | "new" | null>(null);
  const [managing, setManaging] = useState<EventRecord | null>(null);
  const [formErr, setFormErr] = useState("");
  const [act, setAct] = useState<{ ev: EventRecord; action: Action } | null>(null);
  const [reason, setReason] = useState("");
  const [actErr, setActErr] = useState("");

  const refresh = (id?: number) => {
    qc.invalidateQueries({ queryKey: getListAdminEventsQueryKey() });
    qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
    if (id) qc.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
  };

  const save = (v: EventInput) => {
    setFormErr("");
    const done = (r: EventRecord) => { refresh(r.id); setEditing(null); };
    if (editing === "new") create.mutate({ data: v }, { onSuccess: done, onError: e => setFormErr(errMsg(e)) });
    else if (editing) update.mutate({ eventId: editing.id, data: v }, { onSuccess: done, onError: e => setFormErr(errMsg(e)) });
  };

  const runAction = () => {
    if (!act) return;
    if (act.action !== "publish" && reason.trim().length < 3) return setActErr("A reason is required.");
    change.mutate({ eventId: act.ev.id, data: { action: act.action, reason: reason.trim() } }, {
      onSuccess: () => { refresh(act.ev.id); setAct(null); setReason(""); setActErr(""); },
      onError: e => setActErr(errMsg(e)),
    });
  };

  const events = data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-xl font-semibold">Events</h2><p className="text-sm text-muted-foreground">Courses for children. All times are IST.</p></div>
        <Button onClick={() => { setFormErr(""); setEditing("new"); }} data-testid="button-new-event"><Plus className="mr-2 h-4 w-4" />New event</Button>
      </div>
      {isLoading ? <div className="h-40 animate-pulse rounded bg-muted" /> : isError ? (
        <div role="alert" className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm"><span>Events could not be loaded.</span><Button variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div>
      ) : events.length === 0 ? <p className="rounded-md border p-8 text-center text-muted-foreground" data-testid="text-no-admin-events">No events yet. Create the first draft.</p> : (
        <ul className="space-y-3">{events.map(ev => (
          <li key={ev.id} className="rounded-lg border bg-card p-4" data-testid={`row-event-${ev.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><span className="font-semibold">{ev.name}</span> <StatusBadge status={ev.status} /></div>
              <Price event={ev} />
            </div>
            <p className="text-sm text-muted-foreground">{fmtDate(ev.startDate)} to {fmtDate(ev.endDate)} - {ev.frequency} - {ev.capacity - ev.availableSeats}/{ev.capacity} seats taken - payment: {ev.paymentMode} - v{ev.version}</p>
            {ev.cancellationReason && <p className="text-sm">Cancelled: {ev.cancellationReason}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { setFormErr(""); setEditing(ev); }} data-testid={`button-edit-event-${ev.id}`}>{ev.status === "draft" ? "Edit" : "Edit / reschedule"}</Button>
              <Button size="sm" variant="outline" onClick={() => setManaging(ev)} data-testid={`button-participants-${ev.id}`}>Participants</Button>
              {ev.status === "draft" && <Button size="sm" onClick={() => { setAct({ ev, action: "publish" }); setReason(""); setActErr(""); }} data-testid={`button-publish-${ev.id}`}>Publish</Button>}
              {ev.status === "published" && <Button size="sm" variant="outline" onClick={() => { setAct({ ev, action: "unpublish" }); setReason(""); setActErr(""); }}>Unpublish</Button>}
              {ev.status !== "cancelled" && <Button size="sm" variant="destructive" onClick={() => { setAct({ ev, action: "cancel" }); setReason(""); setActErr(""); }}>Cancel event</Button>}
            </div>
          </li>
        ))}</ul>
      )}

      <Dialog open={!!editing} onOpenChange={o => { if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing === "new" ? "New event (draft)" : "Edit event"}</DialogTitle></DialogHeader>
          {editing && <EventForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? emptyEvent : toInput(editing)} saving={create.isPending || update.isPending} error={formErr} onSubmit={save} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!managing} onOpenChange={o => { if (!o) setManaging(null); }}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{managing?.name}</DialogTitle></DialogHeader>
          {managing && <EventParticipants event={events.find(e => e.id === managing.id) ?? managing} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!act} onOpenChange={o => { if (!o) setAct(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="capitalize">{act?.action} event</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{act?.ev.name}{act?.action === "cancel" ? ". Cancelling does not refund automatically; refunds due are recorded on each registration." : ""}</p>
          <Textarea placeholder={act?.action === "publish" ? "Note (optional)" : "Reason (required)"} value={reason} onChange={e => setReason(e.target.value)} data-testid="input-action-reason" />
          {actErr && <p role="alert" className="text-sm text-destructive">{actErr}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setAct(null)}>Back</Button><Button onClick={runAction} disabled={change.isPending} data-testid="button-confirm-action">{change.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
