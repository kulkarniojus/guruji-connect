import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function BookingProgressActions({ booking }: { booking: { id: number; status: string } }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const nextStatus = booking.status === 'confirmed' ? 'in_progress' : 'completed';
  const actionLabel = nextStatus === 'in_progress' ? 'Start Puja' : 'Mark Completed';

  const mutation = useMutation({
    mutationFn: () => apiRequest('PUT', `/api/bookings/${booking.id}/status`, { status: nextStatus }),
    onSuccess: () => {
      ['/api/bookings', '/api/admin/bookings', `/api/bookings/${booking.id}`, '/api/notifications'].forEach(key =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      );
      setOpen(false);
      toast({ title: nextStatus === 'in_progress' ? 'Puja is in progress' : 'Puja completed' });
    },
    onError: (error: Error) => toast({ title: 'Could not update puja', description: error.message, variant: 'destructive' }),
  });

  if (!['confirmed', 'in_progress'].includes(booking.status)) return null;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>{actionLabel}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionLabel} — booking #{booking.id}?</DialogTitle>
            <DialogDescription>
              {nextStatus === 'in_progress' ? 'Confirm that the accepted puja has started.' : 'Confirm that this puja has finished.'}
              {' '}The customer, Guruji, and admin will see the updated status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}