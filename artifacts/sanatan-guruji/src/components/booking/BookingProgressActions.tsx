import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import BookingCompletionControls from '@/components/booking/BookingCompletionControls';

export default function BookingProgressActions({ booking }: { booking: { id: number; status: string; [key: string]: any } }) {
  const [open, setOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canStart = ['guruji', 'admin'].includes(user?.role || '') && booking.status === 'confirmed';

  const mutation = useMutation({
    mutationFn: () => apiRequest('PUT', `/api/bookings/${booking.id}/status`, { status: 'in_progress' }),
    onSuccess: () => {
      ['/api/bookings', '/api/admin/bookings', '/api/guruji/bookings', `/api/bookings/${booking.id}`, `/api/bookings/${booking.id}/completion`, '/api/notifications'].forEach(key =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      );
      setOpen(false);
      toast({ title: 'Puja is in progress' });
    },
    onError: (error: Error) => toast({ title: 'Could not update puja', description: error.message, variant: 'destructive' }),
  });

  if (!isAdmin && !['confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'].includes(booking.status)) return null;

  return (
    <>
      {canStart && <>
        <Button size="sm" onClick={() => setOpen(true)}>Start Puja</Button>
        <Dialog open={open} onOpenChange={(next) => !mutation.isPending && setOpen(next)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start puja — booking #{booking.id}?</DialogTitle>
              <DialogDescription>Confirm that the accepted puja has started. The customer, Guruji, and Vaidik Dhara support team will see the updated status.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Start Puja
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>}
      {isAdmin ? <>
        <Button
          size="sm"
          variant="outline"
          aria-label={`Manage completion for booking #${booking.id}`}
          onClick={() => setCompletionOpen(true)}
        >
          {booking.status === 'completed' ? 'Completion record' : 'Completion controls'}
        </Button>
        <Dialog open={completionOpen} onOpenChange={setCompletionOpen}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Completion controls — booking #{booking.id}</DialogTitle>
              <DialogDescription>Track customer codes, resend them, and record manual completion with an audit trail.</DialogDescription>
            </DialogHeader>
            <BookingCompletionControls booking={booking} />
          </DialogContent>
        </Dialog>
      </> : <BookingCompletionControls booking={booking} />}
    </>
  );
}