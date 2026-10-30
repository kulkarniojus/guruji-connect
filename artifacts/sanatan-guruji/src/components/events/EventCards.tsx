import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CalendarDays, MapPin, Video } from "lucide-react";
import type { EventRecord } from "@workspace/api-client-react";
import { Price, fmtDate } from "./eventUtils";

export default function EventCards({ events }: { events: EventRecord[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map(event => {
        const banner = event.media.find(item => item.kind === "banner");
        return (
          <Link
            key={event.id}
            href={`/services/events/${event.id}`}
            data-testid={`card-event-${event.id}`}
            className="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {banner ? (
              <img src={banner.url} alt={banner.label || event.name} loading="lazy" className="h-44 w-full object-cover" />
            ) : (
              <div className="flex h-44 items-center justify-center bg-primary/10 text-primary" aria-hidden="true">
                <CalendarDays className="h-12 w-12" />
              </div>
            )}
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="text-lg font-semibold">{event.name}</h3>
              <p className="text-sm text-muted-foreground">{event.classType} · Ages {event.ageMin}–{event.ageMax}</p>
              <p className="text-sm">{fmtDate(event.startDate)}
                {event.endDate !== event.startDate ? ` to ${fmtDate(event.endDate)}` : ""} at {event.startTime} IST
              </p>
              <p className="flex items-center gap-1 break-words text-sm text-muted-foreground">
                {event.mode === "online" ? <Video className="h-4 w-4 shrink-0" /> : <MapPin className="h-4 w-4 shrink-0" />}
                {event.mode === "online" ? "Online" : event.location}
                {" · "}{event.city}, {event.state}
              </p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                <Price event={event} />
                <Badge variant={event.registrationOpen ? "default" : "secondary"}>
                  {event.registrationOpen ? `${event.availableSeats} seats left` : "Registration closed"}
                </Badge>
              </div>
              <span className="mt-2 inline-flex items-center gap-1 font-medium text-primary">
                {event.registrationOpen ? "View details & register" : "View event details"}
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
