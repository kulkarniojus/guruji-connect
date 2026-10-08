export type PricingMode = 'percent' | 'amount' | 'fixed';
export interface PricingRule {
  id: number;
  pujaId: number | null;
  name: string;
  withinHours: number;
  mode: PricingMode;
  value: number;
  customerMessage: string;
  enabled: boolean;
}
export interface PricingQuote {
  pujaId: number;
  regularPrice: number;
  pujaPrice: number;
  samagriPrice: number;
  totalAmount: number;
  adjustment: number;
  rule: PricingRule | null;
  explanation: string;
  quotedAt: string;
  scheduledAt: string;
}

// Rupee amounts in the connected booking/puja tables are integers.
export function adjustedPrice(regularPrice: number, mode: PricingMode, value: number): number {
  const price = Math.round(mode === 'fixed' ? value : mode === 'percent'
    ? regularPrice * (1 + value / 100) : regularPrice + value);
  if (!Number.isFinite(price) || price < 1 || price > 100_000_000) {
    throw new RangeError('The resulting puja price must be between ₹1 and ₹10,00,00,000.');
  }
  return price;
}

export function selectPricingRule(rules: PricingRule[], pujaId: number, leadHours: number): PricingRule | null {
  return rules.filter(r => r.enabled && (r.pujaId === null || r.pujaId === pujaId) &&
    leadHours >= 0 && leadHours <= r.withinHours)
    .sort((a, b) => a.withinHours - b.withinHours ||
      Number(b.pujaId !== null) - Number(a.pujaId !== null) || a.id - b.id)[0] ?? null;
}
