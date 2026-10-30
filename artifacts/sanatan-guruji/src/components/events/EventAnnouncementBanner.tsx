import { useListEvents, getListEventsQueryKey } from "@workspace/api-client-react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function EventAnnouncementBanner() {
  const { data: events = [] } = useListEvents(undefined, {
    query: {
      queryKey: getListEventsQueryKey(),
      refetchInterval: 60000,
      refetchOnWindowFocus: true,
    },
  });

  if (events.length === 0) return null;

  const openEvents = events.filter((event) => event.registrationOpen);
  const highlightedEvent = openEvents[0] ?? events[0];
  const registrationMessage = openEvents.length > 0
    ? `Registration is open for ${openEvents.length} ${openEvents.length === 1 ? "event" : "events"}, including ${highlightedEvent.name}.`
    : `Explore our published events and classes, including ${highlightedEvent.name}.`;

  return (
    <section
      aria-label="Events and classes"
      className="container mx-auto px-4 py-4 sm:px-6"
      data-testid="event-announcement-banner"
    >
      <div className="flex flex-col gap-5 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-100 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-amber-900">
            <CalendarDays className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              Events &amp; classes
            </p>
            <h2 className="mt-1 text-lg font-semibold text-stone-900 sm:text-xl">
              Discover what’s happening
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-700">
              {registrationMessage}
            </p>
          </div>
        </div>
        <Button
          asChild
          className="w-full shrink-0 rounded-full bg-amber-800 text-white hover:bg-amber-900 sm:w-auto"
        >
          <Link href="/services/events" className="inline-flex items-center justify-center gap-2">
            Explore events <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
