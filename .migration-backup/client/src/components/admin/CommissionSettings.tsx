import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { commissionSplit } from '@shared/pujaCommission';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Check, ChevronRight, Loader2, RefreshCw, RotateCcw, Search, ShieldCheck, WalletCards } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CommissionPuja = {
  id: number;
  name: string;
  basePrice: number;
  salePrice: number | null;
  overridePercentage: number | null;
  effectivePercentage: number;
};

type CommissionSettingsResponse = {
  defaultPercentage: number;
  configured: boolean;
  updatedAt: string | null;
  pujas: CommissionPuja[];
};

const COMMISSIONS_KEY = ['/api/admin/commissions'];
const percentText = (value: number) => `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
const money = (value: number) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
const validPercentage = (value: string) => {
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(value)) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100;
};

export default function CommissionSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [defaultDraft, setDefaultDraft] = useState<string | null>(null);
  const [replaceOverrides, setReplaceOverrides] = useState(false);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDraft, setBulkDraft] = useState('');
  const [bookingAmount, setBookingAmount] = useState('2000');

  const commissionsQuery = useQuery<CommissionSettingsResponse>({
    queryKey: COMMISSIONS_KEY,
    queryFn: async () => (await apiRequest('GET', '/api/admin/commissions')).json(),
  });
  const settings = commissionsQuery.data;
  const pujas = settings?.pujas ?? [];
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredPujas = useMemo(
    () => pujas.filter(puja => puja.name.toLocaleLowerCase().includes(normalizedSearch)),
    [pujas, normalizedSearch],
  );
  const chosenDefault = defaultDraft ?? String(settings?.defaultPercentage ?? 0);
  const defaultError = validPercentage(chosenDefault) ? '' : 'Enter a percentage from 0 to 100, with no more than 2 decimal places.';
  const bulkError = validPercentage(bulkDraft) ? '' : 'Enter a percentage from 0 to 100, with no more than 2 decimal places.';
  const parsedAmount = Number(bookingAmount);
  const previewValid = bookingAmount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount >= 0 && Number.isSafeInteger(Math.round(parsedAmount*100));
  const previewRate = validPercentage(chosenDefault) ? Number(chosenDefault) : 0;
  const split = previewValid ? commissionSplit(parsedAmount,previewRate) : null;
  const portalAmount = split?.portalAmount ?? 0;
  const gurujiAmount = split?.gurujiAmount ?? 0;
  const selectedCount = selectedIds.filter(id => pujas.some(puja => puja.id === id)).length;
  const overridableCount = pujas.filter(puja => puja.overridePercentage !== null).length;

  const refresh = () => queryClient.invalidateQueries({ queryKey: COMMISSIONS_KEY });
  const defaultMutation = useMutation({
    mutationFn: async ({ percentage, replace }: { percentage: number; replace: boolean }) =>
      apiRequest('PUT', '/api/admin/commissions/default', { percentage, replaceOverrides: replace }),
    onSuccess: async () => {
      await refresh();
      setDefaultDraft(null);
      setReplaceOverrides(false);
      setConfirmReplaceOpen(false);
      toast({ title: 'Default commission saved' });
    },
    onError: (error: Error) => toast({ title: 'Could not save default commission', description: error.message, variant: 'destructive' }),
  });
  const bulkMutation = useMutation({
    mutationFn: async () => {
      if (!validPercentage(bulkDraft)) throw new Error('Enter a valid percentage from 0 to 100, with up to 2 decimal places.');
      if (!selectedIds.length) throw new Error('Select at least one puja.');
      return apiRequest('PUT', '/api/admin/commissions/pujas', { pujaIds: selectedIds, percentage: Number(bulkDraft) });
    },
    onSuccess: async () => {
      await refresh();
      setSelectedIds([]);
      setBulkDraft('');
      toast({ title: 'Puja commission rates saved' });
    },
    onError: (error: Error) => toast({ title: 'Could not save puja rates', description: error.message, variant: 'destructive' }),
  });
  const resetMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/admin/commissions/pujas/${id}`),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Puja now uses the default rate' });
    },
    onError: (error: Error) => toast({ title: 'Could not reset puja rate', description: error.message, variant: 'destructive' }),
  });

  const submitDefault = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (defaultError) return;
    if (replaceOverrides) {
      setConfirmReplaceOpen(true);
      return;
    }
    defaultMutation.mutate({ percentage: Number(chosenDefault), replace: false });
  };
  const saveConfirmedDefault = () => defaultMutation.mutate({ percentage: Number(chosenDefault), replace: true });
  const togglePuja = (id: number) => setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const selectVisible = () => setSelectedIds(current => {
    const next = new Set(current);
    const allVisibleSelected = filteredPujas.length > 0 && filteredPujas.every(puja => next.has(puja.id));
    filteredPujas.forEach(puja => allVisibleSelected ? next.delete(puja.id) : next.add(puja.id));
    return Array.from(next);
  });
  const selectAllVisible = filteredPujas.length > 0 && filteredPujas.every(puja => selectedIds.includes(puja.id));

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.035] px-5 py-5 sm:px-7">
        <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full border-[28px] border-primary/[0.045]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <span className="h-px w-6 bg-primary/60" /> Commission policy
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">One booking. A clear split.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Commission is allocated from the final booking total after discounts, price adjustments and samagri. It is never an extra customer charge.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-lg border bg-background/80 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><WalletCards className="h-4 w-4" /></div>
            <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Current default</p><p className="font-mono text-xl font-semibold">{percentText(settings?.defaultPercentage ?? 0)}</p></div>
          </div>
        </div>
        <div className="relative mt-5 grid gap-2 border-t border-primary/10 pt-4 text-xs text-muted-foreground sm:grid-cols-3">
          <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Applies to new bookings only</p>
          <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Existing booking snapshots stay unchanged</p>
          <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Payments and payouts remain disabled</p>
        </div>
      </section>

      {commissionsQuery.isLoading ? (
        <div className="space-y-4" aria-label="Loading commission settings">
          <div className="h-44 animate-pulse rounded-xl bg-muted" />
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : commissionsQuery.isError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/[0.035] p-5">
          <p className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4 text-destructive" /> Commission settings could not be loaded.</p>
          <p className="mt-1 text-sm text-muted-foreground">The saved default and puja rates are unavailable. No change has been made.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void commissionsQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button>
        </div>
      ) : (
        <>
          {!settings?.configured && (
            <div className="flex gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-4 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p><span className="font-medium">Commission has not been configured yet.</span> The current default is 0%. Until a rate is saved, new bookings use a 0% commission split.</p>
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(290px,0.72fr)]">
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-primary" /> Default rate</CardTitle>
                <CardDescription>Used by all pujas without an individual override, including pujas added later.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitDefault} className="space-y-4">
                  <div className="max-w-xs space-y-2">
                    <Label htmlFor="commission-default">Portal commission</Label>
                    <div className="relative">
                      <Input id="commission-default" type="number" min="0" max="100" step="0.01" value={chosenDefault} onChange={event => setDefaultDraft(event.target.value)} aria-invalid={Boolean(defaultError)} className="pr-10 font-mono" />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                    {defaultError ? <p className="text-xs text-destructive">{defaultError}</p> : <p className="text-xs text-muted-foreground">0 to 100%; up to two decimal places. Zero is allowed.</p>}
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors hover:bg-muted/40">
                    <input type="checkbox" checked={replaceOverrides} onChange={event => setReplaceOverrides(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
                    <span><span className="block text-sm font-medium">Replace all individual puja rates</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">Remove each override and make every puja inherit this default. This cannot be undone.</span></span>
                  </label>
                  <Button type="submit" disabled={Boolean(defaultError) || defaultMutation.isPending} className="min-w-40">
                    {defaultMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save default rate
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/80 bg-[linear-gradient(145deg,hsl(var(--card)),hsl(var(--primary)/0.045))]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3"><CardTitle className="text-lg">Split preview</CardTitle><Badge variant="secondary">Illustrative</Badge></div>
                <CardDescription>Calculated from the final customer booking total.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="commission-preview-amount">Final booking amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                    <Input id="commission-preview-amount" type="number" min="0" step="0.01" value={bookingAmount} onChange={event => setBookingAmount(event.target.value)} className="pl-8 font-mono" />
                  </div>
                </div>
                <div className="rounded-lg border bg-background/75 p-4">
                  <div className="mb-3 flex items-baseline justify-between gap-2"><span className="text-sm text-muted-foreground">Final booking total</span><span className="font-mono font-semibold">{previewValid ? money(parsedAmount) : '—'}</span></div>
                  <div className="h-px bg-border" />
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-primary/[0.07] p-3"><p className="text-xs text-muted-foreground">Portal · {percentText(previewRate)}</p><p className="mt-1 font-mono text-lg font-semibold">{previewValid ? money(portalAmount) : '—'}</p></div>
                    <div className="rounded-md bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Guruji</p><p className="mt-1 font-mono text-lg font-semibold">{previewValid ? money(gurujiAmount) : '—'}</p></div>
                  </div>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">Example: ₹2,000 at 20% allocates ₹400 to the portal and ₹1,600 to the Guruji. This is a booking calculation only; no payment transfer or payout is enabled.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80">
            <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><CardTitle className="text-lg">Puja rates</CardTitle><CardDescription className="mt-1">Search the catalogue, select multiple pujas to set one rate, or reset an override to the default.</CardDescription></div>
              <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search pujas" aria-label="Search pujas" className="pl-9" /></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="bulk-commission">Set rate for selected pujas</Label>
                  <div className="flex gap-2">
                    <div className="relative max-w-[180px] flex-1"><Input id="bulk-commission" type="number" min="0" max="100" step="0.01" value={bulkDraft} onChange={event => setBulkDraft(event.target.value)} placeholder="Rate" aria-invalid={Boolean(bulkDraft && bulkError)} className="pr-8 font-mono" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span></div>
                    <Button onClick={() => bulkMutation.mutate()} disabled={!selectedCount || !validPercentage(bulkDraft) || bulkMutation.isPending}>
                      {bulkMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Apply to {selectedCount || 'selected'}
                    </Button>
                  </div>
                  {bulkDraft && bulkError && <p className="text-xs text-destructive">{bulkError}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} disabled={!selectedIds.length}>Clear selection</Button>
              </div>

              {pujas.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center"><p className="font-medium">No pujas are available</p><p className="mt-1 text-sm text-muted-foreground">Puja rates will appear here when the catalogue is populated.</p></div>
              ) : filteredPujas.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center"><p className="font-medium">No matches for “{search}”</p><p className="mt-1 text-sm text-muted-foreground">Try another puja name.</p></div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <div className="flex items-center gap-3 border-b bg-muted/35 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <input type="checkbox" checked={selectAllVisible} onChange={selectVisible} aria-label="Select all visible pujas" className="h-4 w-4 accent-primary" />
                    <span className="flex-1">Puja</span><span className="hidden w-32 sm:block">Effective rate</span><span className="w-20 text-right">Action</span>
                  </div>
                  <div className="divide-y">
                    {filteredPujas.map(puja => {
                      const overridden = puja.overridePercentage !== null;
                      const busy = resetMutation.isPending && resetMutation.variables === puja.id;
                      return (
                        <div key={puja.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/25">
                          <input type="checkbox" checked={selectedIds.includes(puja.id)} onChange={() => togglePuja(puja.id)} aria-label={`Select ${puja.name}`} className="h-4 w-4 shrink-0 accent-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{puja.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">Base {money(puja.basePrice)}{puja.salePrice !== null ? ` · sale ${money(puja.salePrice)}` : ''}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
                              <span className="font-mono text-sm font-semibold">{percentText(puja.effectivePercentage)}</span>
                              <Badge variant={overridden ? 'outline' : 'secondary'} className="text-[10px]">{overridden ? 'Override' : 'Default'}</Badge>
                            </div>
                          </div>
                          <div className="hidden w-32 sm:block">
                            <p className="font-mono text-sm font-semibold">{percentText(puja.effectivePercentage)}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{overridden ? `Override · default ${percentText(settings?.defaultPercentage ?? 0)}` : 'Inherits default'}</p>
                          </div>
                          <div className="flex w-20 justify-end">
                            {overridden ? (
                              <Button variant="ghost" size="sm" onClick={() => resetMutation.mutate(puja.id)} disabled={resetMutation.isPending} aria-label={`Reset ${puja.name} to default`} title="Reset to default">
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Reset</span></>}
                              </Button>
                            ) : <span className="flex items-center text-xs text-muted-foreground">Default <ChevronRight className="ml-1 h-3 w-3" /></span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
                    {filteredPujas.length} {filteredPujas.length === 1 ? 'puja' : 'pujas'} shown · {overridableCount} individual {overridableCount === 1 ? 'override' : 'overrides'} across catalogue
                  </div>
                </div>
              )}
              {settings?.updatedAt && <p className="text-xs text-muted-foreground">Last updated {new Date(settings.updatedAt).toLocaleString('en-IN')}</p>}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={confirmReplaceOpen} onOpenChange={open => { if (!defaultMutation.isPending) setConfirmReplaceOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace every individual puja rate?</DialogTitle>
            <DialogDescription>This is a destructive change and cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/25 bg-destructive/[0.04] p-4 text-sm leading-6">
            Saving a default of <strong>{defaultError ? '—' : percentText(Number(chosenDefault))}</strong> will permanently remove all <strong>{overridableCount}</strong> existing individual puja {overridableCount === 1 ? 'override' : 'overrides'}. Every puja will then inherit the new default. Existing booking snapshots remain unchanged.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReplaceOpen(false)} disabled={defaultMutation.isPending}>Keep current overrides</Button>
            <Button variant="destructive" onClick={saveConfirmedDefault} disabled={Boolean(defaultError) || defaultMutation.isPending}>
              {defaultMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Remove overrides and save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
