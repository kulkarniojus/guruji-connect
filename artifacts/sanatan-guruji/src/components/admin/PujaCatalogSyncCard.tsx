import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PujaCatalogSyncApplyResult, PujaCatalogSyncPreview } from '@workspace/api-client-react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const previewKey = ['/api/admin/puja-catalog-sync/preview'] as const;

function money(value: number | null) {
  return value == null ? '—' : `₹${Number(value).toLocaleString('en-IN')}`;
}

function actionLabel(action: PujaCatalogSyncPreview['items'][number]['action']) {
  if (action === 'insert') return 'Add puja';
  if (action === 'unmark_popular') return 'Remove popular tag';
  if (action === 'skip_inactive') return 'Keep inactive';
  return 'Update image/popularity';
}

export default function PujaCatalogSyncCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [lastResult, setLastResult] = useState<PujaCatalogSyncApplyResult | null>(null);

  const preview = useQuery<PujaCatalogSyncPreview>({
    queryKey: previewKey,
    queryFn: async () => (await apiRequest('GET', previewKey[0])).json(),
    refetchOnMount: 'always',
  });

  const apply = useMutation({
    mutationFn: async () => (await apiRequest('POST', '/api/admin/puja-catalog-sync/apply', {})).json() as Promise<PujaCatalogSyncApplyResult>,
    onSuccess: async result => {
      setLastResult(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: previewKey }),
        queryClient.invalidateQueries({ queryKey: ['/api/pujas'] }),
      ]);
      toast({ title: 'Popular puja catalog refreshed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Catalog sync failed', description: error.message, variant: 'destructive' });
      void preview.refetch();
    },
  });

  const plan = preview.data;
  const itemCount = plan?.items.length ?? 0;
  const canApply = !!plan && !plan.alreadyApplied && itemCount > 0 && !apply.isPending;

  const applySync = () => {
    if (!plan || !canApply) return;
    const priceNote = plan.insertCount > 0
      ? 'New entries will use the development base and sale prices shown below.'
      : 'Existing base and sale prices will not change.';
    const confirmed = window.confirm(
      `Apply the one-time popular puja catalog sync? ${priceNote} Customer and Guruji accounts, bookings, payments, event registrations, and inactive pujas will not be changed.`,
    );
    if (confirmed) apply.mutate();
  };

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4" />
              Popular puja catalog refresh
            </CardTitle>
            <CardDescription className="mt-1 max-w-3xl">
              One-time, audited sync from the development catalog. Existing prices and all customer, Guruji, booking, payment, and event data are preserved.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-amber-300 bg-white">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            Admin only
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {preview.isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking catalog…
          </p>
        )}
        {preview.isError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-background p-3 text-sm">
            <span className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" /> Catalog sync preview is unavailable.
            </span>
            <Button variant="outline" size="sm" onClick={() => void preview.refetch()}>Retry</Button>
          </div>
        )}
        {plan && (
          <>
            {plan.alreadyApplied ? (
              <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                This one-time catalog sync has already been applied.
              </div>
            ) : (
              <>
                <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <p><strong>{plan.updateCount}</strong> existing pujas to update</p>
                  <p><strong>{plan.insertCount}</strong> missing pujas to add</p>
                  <p><strong>{plan.unmarkPopularCount}</strong> popular tags to remove</p>
                  <p><strong>{plan.skippedInactiveCount}</strong> inactive pujas to preserve</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Existing entries keep their prices. New entries use development prices shown in the preview. Deactivated pujas stay deactivated.
                </p>
                {itemCount > 0 && (
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border bg-background p-3">
                    {plan.items.map((item, index) => (
                      <div key={`${item.name}-${item.action}-${index}`} className="flex flex-col gap-1 border-b pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            <Badge variant={item.action === 'skip_inactive' ? 'secondary' : 'outline'}>
                              {actionLabel(item.action)}
                            </Badge>
                          </div>
                          <p className="break-all text-xs text-muted-foreground">
                            {item.currentImageUrl && item.currentImageUrl !== item.targetImageUrl
                              ? `${item.currentImageUrl} → ${item.targetImageUrl}`
                              : item.targetImageUrl || 'No image change'}
                          </p>
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground">
                          {item.action === 'insert'
                            ? `Base ${money(item.targetBasePrice)} · Price ${money(item.targetPrice)}`
                            : `Price unchanged: ${money(item.currentPrice)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={applySync} disabled={!canApply}>
                    {apply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Apply one-time sync
                  </Button>
                  <Button variant="outline" onClick={() => void preview.refetch()} disabled={preview.isFetching || apply.isPending}>
                    Refresh preview
                  </Button>
                </div>
                {itemCount === 0 && (
                  <p className="text-sm text-muted-foreground">The active catalog already matches the selected popular pujas.</p>
                )}
              </>
            )}
          </>
        )}
        {lastResult && (
          <p className="text-sm text-emerald-700" role="status">
            Applied: {lastResult.updated} updated, {lastResult.inserted} added, {lastResult.unmarkedPopular} popular tags removed, {lastResult.skippedInactive} inactive preserved.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
