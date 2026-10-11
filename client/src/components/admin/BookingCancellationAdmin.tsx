import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BookingCancellationAdmin({booking,event}: {booking:any;event?:any}) {
  const [open,setOpen]=useState(false);
  const [action,setAction]=useState(event ? event.kind==='customer_request' ? 'approve' : 'review_withdrawal' : 'cancel');
  const [reason,setReason]=useState('');
  const [party,setParty]=useState('none');
  const [charge,setCharge]=useState('');
  const [search,setSearch]=useState(true);
  const client=useQueryClient(), {toast}=useToast();
  const {data:preview,isLoading:previewLoading,isError:previewError,refetch:refreshPreview}=useQuery<any>({
    queryKey:[`/api/admin/bookings/${booking.id}/cancellation-quote`,party],
    queryFn:async()=>(await apiRequest('GET',`/api/admin/bookings/${booking.id}/cancellation-quote?chargeParty=${party}`)).json(),
    enabled:open && !event && party!=='none',
  });
  const mutation=useMutation({
    mutationFn: async () => (await apiRequest('POST',`/api/admin/bookings/${booking.id}/cancellation-action`,{
      action,reason,...(event ? {eventId:event.id} : {chargeParty:party,searchOthers:search}),
      ...(!event && party!=='none' && charge==='' ? {quoteToken:preview?.quoteToken} : {}),
      ...(charge!=='' && action!=='reject' ? {chargeOverride:Number(charge)} : {}),
    })).json(),
    onSuccess: (data:any) => {
      toast({title:'Decision saved',description:data.message});setOpen(false);setReason('');setCharge('');
      ['/api/admin/bookings','/api/admin/cancellation-requests','/api/notifications','/api/bookings',
        `/api/bookings/${booking.id}`,`/api/bookings/${booking.id}/cancellation-history`].forEach(key =>
        client.invalidateQueries({queryKey:[key]}));
    },
    onError: (e:Error) => {if(!event && party!=='none')refreshPreview();toast({title:'Decision failed',description:e.message,variant:'destructive'});},
  });
  if (!event && !['pending','pending_approval','confirmed','in_progress'].includes(booking.status)) return null;
  return <>
    <Button variant="outline" size="sm" onClick={()=>setOpen(true)}>{event ? event.kind==='customer_request' ? 'Review cancellation' : 'Review withdrawal charge' : 'Cancellation / Reassignment'}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Admin decision — booking #{booking.id}</DialogTitle></DialogHeader>
        {event && <div className="rounded border p-3 text-sm">
          <p>Reason: {event.reason}</p><p>{event.status==='pending' ? 'Proposed' : 'Recorded'} charge: ₹{event.charge}</p>
        </div>}
        <Label>Decision</Label>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger aria-label="Cancellation decision"><SelectValue /></SelectTrigger>
          <SelectContent>{event?.kind==='customer_request' ? <>
            <SelectItem value="approve">Approve customer cancellation</SelectItem>
            <SelectItem value="reject">Reject request and keep booking open</SelectItem>
          </> : event ? <SelectItem value="review_withdrawal">Review / waive Guruji withdrawal charge</SelectItem> : <>
            <SelectItem value="cancel">Cancel the whole booking</SelectItem>
            <SelectItem value="reassign">Release Guruji and reopen for reassignment</SelectItem>
          </>}</SelectContent>
        </Select>
        {!event && <>
          <Label>Who is responsible for the charge?</Label>
          <Select value={party} onValueChange={setParty}>
            <SelectTrigger aria-label="Cancellation charge responsibility"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">No charge</SelectItem>
              <SelectItem value="customer">Customer — apply customer rules</SelectItem>
              {booking.gurujiId && <SelectItem value="guruji">Guruji — apply Guruji rules</SelectItem>}
            </SelectContent>
          </Select>
        </>}
        {!event && party!=='none' && <div className="rounded border p-3 text-sm">
          {previewLoading ? 'Calculating charge…' : previewError ? <p role="alert">Unable to calculate the rule charge. Retry, or set an explicit charge override.</p>
            : <><p>Booked amount: ₹{preview?.bookingAmount}</p><p>Rule-calculated charge: ₹{preview?.charge}</p>
              {preview?.rule && <p>{preview.rule.name} · {preview.rule.time_basis==='within' ? 'within' : 'at least'} {preview.rule.hours_threshold} hours before puja</p>}
              <p className="text-xs">{preview?.paymentNotice}</p></>}
        </div>}
        {action!=='reject' && (event || party!=='none') && <>
          <Label>Override charge (₹, optional)</Label>
          <Input aria-label="Override cancellation charge" type="number" min="0" step="0.01" value={charge} onChange={e=>setCharge(e.target.value)} placeholder="Leave empty to use the rule; enter 0 to waive" />
        </>}
        {action==='reassign' && <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={search} onChange={e=>setSearch(e.target.checked)} /> Search other eligible Gurujis automatically
        </label>}
        <Label>Reason for this decision *</Label>
        <Textarea aria-label="Admin decision reason" value={reason} onChange={e=>setReason(e.target.value)} />
        <p className="text-xs text-muted-foreground">Every decision is audited. A replacement Guruji must genuinely accept. Charges are recorded only; no money is deducted or refunded.</p>
        <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Back</Button>
          <Button disabled={mutation.isPending || reason.trim().length<5 || (!event && party!=='none' && charge==='' && (previewLoading || previewError || !preview)) || (charge!=='' && (!Number.isFinite(Number(charge)) || Number(charge)<0))}
            onClick={()=>mutation.mutate()}>{mutation.isPending ? 'Saving…' : 'Confirm admin decision'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
