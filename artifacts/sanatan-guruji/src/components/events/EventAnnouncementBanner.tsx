import { useState } from "react";
import { getListEventsQueryKey, useListEvents } from "@workspace/api-client-react";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function EventAnnouncementBanner() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { data: events = [] } = useListEvents(undefined, {
    query: {
      queryKey: getListEventsQueryKey(),
      refetchInterval: 60000,
      refetchOnWindowFocus: true,
    },
  });

  if (events.length === 0) return null;

  const currentIndex = activeIndex % events.length;
  const event = events[currentIndex];
  const hasMultipleEvents = events.length > 1;

  const showEvent = (index: number) => {
    setActiveIndex((index + events.length) % events.length);
  };

  return (
    <section
      aria-label="Events and classes"
      aria-roledescription={hasMultipleEvents ? "carousel" : undefined}
      className="container mx-auto px-4 py-4 sm:px-6"
      data-testid="event-announcement-banner"
    >
      <div
        className="flex flex-col gap-5 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-100 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-7"
        aria-live="polite"
      >
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-amber-900">
            <CalendarDays className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              Events &amp; classes
            </p>
            <h2 className="mt-1 text-lg font-semibold text-stone-900 sm:text-xl">
              Discover what’s happening
            </h2>
            <p className="mt-1 font-medium text-stone-900" data-testid="text-featured-event-name">
              {event.name}
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-700">
              {event.registrationOpen
                ? "Registration is open. View event details and reserve a spot."
                : "View event details, schedule, and registration status."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:items-end">
          {hasMultipleEvents && (
            <div className="flex items-center justify-between gap-3" role="group" aria-label="Event carousel controls">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => showEvent(currentIndex - 1)}
                  aria-label="Previous event"
                  className="h-9 w-9 rounded-full border-amber-300 bg-white/70 text-amber-900 hover:bg-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-12 text-center text-sm tabular-nums text-stone-700" aria-live="off">
                  {currentIndex + 1} / {events.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => showEvent(currentIndex + 1)}
                  aria-label="Next event"
                  className="h-9 w-9 rounded-full border-amber-300 bg-white/70 text-amber-900 hover:bg-white"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1" role="group" aria-label="Choose an event">
                {events.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => showEvent(index)}
                    aria-label={`Show event ${index + 1}: ${item.name}`}
                    aria-pressed={index === currentIndex}
                    className={`h-2.5 rounded-full transition-all ${
                      index === currentIndex ? "w-6 bg-amber-800" : "w-2.5 bg-amber-300 hover:bg-amber-500"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              asChild
              className="w-full rounded-full bg-amber-800 text-white hover:bg-amber-900 sm:w-auto"
            >
              <Link href={`/services/events/${event.id}`} className="inline-flex items-center justify-center gap-2">
                View event <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {hasMultipleEvents && (
              <Button asChild variant="ghost" className="rounded-full text-amber-900 hover:bg-amber-100">
                <Link href="/services/events">All events</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
