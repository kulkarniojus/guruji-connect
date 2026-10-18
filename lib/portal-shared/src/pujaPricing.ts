export type PricingMode = 'percent' | 'amount' | 'fixed';
export interface PricingRule {
  id: number;
  pujaId: number | null;
  pujaIds?: number[];
  name: string;
  withinHours: number;
  mode: PricingMode;
  value: number;
  customerMessage: string;
  enabled: boolean;
}
export interface RegularPriceAdjustment {
  id: number;
  pujaIds: number[];
  fromDate: string;
  toDate: string;
  mode: PricingMode;
  value: number;
}
export interface PricingQuote {
  pujaId: number;
  basePrice?: number | null;
  salePrice?: number | null;
  regularPrice: number;
  pujaPrice: number;
  samagriPrice: number;
  totalAmount: number;
  adjustment: number;
  rule: PricingRule | null;
  explanation: string;
  quotedAt: string;
  scheduledAt: string;
  regularPriceAdjustment?: RegularPriceAdjustment | null;
  regularAdjustment?: number;
  timeAdjustment?: number;
  effectiveRegularPrice?: number;
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
  return rules.filter(r => r.enabled && pricingRuleMatchesPuja(r, pujaId) &&
    leadHours >= 0 && leadHours <= r.withinHours)
    .sort((a, b) => a.withinHours - b.withinHours ||
      Number(pricingRulePujaIds(b).length > 0) - Number(pricingRulePujaIds(a).length > 0) || a.id - b.id)[0] ?? null;
}

export function pricingRulePujaIds(rule: Pick<PricingRule, 'pujaId' | 'pujaIds'>): number[] {
  return rule.pujaIds ?? (rule.pujaId === null ? [] : [rule.pujaId]);
}
export function pricingRuleMatchesPuja(rule: Pick<PricingRule, 'pujaId' | 'pujaIds'>, pujaId: number): boolean {
  const ids = pricingRulePujaIds(rule);
  return ids.length === 0 || ids.includes(pujaId);
}
export function selectRegularPriceAdjustment(
  adjustments: RegularPriceAdjustment[], pujaId: number, calendarDate: string,
): RegularPriceAdjustment | null {
  return adjustments.find(a => a.pujaIds.includes(pujaId) &&
    calendarDate >= a.fromDate && calendarDate <= a.toDate) ?? null;
}
