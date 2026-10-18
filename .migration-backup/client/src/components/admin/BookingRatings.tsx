import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

interface Review {
  id: number;
  bookingId: number;
  rating: number;
  review: string | null;
  fromRole: string;
  createdAt: string;
}

interface BothReviews {
  customerReview: Review | null;
  gurujiReview: Review | null;
}

function RatingEntry({ label, review }: { label: string; review: Review | null }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">{label}</h3>
            {review ? (
              <>
                <p className="mt-1 flex items-center gap-1 text-sm font-medium">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {review.rating}/5
                </p>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {review.review?.trim() || 'No written comment.'}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Not yet rated</p>
            )}
          </div>
          {review?.createdAt && (
            <time className="shrink-0 text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </time>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BookingRatings({ bookingId }: { bookingId: number | string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<BothReviews>({
    queryKey: ['/api/reviews/booking', bookingId, 'both'],
    enabled: open,
    queryFn: async () => {
      const response = await fetch(`/api/reviews/booking/${bookingId}/both`, { credentials: 'include' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Could not load booking ratings.');
      }
      return response.json();
    },
  });

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={`View ratings for booking #${bookingId}`}
        onClick={() => setOpen(true)}
      >
        <Star className="mr-1.5 h-3.5 w-3.5" />
        Ratings
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ratings for booking #{bookingId}</DialogTitle>
            <DialogDescription>Mutual feedback from both sides of this completed ceremony.</DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="space-y-3" aria-label="Loading booking ratings">
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : isError ? (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">{error instanceof Error ? error.message : 'Could not load booking ratings.'}</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            </div>
          ) : data ? (
            <div className="space-y-3">
              <RatingEntry label="Customer → Guruji" review={data.customerReview} />
              <RatingEntry label="Guruji → customer" review={data.gurujiReview} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}