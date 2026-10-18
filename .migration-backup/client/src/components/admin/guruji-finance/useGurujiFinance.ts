import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GurujiFinanceReport } from '@shared/gurujiFinance';
import { financeRequest, FINANCE_BASE, FINANCE_KEY } from './finance-utils';

export type FinanceFilters = { from: string; to: string; gurujiId: string; search: string };

export function useGurujiFinance(filters: FinanceFilters) {
  const queryClient = useQueryClient();
  const query = useQuery<GurujiFinanceReport>({
    queryKey: [...FINANCE_KEY, filters],
    staleTime: 30000,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.gurujiId) params.set('gurujiId', filters.gurujiId);
      if (filters.search.trim()) params.set('search', filters.search.trim());
      const response = await fetch(`${FINANCE_BASE}?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error((await response.text()) || 'Could not load finance report.');
      return response.json();
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: FINANCE_KEY });
  const mutation = useMutation({
    mutationFn: ({ method, path, body }: { method: string; path: string; body?: unknown }) => financeRequest(method, path, body),
    onSuccess: refresh,
  });
  return { query, mutation };
}
