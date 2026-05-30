import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Heart, Loader2, User } from 'lucide-react';

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              star <= (hovered || value) ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

interface RatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string | number;
    gurujiName: string;
    serviceName: string;
    date?: string;
  };
  onSubmitRating: (rating: number, review: string) => void | Promise<void>;
}

export function RatingDialog({ isOpen, onClose, booking, onSubmitRating }: RatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setRating(0);
    setReview('');
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmitRating(rating, review);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            How was your experience with <strong>{booking.gurujiName}</strong> for {booking.serviceName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center space-y-3">
            <Label className="text-base font-medium">Select your rating</Label>
            <div className="flex justify-center">
              <StarPicker value={rating} onChange={setRating} />
            </div>
            {rating > 0 && (
              <p className="text-sm font-semibold text-violet-600">{RATING_LABELS[rating]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="review">Share your feedback (optional)</Label>
            <Textarea
              id="review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Tell us about your experience with the Guruji and service quality..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{review.length}/500</p>
          </div>

          <div className="bg-violet-50 p-3 rounded-lg flex items-center gap-2 text-sm text-violet-700">
            <Heart className="h-4 w-4 shrink-0" />
            <span>Your rating helps other customers find the best Gurujis</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CustomerRatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string | number;
    customerName: string;
    serviceName: string;
  };
  onSubmitRating: (rating: number, review: string) => void | Promise<void>;
}

export function CustomerRatingDialog({ isOpen, onClose, booking, onSubmitRating }: CustomerRatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setRating(0);
    setReview('');
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmitRating(rating, review);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-violet-600" />
            Rate This Customer
          </DialogTitle>
          <DialogDescription>
            How was your experience with <strong>{booking.customerName}</strong> for {booking.serviceName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center space-y-3">
            <Label className="text-base font-medium">Select your rating</Label>
            <div className="flex justify-center">
              <StarPicker value={rating} onChange={setRating} />
            </div>
            {rating > 0 && (
              <p className="text-sm font-semibold text-amber-600">{RATING_LABELS[rating]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-review">Add a note (optional)</Label>
            <Textarea
              id="customer-review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Was the customer respectful? Did they follow your guidance? Any notes for other Gurujis..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{review.length}/500</p>
          </div>

          <div className="bg-amber-50 p-3 rounded-lg flex items-center gap-2 text-sm text-amber-700">
            <Heart className="h-4 w-4 shrink-0" />
            <span>Customer ratings help other Gurujis prepare for their sessions</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0} className="bg-amber-500 hover:bg-amber-600 text-white">
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RatingDisplayProps {
  rating: number;
  totalRatings?: number;
  showStars?: boolean;
  className?: string;
}

export function RatingDisplay({ rating, totalRatings, showStars = true, className = '' }: RatingDisplayProps) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div className={`flex items-center space-x-1.5 ${className}`}>
      {showStars && (
        <div className="flex items-center">
          {Array.from({ length: full }).map((_, i) => (
            <Star key={`f${i}`} className="h-4 w-4 text-yellow-400 fill-current" />
          ))}
          {half && (
            <div className="relative">
              <Star className="h-4 w-4 text-gray-300" />
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
              </div>
            </div>
          )}
          {Array.from({ length: empty }).map((_, i) => (
            <Star key={`e${i}`} className="h-4 w-4 text-gray-300" />
          ))}
        </div>
      )}
      <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
      {totalRatings !== undefined && (
        <span className="text-sm text-muted-foreground">({totalRatings})</span>
      )}
    </div>
  );
}

interface ReviewCardProps {
  review: {
    customerName?: string;
    gurujiName?: string;
    rating: number;
    review?: string | null;
    serviceType?: string;
    date?: string;
    fromRole?: string;
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  const isGurujiRating = review.fromRole === 'guruji';
  const authorName = isGurujiRating ? review.gurujiName : review.customerName;
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">{authorName || 'User'}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <RatingDisplay rating={review.rating} showStars className="text-xs" />
              {review.date && <><span>•</span><span className="text-xs">{review.date}</span></>}
            </CardDescription>
          </div>
          {review.serviceType && (
            <Badge variant="secondary" className="text-xs">{review.serviceType}</Badge>
          )}
        </div>
      </CardHeader>
      {review.review && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{review.review}</p>
        </CardContent>
      )}
    </Card>
  );
}

export function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${cls} ${s <= Math.round(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}
