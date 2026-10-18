import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { PricingQuote } from '@shared/pujaPricing';
export type { PricingQuote, PricingRule, RegularPriceAdjustment } from '@shared/pujaPricing';

export function usePricingQuote(
  pujaId: number | undefined,
  calendarDate: string | undefined,
  time: string,
  withSamagri: boolean,
) {
  const ready = !!pujaId && !!calendarDate && !!time;
  return useQuery<PricingQuote>({
    queryKey: ['/api/pricing/quote', pujaId, calendarDate, time, withSamagri],
    enabled: ready,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: ready ? 30_000 : false,
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/pricing/quote', {
        pujaId,
        calendarDate,
        time,
        withSamagri,
      });
      return response.json();
    },
  });
}
