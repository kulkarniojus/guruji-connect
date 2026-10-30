import { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import { useListEvents, getListEventsQueryKey } from "@workspace/api-client-react";
import { EventsNav } from "@/components/events/eventUtils";
import EventCards from "@/components/events/EventCards";
import { useAuth } from "@/context/AuthContext";

export default function EventsList() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const { user } = useAuth();
  const params = term ? { q: term } : undefined;
  const { data, isLoading, isError, refetch } = useListEvents(params, {
    query: { queryKey: [...getListEventsQueryKey(params), user?.id ?? "visitor", user?.role ?? "", user?.city ?? "", user?.state ?? ""], refetchInterval: 60000 },
  });
  const events = data ?? [];
  return (
    <MainLayout>
      <div className="container mx-auto py-12">
        <h1 className="mb-2 text-3xl font-bold">Events</h1>
        <p className="mb-6 max-w-2xl text-gray-600">Devotional and religious-learning courses for children. Register your child as their guardian.</p>
        <EventsNav active="list" />
        <form className="mb-8 flex max-w-md gap-2" onSubmit={e => { e.preventDefault(); setTerm(q.trim()); }}>
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search events" aria-label="Search events" data-testid="input-event-search" />
          <Button type="submit" data-testid="button-event-search"><Search className="mr-2 h-4 w-4" />Search</Button>
        </form>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-72 animate-pulse rounded-lg bg-muted" />)}</div>
        ) : isError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <span>Events could not be loaded.</span>
            <Button variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
          </div>
        ) : events.length === 0 ? (
          <p className="rounded-md border bg-card p-10 text-center text-muted-foreground" data-testid="text-no-events">{term ? `No events match "${term}".` : !user ? "Sign in or create a customer account with your registered city to see events available near you." : user.role !== "customer" ? "Event listings are available to customer accounts." : user.city ? `No published events are currently available in ${user.city}${user.state ? `, ${user.state}` : ""}.` : "Add your city to your customer profile to see local events."}</p>
        ) : (
          <EventCards events={events} />
        )}
      </div>
    </MainLayout>
  );
}
