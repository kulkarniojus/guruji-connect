export type CommissionSnapshot = {
  percentage: number;
  bookingAmount: number;
  portalAmount: number;
  gurujiAmount: number;
  source: 'default' | 'puja' | 'other_category' | 'unconfigured';
  configured: boolean;
  pujaId: number | null;
  categoryId?: number | null;
  categoryName?: string | null;
  currency: 'INR';
  policyUpdatedAt: string | null;
  recordedAt: string;
};

export function resolveCommissionPolicy(input: {
  defaultPercentage: number;
  defaultConfigured: boolean;
  pujaOverride: number | null;
  otherCategoryOverride: number | null;
}): Pick<CommissionSnapshot, 'percentage' | 'configured' | 'source'> {
  if (input.otherCategoryOverride !== null) {
    return { percentage: input.otherCategoryOverride, configured: true, source: 'other_category' };
  }
  if (input.pujaOverride !== null) {
    return { percentage: input.pujaOverride, configured: true, source: 'puja' };
  }
  return {
    percentage: input.defaultPercentage,
    configured: input.defaultConfigured,
    source: input.defaultConfigured ? 'default' : 'unconfigured',
  };
}

export function commissionSplit(amount: number, percentage: number) {
  const cents=Math.round(amount*100);
  const basisPoints=Math.round(percentage*100);
  if(!Number.isFinite(amount)||amount<0||!Number.isSafeInteger(cents)||
    !Number.isFinite(percentage)||percentage<0||percentage>100||
    Math.abs(percentage*100-basisPoints)>1e-8) throw new Error('Invalid commission amount or percentage');
  const portalCents=Number((BigInt(cents)*BigInt(basisPoints)+BigInt(5000))/BigInt(10000));
  return {percentage,bookingAmount:cents/100,portalAmount:portalCents/100,gurujiAmount:(cents-portalCents)/100};
}
