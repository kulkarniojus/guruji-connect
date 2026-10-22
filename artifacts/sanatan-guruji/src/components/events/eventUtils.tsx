import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import type { EventRecord } from "@workspace/api-client-react";

const TZ = "Asia/Kolkata";
export const fmtDateTime = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat("en-IN", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) + " IST" : "";
export const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", dateStyle: "medium" }).format(new Date(d + "T00:00:00Z"));
export const rupees = (n: number) => `Rs. ${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function errMsg(e: unknown): string {
  const x = e as { data?: { error?: string; message?: string }; message?: string };
  return x?.data?.error || x?.data?.message || x?.message || "Something went wrong. Please try again.";
}

export function Price({ event }: { event: Pick<EventRecord, "basePrice" | "discountedPrice" | "currentPrice"> }) {
  if (event.currentPrice === 0) return <span className="font-semibold text-green-700" data-testid="text-price-free">Free</span>;
  const disc = event.currentPrice < event.basePrice;
  return (
    <span data-testid="text-price">
      {disc && <span className="mr-2 text-sm text-muted-foreground line-through">{rupees(event.basePrice)}</span>}
      <span className="font-semibold">{rupees(event.currentPrice)}</span>
      <span className="ml-1 text-xs text-muted-foreground">per child, full course</span>
    </span>
  );
}

export function EventsNav({ active }: { active: "list" | "mine" }) {
  const cls = (a: boolean) => `rounded-full px-4 py-1.5 text-sm ${a ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`;
  return (
    <nav className="mb-6 flex gap-2" aria-label="Events navigation">
      <Link href="/services/events" className={cls(active === "list")} data-testid="link-events-all">All events</Link>
      <Link href="/events/registrations" className={cls(active === "mine")} data-testid="link-my-event-registrations">My event registrations</Link>
    </nav>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const v = status === "published" || status === "paid" || status === "confirmed" ? "default" : status.includes("cancel") ? "destructive" : "secondary";
  return <Badge variant={v as "default"}>{status.replace(/_/g, " ")}</Badge>;
}

export function newRequestId() {
  return crypto.randomUUID();
}
