import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

type BookingStatusSnapshot = {
  id: number;
  status: string;
  gurujiName?: string | null;
  cancelled_by?: string | null;
  cancelledBy?: string | null;
  cancellation_reason?: string | null;
  cancellationReason?: string | null;
};

function getStatusToast(booking: BookingStatusSnapshot, previousStatus: string) {
  switch (booking.status) {
    case 'pending_approval':
      return {
        title: 'Request sent to Guruji',
        description: 'Your puja is not confirmed until a Guruji accepts. No payment has been collected.',
      };
    case 'confirmed':
      return {
        title: 'Guruji confirmed your puja',
        description: booking.gurujiName
          ? `${booking.gurujiName} accepted your request.`
          : 'Your booking is confirmed because a Guruji accepted your request.',
      };
    case 'pending':
      if (previousStatus === 'pending_approval') {
        return {
          title: 'No Guruji accepted yet',
          description: 'Your request is still pending and is not confirmed. Please try again later or contact support.',
        };
      }
      return null;
    case 'cancelled': {
      const cancelledBy = booking.cancelled_by || booking.cancelledBy;
      const reason = booking.cancellation_reason || booking.cancellationReason;
      return {
        title: cancelledBy === 'guruji' ? 'Guruji cancelled your puja' : 'Booking cancelled',
        description: reason || 'This booking has been cancelled. No cancellation payment is due while payments are paused.',
      };
    }
    case 'rejected':
      return {
        title: 'Booking request declined',
        description: 'This request was not confirmed. You can submit another booking request.',
      };
    case 'in_progress':
      return {
        title: 'Your puja has started',
        description: 'Your booking status has been updated.',
      };
    case 'completed':
      return {
        title: 'Your puja is complete',
        description: 'Thank you for booking with us. You can now rate your Guruji.',
      };
    default:
      return null;
  }
}

export function useBookingStatusToasts(
  bookings: BookingStatusSnapshot[] | undefined,
  enabled = true,
) {
  const { toast } = useToast();
  const previousStatuses = useRef<Map<number, string> | null>(null);

  useEffect(() => {
    if (!enabled || !bookings) return;

    const nextStatuses = new Map<number, string>();
    for (const booking of bookings) {
      const previousStatus = previousStatuses.current?.get(booking.id);
      if (previousStatus && previousStatus !== booking.status) {
        const notice = getStatusToast(booking, previousStatus);
        if (notice) toast(notice);
      }
      nextStatuses.set(booking.id, booking.status);
    }

    previousStatuses.current = nextStatuses;
  }, [bookings, enabled, toast]);
}