import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale } from 'lucide-react';

export type BookingCommissionSnapshot = {
  percentage: number;
  bookingAmount: number;
  portalAmount: number;
  gurujiAmount: number;
  source: string;
  categoryName?: string | null;
};

type BookingCommissionBreakdownProps = {
  snapshot: BookingCommissionSnapshot | null;
  className?: string;
};

const money = (value: number) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
const sourceLabel = (source: string) => {
  const labels: Record<string, string> = {
    default: 'Default rate',
    puja: 'Puja override',
    other_category: 'Other-category rate',
    unconfigured: 'Not configured at booking',
    override: 'Puja override',
    puja_override: 'Puja override',
    legacy: 'Recorded legacy rate',
  };
  return labels[source] ?? source.replace(/[_-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
};

export default function BookingCommissionBreakdown({ snapshot, className }: BookingCommissionBreakdownProps) {
  if (!snapshot) {
    return (
      <section className={className} aria-label="Booking commission record">
        <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/20 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><Scale className="h-4 w-4" /></div>
          <div>
            <p className="text-sm font-medium">No commission snapshot recorded</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">This booking has no saved commission split. It may predate commission snapshots; the current setting is not applied retroactively.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4 text-primary" /> Recorded commission split</CardTitle>
          <Badge variant="outline">{sourceLabel(snapshot.source)}</Badge>
        </div>
          <CardDescription>
            {snapshot.categoryName ? `${snapshot.categoryName} · ` : ''}
            Saved with this booking; later commission changes do not alter this record.
          </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-muted/45 p-3"><p className="text-xs text-muted-foreground">Final booking total</p><p className="mt-1 font-mono font-semibold">{money(snapshot.bookingAmount)}</p></div>
          <div className="rounded-md bg-primary/[0.07] p-3"><p className="text-xs text-muted-foreground">Portal · {snapshot.percentage}%</p><p className="mt-1 font-mono font-semibold">{money(snapshot.portalAmount)}</p></div>
          <div className="col-span-2 rounded-md border p-3 sm:col-span-1"><p className="text-xs text-muted-foreground">Guruji</p><p className="mt-1 font-mono font-semibold">{money(snapshot.gurujiAmount)}</p></div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">This is the stored booking allocation. It does not indicate that a payment, transfer or payout has occurred.</p>
      </CardContent>
    </Card>
  );
}
