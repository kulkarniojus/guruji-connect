import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Star, Heart, Loader2 } from 'lucide-react';

interface Rating {
  id: number;
  bookingId: string;
  gurujiId: string;
  gurujiName: string;
  customerName: string;
  rating: number;
  review: string;
  serviceType: string;
  createdAt: string;
}

interface RatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    gurujiName: string;
    serviceName: string;
    date: string;
  };
  onSubmitRating: (rating: number, review: string) => void;
}

export function RatingDialog({ isOpen, onClose, booking, onSubmitRating }: RatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please select a rating before submitting',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmitRating(rating, review);
      toast({
        title: 'Thank You!',
        description: 'Your rating has been submitted successfully',
      });
      onClose();
      setRating(0);
      setReview('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit rating. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = () => (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          onMouseEnter={() => setHoveredRating(star)}
          onMouseLeave={() => setHoveredRating(0)}
          className="focus:outline-none"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              star <= (hoveredRating || rating)
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );

  const getRatingText = () => {
    const texts = {
      1: 'Poor',
      2: 'Fair', 
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return texts[rating as keyof typeof texts] || '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            How was your experience with {booking.gurujiName} for {booking.serviceName}?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Please rate your experience</Label>
              <StarRating />
              {rating > 0 && (
                <p className="text-sm font-medium text-primary">{getRatingText()}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="review">Share your feedback (optional)</Label>
            <Textarea
              id="review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Tell us about your experience with the Guruji and the service quality..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {review.length}/500 characters
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-sm">
              <Heart className="h-4 w-4 text-red-500" />
              <span>Your feedback helps other customers and improves our service quality</span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Submit Rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RatingDisplayProps {
  rating: number;
  totalRatings: number;
  showStars?: boolean;
  className?: string;
}

export function RatingDisplay({ rating, totalRatings, showStars = true, className = '' }: RatingDisplayProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showStars && (
        <div className="flex items-center">
          {[...Array(fullStars)].map((_, i) => (
            <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
          ))}
          {hasHalfStar && (
            <div className="relative">
              <Star className="h-4 w-4 text-gray-300" />
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
              </div>
            </div>
          )}
          {[...Array(emptyStars)].map((_, i) => (
            <Star key={i} className="h-4 w-4 text-gray-300" />
          ))}
        </div>
      )}
      <span className="text-sm font-medium">{rating.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">({totalRatings} reviews)</span>
    </div>
  );
}

interface ReviewCardProps {
  review: {
    customerName: string;
    rating: number;
    review: string;
    serviceType: string;
    date: string;
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{review.customerName}</CardTitle>
            <CardDescription className="flex items-center space-x-2 mt-1">
              <RatingDisplay 
                rating={review.rating} 
                totalRatings={0} 
                showStars={true}
                className="text-xs"
              />
              <span>•</span>
              <span>{review.date}</span>
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            {review.serviceType}
          </Badge>
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

// Mock data for demonstration
export const mockRatings: Rating[] = [
  {
    id: 1,
    bookingId: 'BK001',
    gurujiId: 'GU001',
    gurujiName: 'Pandit Rajesh Sharma',
    customerName: 'Priya Singh',
    rating: 5,
    review: 'Excellent service! Very knowledgeable and performed the puja with great devotion.',
    serviceType: 'Satyanarayan Puja',
    createdAt: '2024-01-15'
  },
  {
    id: 2,
    bookingId: 'BK002',
    gurujiId: 'GU001',
    gurujiName: 'Pandit Rajesh Sharma',
    customerName: 'Amit Kumar',
    rating: 4,
    review: 'Very good experience. The Guruji was punctual and the puja was performed authentically.',
    serviceType: 'Ganesh Puja',
    createdAt: '2024-01-10'
  },
  {
    id: 3,
    bookingId: 'BK003',
    gurujiId: 'GU002',
    gurujiName: 'Pandit Suresh Joshi',
    customerName: 'Rekha Patel',
    rating: 5,
    review: 'Amazing experience! The Guruji explained everything and made us feel blessed.',
    serviceType: 'Griha Pravesh',
    createdAt: '2024-01-08'
  }
];