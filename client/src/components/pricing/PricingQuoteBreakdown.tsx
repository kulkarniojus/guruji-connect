import { AlertCircle, Clock3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PricingQuote } from './usePricingQuote';

const money = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function PricingQuoteBreakdown({
  quote,
  loading,
  error,
  onRefresh,
}: {
  quote?: PricingQuote;
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground" role="status">Checking current price…</div>;
  }
  if (error || !quote) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert">
        <p className="text-sm text-destructive">We couldn’t confirm the current price. Refresh before continuing.</p>
        <Button className="mt-3" type="button" size="sm" variant="outline" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry price check
        </Button>
      </div>
    );
  }
  return (
    <section className="rounded-lg border border-primary/20 bg-primary/[0.035] p-4" aria-label="Price breakdown">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">Price breakdown</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onRefresh} aria-label="Refresh price quote">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Regular puja price</dt><dd>{money(quote.regularPrice)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Adjusted puja price</dt><dd className="font-medium">{money(quote.pujaPrice)}</dd></div>
        {quote.adjustment !== 0 && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Price adjustment</dt><dd>{quote.adjustment > 0 ? '+' : ''}{money(quote.adjustment)}</dd></div>}
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Samagri</dt><dd>{money(quote.samagriPrice)}</dd></div>
        <div className="border-t pt-2 flex justify-between gap-4 text-base font-semibold"><dt>Total</dt><dd>{money(quote.totalAmount)}</dd></div>
      </dl>
      <div className="mt-3 flex items-start gap-2 rounded-md bg-background/80 p-2.5 text-xs text-muted-foreground">
        <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>{quote.explanation || quote.rule?.customerMessage || 'Price is based on the selected puja and appointment time.'}</p>
      </div>
      {quote.quotedAt && <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><AlertCircle className="h-3 w-3" /> Quote refreshes when your selection changes.</p>}
    </section>
  );
}
