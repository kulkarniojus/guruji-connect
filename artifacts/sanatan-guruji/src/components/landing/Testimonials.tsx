import {
  getListFeaturedCustomerReviewsQueryKey,
  useListFeaturedCustomerReviews,
  type FeaturedCustomerReview,
} from "@workspace/api-client-react";
import { RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ReviewCard({ review }: { review: FeaturedCustomerReview }) {
  const date = formatReviewDate(review.createdAt);

  return (
    <Card className="h-full rounded-xl border border-neutral-200 bg-white shadow-sm">
      <CardContent className="flex h-full flex-col p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-neutral-900">Verified customer</p>
            {review.pujaName && (
              <p className="mt-1 text-sm text-neutral-500">{review.pujaName}</p>
            )}
          </div>
          {date && <time className="shrink-0 text-xs text-neutral-500">{date}</time>}
        </div>
        <div
          className="mb-4 flex"
          role="img"
          aria-label={`${review.rating} out of 5 stars`}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              aria-hidden="true"
              className={`h-4 w-4 ${
                index < review.rating
                  ? "fill-current text-yellow-400"
                  : "text-neutral-300"
              }`}
            />
          ))}
        </div>
        <blockquote className="text-neutral-700">{review.review}</blockquote>
      </CardContent>
    </Card>
  );
}

export default function Testimonials() {
  const {
    data: reviews = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useListFeaturedCustomerReviews({
    query: {
      queryKey: getListFeaturedCustomerReviewsQueryKey(),
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  });

  return (
    <section className="bg-neutral-50 py-12" aria-labelledby="customer-reviews-heading">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <h2
            id="customer-reviews-heading"
            className="font-poppins text-2xl font-bold text-neutral-900 md:text-3xl"
          >
            What Our Customers Say
          </h2>
          <p className="mt-2 text-neutral-600">
            Recent reviews from customers with completed bookings
          </p>
          <p className="sr-only" aria-live="polite">
            {isFetching && !isLoading ? "Updating customer reviews" : ""}
          </p>
        </div>

        {isLoading ? (
          <div
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            aria-label="Loading customer reviews"
            role="status"
          >
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-xl border border-neutral-200 bg-white"
              />
            ))}
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white p-6 text-center"
          >
            <p className="text-neutral-700">
              Customer reviews are temporarily unavailable.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : reviews.length === 0 ? (
          <p className="mx-auto max-w-xl rounded-xl border border-neutral-200 bg-white p-8 text-center text-neutral-600">
            No written customer reviews are available yet. Reviews will appear here
            after customers share feedback on completed bookings.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
