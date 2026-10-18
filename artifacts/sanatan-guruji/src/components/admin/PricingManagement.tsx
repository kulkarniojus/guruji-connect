import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, Pencil, Plus, RefreshCw, SlidersHorizontal, Trash2 } from 'lucide-react';
import type { PricingRule, RegularPriceAdjustment } from '@/components/pricing/usePricingQuote';
import { adjustedPrice } from '@shared/pujaPricing';
import { pricingRulePujaIds } from '@shared/pujaPricing';
import MultiPujaSelect from './MultiPujaSelect';

type PujaOption = { id: number; name: string; price?: number | null; basePrice: number };
type Rule = PricingRule;
type RuleDraft = Omit<Rule, 'id'>;
type AdjustmentDraft = Omit<RegularPriceAdjustment, 'id'>;
const blankDraft: RuleDraft = { pujaId: null, pujaIds: [], name: '', withinHours: 4, mode: 'percent', value: 0, customerMessage: '', enabled: false };
const blankAdjustment: AdjustmentDraft = { pujaIds: [], fromDate: '', toDate: '', mode: 'amount', value: 0 };
const money = (value: number) => `₹${Number(value).toLocaleString('en-IN')}`;
const scopeIds = (rule: Pick<PricingRule, 'pujaId' | 'pujaIds'>) => Array.from(new Set(pricingRulePujaIds(rule))).sort((a, b) => a - b);

export default function PricingManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Rule | null>(null);
  const [draft, setDraft] = useState<RuleDraft>(blankDraft);
  const [ruleDirection, setRuleDirection] = useState<'increase' | 'decrease'>('increase');
  const [ruleAllPujas, setRuleAllPujas] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustment, setAdjustment] = useState<AdjustmentDraft>(blankAdjustment);

  const rulesQuery = useQuery<Rule[]>({ queryKey: ['/api/admin/pricing/rules'] });
  const adjustmentsQuery = useQuery<RegularPriceAdjustment[]>({ queryKey: ['/api/admin/pricing/regular-adjustments'] });
  const pujasQuery = useQuery<PujaOption[]>({ queryKey: ['/api/pujas'] });
  const rules = rulesQuery.data ?? [];
  const adjustments = adjustmentsQuery.data ?? [];
  const pujas = pujasQuery.data ?? [];
  const pujaNames = useMemo(() => new Map(pujas.map(p => [p.id, p.name])), [pujas]);
  const refreshRules = () => queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing/rules'] });
  const refreshAdjustments = () => queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing/regular-adjustments'] });
  const ruleScope = scopeIds(draft);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const magnitude = Math.abs(Number(draft.value));
      const value = draft.mode === 'fixed' ? magnitude : ruleDirection === 'decrease' ? -magnitude : magnitude;
      const pujaIds = Array.from(new Set(draft.pujaIds ?? [])).sort((a, b) => a - b);
      if (!ruleAllPujas && !pujaIds.length) throw new Error('Select at least one puja or choose All pujas.');
      const payload = { ...draft, pujaId: null, pujaIds: ruleAllPujas ? [] : pujaIds, withinHours: Number(draft.withinHours), value };
      const response = await apiRequest(editing ? 'PUT' : 'POST', editing ? `/api/admin/pricing/rules/${editing.id}` : '/api/admin/pricing/rules', payload);
      return response.json();
    },
    onSuccess: () => {
      void refreshRules();
      setDialogOpen(false);
      toast({ title: 'Pricing rule saved' });
    },
    onError: (error: Error) => toast({ title: 'Could not save rule', description: error.message, variant: 'destructive' }),
  });
  const toggleMutation = useMutation({
    mutationFn: async (rule: Rule) => apiRequest('PUT', `/api/admin/pricing/rules/${rule.id}`, {
      ...rule, pujaIds: scopeIds(rule), pujaId: null, enabled: !rule.enabled,
    }),
    onSuccess: () => void refreshRules(),
    onError: (error: Error) => toast({ title: 'Could not update rule', description: error.message, variant: 'destructive' }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/admin/pricing/rules/${id}`),
    onSuccess: () => { void refreshRules(); toast({ title: 'Pricing rule deleted' }); },
    onError: (error: Error) => toast({ title: 'Could not delete rule', description: error.message, variant: 'destructive' }),
  });
  const createAdjustmentMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(new Set(adjustment.pujaIds)).sort((a, b) => a - b);
      if (!ids.length) throw new Error('Select at least one puja.');
      if (!adjustment.fromDate || !adjustment.toDate) throw new Error('Choose both a From date and a To date.');
       const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
      if (!validDate(adjustment.fromDate) || !validDate(adjustment.toDate) || adjustment.fromDate > adjustment.toDate) {
        throw new Error('Enter valid dates with the From date on or before the To date.');
      }
      const magnitude = Number(adjustment.value);
      if (!Number.isFinite(magnitude) || magnitude < (adjustment.mode === 'percent' ? 0.01 : 1) ||
        (adjustment.mode !== 'percent' && !Number.isInteger(magnitude))) {
        throw new Error(adjustment.mode === 'percent' ? 'Enter a positive percent magnitude.' : 'Enter a positive whole-rupee amount.');
      }
      const value = adjustment.mode === 'fixed' ? magnitude : adjustDirection === 'decrease' ? -magnitude : magnitude;
      const response = await apiRequest('POST', '/api/admin/pricing/regular-adjustments', { ...adjustment, pujaIds: ids, value });
      return response.json();
    },
    onSuccess: async () => {
      await refreshAdjustments();
      toast({ title: 'Dated regular-price adjustment saved' });
      setAdjustment(blankAdjustment);
    },
    onError: (error: Error) => toast({ title: 'Could not save adjustment', description: error.message, variant: 'destructive' }),
  });
  const [adjustDirection, setAdjustDirection] = useState<'increase' | 'decrease'>('increase');
  const deleteAdjustmentMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/admin/pricing/regular-adjustments/${id}`),
    onSuccess: async () => { await refreshAdjustments(); toast({ title: 'Dated adjustment deleted' }); },
    onError: (error: Error) => toast({ title: 'Could not delete adjustment', description: error.message, variant: 'destructive' }),
  });

  const startCreate = () => { setEditing(null); setDraft({ ...blankDraft }); setRuleDirection('increase'); setRuleAllPujas(true); setDialogOpen(true); };
  const startEdit = (rule: Rule) => {
    setEditing(rule);
    setRuleDirection(rule.value < 0 ? 'decrease' : 'increase');
    setRuleAllPujas(scopeIds(rule).length === 0);
    setDraft({
      pujaId: null, pujaIds: scopeIds(rule), name: rule.name, withinHours: rule.withinHours,
      mode: rule.mode, value: rule.value, customerMessage: rule.customerMessage, enabled: rule.enabled,
    });
    setDialogOpen(true);
  };
  const submitRule = (event: React.FormEvent) => {
    event.preventDefault();
    const magnitude = Math.abs(Number(draft.value));
    if (!draft.name.trim() || !Number.isFinite(Number(draft.withinHours)) || Number(draft.withinHours) <= 0 || Number(draft.withinHours) > 8760 ||
      !Number.isFinite(magnitude) || (draft.mode === 'fixed' && (!Number.isInteger(magnitude) || magnitude < 1)) ||
      (draft.mode === 'amount' && (!Number.isInteger(magnitude) || magnitude < 1)) || (draft.mode === 'percent' && magnitude <= 0)) return;
    saveMutation.mutate();
  };
  const preview = (rule: RuleDraft) => {
    const scope = pujas.find(p => p.id === ruleScope[0]);
    const price = scope ? Number(scope.price ?? scope.basePrice) : Number(pujas[0]?.price ?? pujas[0]?.basePrice ?? 0);
    const magnitude = Math.abs(Number(rule.value));
    const signedValue = rule.mode === 'fixed' ? magnitude : ruleDirection === 'decrease' ? -magnitude : magnitude;
    try {
      const result = adjustedPrice(price, rule.mode, signedValue);
      return `Example ${scope ? `for ${scope.name}` : `from ${pujas[0]?.name ?? 'a puja'}`}: ${money(price)} → ${money(result)} (rounded to whole rupees)`;
    } catch {
      return 'This rule produces an invalid price. Review the value before saving';
    }
  };
  const formatScope = (ids: number[]) => ids.length === 0 ? 'All pujas' : ids.map(id => pujaNames.get(id) ?? `Puja #${id}`).join(', ');

  return (
    <div className="space-y-5">
      <Card className="border-primary/15">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" /> Pricing rules</CardTitle><CardDescription className="mt-1">One matching rule applies: the closest booking window wins. Multiple pujas can share a rule; rules do not stack.</CardDescription></div>
          <Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" /> Add rule</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {rulesQuery.isLoading ? <div className="space-y-3" aria-label="Loading pricing rules"><div className="h-14 animate-pulse rounded-md bg-muted" /><div className="h-14 animate-pulse rounded-md bg-muted" /></div> :
            rulesQuery.isError ? <div className="rounded-md border border-destructive/30 p-4 text-sm" role="alert"><p>Pricing rules could not be loaded.</p><Button className="mt-2" variant="outline" size="sm" onClick={() => void rulesQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button></div> :
            rules.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center"><p className="font-medium">No pricing rules yet</p><p className="mt-1 text-sm text-muted-foreground">Create a rule to price selected booking windows. No price changes until a rule is enabled.</p></div> :
            rules.map(rule => <div key={rule.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{rule.name}</p><Badge variant={rule.enabled ? 'default' : 'secondary'}>{rule.enabled ? 'Enabled' : 'Off'}</Badge></div>
                <p className="mt-1 text-sm text-muted-foreground">{formatScope(scopeIds(rule))} · within {rule.withinHours} hours · {rule.mode === 'fixed' ? `fixed at ${money(rule.value)}` : `${rule.value > 0 && rule.mode === 'amount' ? '+' : ''}${rule.value}${rule.mode === 'percent' ? '%' : ' ₹'}`}</p>
                {rule.customerMessage && <p className="mt-1 text-sm">{rule.customerMessage}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={rule.enabled} onCheckedChange={() => toggleMutation.mutate(rule)} disabled={toggleMutation.isPending} aria-label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.name}`} />
                <Button variant="outline" size="icon" onClick={() => startEdit(rule)} aria-label={`Edit ${rule.name}`}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { if (window.confirm(`Delete “${rule.name}”?`)) deleteMutation.mutate(rule.id); }} disabled={deleteMutation.isPending} aria-label={`Delete ${rule.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Schedule a regular-price adjustment</CardTitle><CardDescription>Applies to the scheduled puja date in India. Both boundary dates are included; saved catalogue prices remain unchanged.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {pujasQuery.isError ? <p role="alert" className="text-sm text-destructive">Pujas could not be loaded. Retry in a moment.</p> : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <MultiPujaSelect pujas={pujas} selectedIds={adjustment.pujaIds} onChange={pujaIds => setAdjustment(value => ({ ...value, pujaIds }))} idPrefix="regular-puja" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="adjust-from">From date (inclusive)</Label><Input id="adjust-from" type="date" value={adjustment.fromDate} onChange={event => setAdjustment(value => ({ ...value, fromDate: event.target.value }))} required /></div>
                  <div className="space-y-2"><Label htmlFor="adjust-to">To date (inclusive)</Label><Input id="adjust-to" type="date" value={adjustment.toDate} min={adjustment.fromDate || undefined} onChange={event => setAdjustment(value => ({ ...value, toDate: event.target.value }))} required /></div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2"><Label htmlFor="adjust-mode">Adjustment type</Label><Select value={adjustment.mode} onValueChange={(mode: AdjustmentDraft['mode']) => setAdjustment(value => ({ ...value, mode }))}><SelectTrigger id="adjust-mode"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="amount">Amount change (₹)</SelectItem><SelectItem value="percent">Percent change</SelectItem><SelectItem value="fixed">Set final price</SelectItem></SelectContent></Select></div>
                {adjustment.mode !== 'fixed' && <div className="space-y-2"><Label htmlFor="adjust-direction">Direction</Label><Select value={adjustDirection} onValueChange={(direction: 'increase' | 'decrease') => setAdjustDirection(direction)}><SelectTrigger id="adjust-direction"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="increase">Increase</SelectItem><SelectItem value="decrease">Decrease</SelectItem></SelectContent></Select></div>}
                <div className="space-y-2"><Label htmlFor="adjust-value">{adjustment.mode === 'fixed' ? 'Final price (whole rupees)' : adjustment.mode === 'percent' ? 'Percent magnitude' : 'Amount magnitude (₹)'}</Label><Input id="adjust-value" type="number" min={adjustment.mode === 'percent' ? 0.01 : 1} step={adjustment.mode === 'percent' ? 'any' : 1} value={adjustment.value || ''} onChange={event => setAdjustment(value => ({ ...value, value: Number(event.target.value) }))} placeholder={adjustment.mode === 'percent' ? 'e.g. 12.5' : 'e.g. 250'} /></div>
                <div className="flex flex-col justify-end gap-2"><p className="text-xs text-muted-foreground">Selected pujas: {adjustment.pujaIds.length}</p><Button disabled={!adjustment.pujaIds.length || !adjustment.fromDate || !adjustment.toDate || !adjustment.value || adjustment.fromDate > adjustment.toDate || createAdjustmentMutation.isPending} onClick={() => createAdjustmentMutation.mutate()}>{createAdjustmentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save dated adjustment</Button></div>
              </div>
            </>
          )}
          <p className="flex items-start gap-2 text-xs text-muted-foreground"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Deleting an adjustment restores the catalogue price for future quotes only. Existing bookings and their saved price snapshots do not change.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Saved dated adjustments</CardTitle><CardDescription>Active price overrides by puja and scheduled date.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {adjustmentsQuery.isLoading ? <div className="h-16 animate-pulse rounded-md bg-muted" aria-label="Loading saved adjustments" /> :
            adjustmentsQuery.isError ? <div className="rounded-md border border-destructive/30 p-4 text-sm" role="alert">Adjustments could not be loaded. <Button variant="outline" size="sm" onClick={() => void adjustmentsQuery.refetch()}>Retry</Button></div> :
            adjustments.length === 0 ? <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No dated adjustments saved.</div> :
            adjustments.map(item => <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="font-medium">{formatScope(item.pujaIds)}</p><p className="mt-1 text-sm text-muted-foreground">{item.fromDate} – {item.toDate} · {item.mode === 'fixed' ? `set price to ${money(item.value)}` : `${item.value > 0 && item.mode === 'amount' ? '+' : ''}${item.value}${item.mode === 'percent' ? '%' : ' ₹'}`}</p></div>
              <Button variant="outline" size="sm" onClick={() => {
                if (window.confirm(`Delete this dated adjustment for ${formatScope(item.pujaIds)}? Future quotes in its date range will return to catalogue pricing. Existing bookings will not change.`)) deleteAdjustmentMutation.mutate(item.id);
              }} disabled={deleteAdjustmentMutation.isPending} aria-label={`Delete dated adjustment for ${formatScope(item.pujaIds)}`}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
            </div>)}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Edit pricing rule' : 'Create pricing rule'}</DialogTitle></DialogHeader>
          <form onSubmit={submitRule} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="rule-name">Rule name</Label><Input id="rule-name" value={draft.name} onChange={event => setDraft(value => ({ ...value, name: event.target.value }))} required maxLength={120} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <MultiPujaSelect pujas={pujas} selectedIds={ruleScope} onChange={pujaIds => { setRuleAllPujas(false); setDraft(value => ({ ...value, pujaIds, pujaId: null })); }} idPrefix="rule-puja" allLabel="All pujas" allSelected={ruleAllPujas} onAllChange={setRuleAllPujas} />
              <div className="space-y-2"><Label htmlFor="rule-window">Booking within (hours)</Label><Input id="rule-window" type="number" min="0.01" max="8760" step="any" value={draft.withinHours} onChange={event => setDraft(value => ({ ...value, withinHours: Number(event.target.value) }))} required /><p className="text-xs text-muted-foreground">Positive hours, up to one year; decimals are supported.</p></div>
              <div className="space-y-2"><Label htmlFor="rule-mode">Price calculation</Label><Select value={draft.mode} onValueChange={(mode: RuleDraft['mode']) => setDraft(value => ({ ...value, mode }))}><SelectTrigger id="rule-mode"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percent">Percent change</SelectItem><SelectItem value="amount">Amount change</SelectItem><SelectItem value="fixed">Fixed final puja price</SelectItem></SelectContent></Select></div>
              {draft.mode !== 'fixed' && <div className="space-y-2"><Label htmlFor="rule-direction">Direction</Label><Select value={ruleDirection} onValueChange={(direction: 'increase' | 'decrease') => setRuleDirection(direction)}><SelectTrigger id="rule-direction"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="increase">Increase</SelectItem><SelectItem value="decrease">Decrease</SelectItem></SelectContent></Select></div>}
              <div className="space-y-2"><Label htmlFor="rule-value">{draft.mode === 'fixed' ? 'Final price (whole rupees)' : draft.mode === 'percent' ? 'Percent magnitude' : 'Amount magnitude (₹)'}</Label><Input id="rule-value" type="number" min={draft.mode === 'percent' ? 0.01 : 1} step={draft.mode === 'percent' ? 'any' : 1} value={Math.abs(draft.value)} onChange={event => setDraft(value => ({ ...value, value: Number(event.target.value) }))} required /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="rule-message">Customer explanation</Label><Textarea id="rule-message" value={draft.customerMessage} onChange={event => setDraft(value => ({ ...value, customerMessage: event.target.value }))} rows={3} maxLength={300} placeholder="Explain the price adjustment to customers" /></div>
            <div className="flex items-center justify-between rounded-md border p-3"><Label htmlFor="rule-enabled">Enable this rule</Label><Switch id="rule-enabled" checked={draft.enabled} onCheckedChange={enabled => setDraft(value => ({ ...value, enabled }))} /></div>
            <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">{preview(draft)}. Closest enabled window wins; rules do not stack.</p>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={saveMutation.isPending || pujasQuery.isLoading || (!ruleAllPujas && !ruleScope.length) || (draft.mode !== 'percent' && (!Number.isInteger(Math.abs(draft.value)) || Math.abs(draft.value) < 1)) || (draft.mode === 'percent' && Math.abs(draft.value) <= 0)}>{saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editing ? 'Save changes' : 'Create rule'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
