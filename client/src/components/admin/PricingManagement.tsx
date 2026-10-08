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
import type { PricingRule } from '@/components/pricing/usePricingQuote';
import { adjustedPrice } from '@shared/pujaPricing';

type PujaOption = { id: number; name: string; price?: number | null; basePrice: number };
type RuleDraft = Omit<PricingRule, 'id'>;
const blankDraft: RuleDraft = { pujaId: null, name: '', withinHours: 4, mode: 'percent', value: 0, customerMessage: '', enabled: false };

export default function PricingManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [draft, setDraft] = useState<RuleDraft>(blankDraft);
  const [ruleDirection, setRuleDirection] = useState<'increase' | 'decrease'>('increase');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustPujaId, setAdjustPujaId] = useState('');
  const [adjustMode, setAdjustMode] = useState<'percent' | 'amount' | 'fixed'>('amount');
  const [adjustDirection, setAdjustDirection] = useState<'increase' | 'decrease'>('increase');
  const [adjustValue, setAdjustValue] = useState('');

  const rulesQuery = useQuery<PricingRule[]>({ queryKey: ['/api/admin/pricing/rules'] });
  const pujasQuery = useQuery<PujaOption[]>({ queryKey: ['/api/pujas'] });
  const rules = rulesQuery.data ?? [];
  const pujas = pujasQuery.data ?? [];
  const selectedAdjustPuja = useMemo(() => pujas.find(p => String(p.id) === adjustPujaId), [pujas, adjustPujaId]);

  const refreshRules = () => queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing/rules'] });
  const saveMutation = useMutation({
    mutationFn: async () => {
      const magnitude = Math.abs(Number(draft.value));
      const value = draft.mode === 'fixed' ? magnitude : ruleDirection === 'decrease' ? -magnitude : magnitude;
      const payload = { ...draft, pujaId: draft.pujaId ? Number(draft.pujaId) : null, withinHours: Number(draft.withinHours), value };
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
    mutationFn: async (rule: PricingRule) => apiRequest('PUT', `/api/admin/pricing/rules/${rule.id}`, { ...rule, enabled: !rule.enabled }),
    onSuccess: () => void refreshRules(),
    onError: (error: Error) => toast({ title: 'Could not update rule', description: error.message, variant: 'destructive' }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/admin/pricing/rules/${id}`),
    onSuccess: () => { void refreshRules(); toast({ title: 'Pricing rule deleted' }); },
    onError: (error: Error) => toast({ title: 'Could not delete rule', description: error.message, variant: 'destructive' }),
  });
  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAdjustPuja) throw new Error('Choose a puja first.');
      const magnitude = Number(adjustValue);
      if (!Number.isFinite(magnitude) || magnitude < (adjustMode === 'percent' ? 0.01 : 1) ||
        (adjustMode !== 'percent' && !Number.isInteger(magnitude))) {
        throw new Error(adjustMode === 'percent' ? 'Enter a positive percent magnitude.' : 'Enter a positive whole-rupee amount.');
      }
      const expectedPrice = Number(selectedAdjustPuja.price ?? selectedAdjustPuja.basePrice);
      const value = adjustMode === 'fixed' ? magnitude : adjustDirection === 'decrease' ? -magnitude : magnitude;
      return apiRequest('POST', `/api/admin/pujas/${selectedAdjustPuja.id}/adjust-price`, { mode: adjustMode, value, expectedPrice });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/pujas'] });
      toast({ title: 'Regular price updated' });
      setAdjustValue('');
    },
    onError: async (error: Error) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/pujas'] });
      toast({ title: error.message.includes('409') ? 'Price changed by another admin' : 'Could not adjust price', description: error.message.includes('409') ? 'The latest price has been refreshed. Review it and try again.' : error.message, variant: 'destructive' });
    },
  });

  const startCreate = () => { setEditing(null); setDraft({ ...blankDraft }); setRuleDirection('increase'); setDialogOpen(true); };
  const startEdit = (rule: PricingRule) => {
    setEditing(rule);
    setRuleDirection(rule.value < 0 ? 'decrease' : 'increase');
    setDraft({ pujaId: rule.pujaId, name: rule.name, withinHours: rule.withinHours, mode: rule.mode, value: rule.value, customerMessage: rule.customerMessage, enabled: rule.enabled });
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
    const scope = pujas.find(p => p.id === rule.pujaId);
    const price = scope ? Number(scope.price ?? scope.basePrice) : Number(pujas[0]?.price ?? pujas[0]?.basePrice ?? 0);
    const magnitude = Math.abs(Number(rule.value));
    const signedValue = rule.mode === 'fixed' ? magnitude : ruleDirection === 'decrease' ? -magnitude : magnitude;
    try {
      const result = adjustedPrice(price, rule.mode, signedValue);
      return `Example ${scope ? `for ${scope.name}` : `from ${pujas[0]?.name ?? 'a puja'}`}: ₹${price.toLocaleString('en-IN')} → ₹${result.toLocaleString('en-IN')} (rounded to whole rupees)`;
    } catch {
      return 'This rule produces an invalid price. Review the value before saving';
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border-primary/15">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" /> Pricing rules</CardTitle><CardDescription className="mt-1">One matching rule applies: the closest booking window wins; a puja-specific rule wins ties. Existing prices stay unchanged unless you adjust them below.</CardDescription></div>
          <Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" /> Add rule</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {rulesQuery.isLoading ? <div className="space-y-3" aria-label="Loading pricing rules"><div className="h-14 animate-pulse rounded-md bg-muted" /><div className="h-14 animate-pulse rounded-md bg-muted" /></div> :
            rulesQuery.isError ? <div className="rounded-md border border-destructive/30 p-4 text-sm" role="alert"><p>Pricing rules could not be loaded.</p><Button className="mt-2" variant="outline" size="sm" onClick={() => void rulesQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button></div> :
            rules.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center"><p className="font-medium">No pricing rules yet</p><p className="mt-1 text-sm text-muted-foreground">Create a rule to price selected booking windows. No price changes until a rule is enabled.</p></div> :
            rules.map(rule => <div key={rule.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{rule.name}</p><Badge variant={rule.enabled ? 'default' : 'secondary'}>{rule.enabled ? 'Enabled' : 'Off'}</Badge></div>
                <p className="mt-1 text-sm text-muted-foreground">{rule.pujaId == null ? 'All pujas' : pujas.find(p => p.id === rule.pujaId)?.name ?? `Puja #${rule.pujaId}`} · within {rule.withinHours} hours · {rule.mode === 'fixed' ? `fixed at ₹${rule.value}` : `${rule.value > 0 && rule.mode === 'amount' ? '+' : ''}${rule.value}${rule.mode === 'percent' ? '%' : ' ₹'}`}</p>
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
        <CardHeader><CardTitle>Adjust a regular price</CardTitle><CardDescription>Applies immediately to this puja’s saved regular price. The expected-price check prevents overwriting a concurrent update.</CardDescription></CardHeader>
        <CardContent>
          {pujasQuery.isError ? <p role="alert" className="text-sm text-destructive">Pujas could not be loaded. Retry in a moment.</p> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2"><Label htmlFor="price-puja">Puja</Label><Select value={adjustPujaId} onValueChange={setAdjustPujaId}><SelectTrigger id="price-puja"><SelectValue placeholder="Choose a puja" /></SelectTrigger><SelectContent>{pujas.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="adjust-mode">Adjustment type</Label><Select value={adjustMode} onValueChange={(v: 'percent' | 'amount' | 'fixed') => setAdjustMode(v)}><SelectTrigger id="adjust-mode"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="amount">Amount change (₹)</SelectItem><SelectItem value="percent">Percent change</SelectItem><SelectItem value="fixed">Set final price</SelectItem></SelectContent></Select></div>
              {adjustMode !== 'fixed' && <div className="space-y-2"><Label htmlFor="adjust-direction">Direction</Label><Select value={adjustDirection} onValueChange={(v: 'increase' | 'decrease') => setAdjustDirection(v)}><SelectTrigger id="adjust-direction"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="increase">Increase</SelectItem><SelectItem value="decrease">Decrease</SelectItem></SelectContent></Select></div>}
              <div className="space-y-2"><Label htmlFor="adjust-value">{adjustMode === 'fixed' ? 'Final price (whole rupees)' : adjustMode === 'percent' ? 'Percent magnitude' : 'Amount magnitude (₹)'}</Label><Input id="adjust-value" type="number" min={adjustMode === 'percent' ? 0.01 : 1} step={adjustMode === 'percent' ? 'any' : 1} value={adjustValue} onChange={e => setAdjustValue(e.target.value)} placeholder={adjustMode === 'percent' ? 'e.g. 12.5' : 'e.g. 250'} /></div>
              <div className="flex flex-col justify-end gap-2"><p className="text-xs text-muted-foreground">Current regular price: {selectedAdjustPuja ? `₹${Number(selectedAdjustPuja.price ?? selectedAdjustPuja.basePrice).toLocaleString('en-IN')}` : 'Select a puja'}</p><Button disabled={!selectedAdjustPuja || !adjustValue.trim() || !Number.isFinite(Number(adjustValue)) || Number(adjustValue) < (adjustMode === 'percent' ? 0.01 : 1) || (adjustMode !== 'percent' && !Number.isInteger(Number(adjustValue))) || adjustMutation.isPending} onClick={() => adjustMutation.mutate()}>{adjustMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Apply price change</Button></div>
            </div>
          )}
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Rule creation and editing never modifies a puja’s stored regular price.</p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Edit pricing rule' : 'Create pricing rule'}</DialogTitle></DialogHeader>
          <form onSubmit={submitRule} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="rule-name">Rule name</Label><Input id="rule-name" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} required maxLength={120} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="rule-scope">Applies to</Label><Select value={draft.pujaId == null ? 'all' : String(draft.pujaId)} onValueChange={v => setDraft(d => ({ ...d, pujaId: v === 'all' ? null : Number(v) }))}><SelectTrigger id="rule-scope"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All pujas</SelectItem>{pujas.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="rule-window">Booking within (hours)</Label><Input id="rule-window" type="number" min="0.01" max="8760" step="any" value={draft.withinHours} onChange={e => setDraft(d => ({ ...d, withinHours: Number(e.target.value) }))} required /><p className="text-xs text-muted-foreground">Positive hours, up to one year; decimals are supported.</p></div>
              <div className="space-y-2"><Label htmlFor="rule-mode">Price calculation</Label><Select value={draft.mode} onValueChange={(v: RuleDraft['mode']) => setDraft(d => ({ ...d, mode: v }))}><SelectTrigger id="rule-mode"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percent">Percent change</SelectItem><SelectItem value="amount">Amount change</SelectItem><SelectItem value="fixed">Fixed final puja price</SelectItem></SelectContent></Select></div>
              {draft.mode !== 'fixed' && <div className="space-y-2"><Label htmlFor="rule-direction">Direction</Label><Select value={ruleDirection} onValueChange={(v: 'increase' | 'decrease') => setRuleDirection(v)}><SelectTrigger id="rule-direction"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="increase">Increase</SelectItem><SelectItem value="decrease">Decrease</SelectItem></SelectContent></Select></div>}
              <div className="space-y-2"><Label htmlFor="rule-value">{draft.mode === 'fixed' ? 'Final price (whole rupees)' : draft.mode === 'percent' ? 'Percent magnitude' : 'Amount magnitude (₹)'}</Label><Input id="rule-value" type="number" min={draft.mode === 'percent' ? 0.01 : 1} step={draft.mode === 'percent' ? 'any' : 1} value={Math.abs(draft.value)} onChange={e => setDraft(d => ({ ...d, value: Number(e.target.value) }))} required /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="rule-message">Customer explanation</Label><Textarea id="rule-message" value={draft.customerMessage} onChange={e => setDraft(d => ({ ...d, customerMessage: e.target.value }))} rows={3} maxLength={300} placeholder="Explain the price adjustment to customers" /></div>
            <div className="flex items-center justify-between rounded-md border p-3"><Label htmlFor="rule-enabled">Enable this rule</Label><Switch id="rule-enabled" checked={draft.enabled} onCheckedChange={enabled => setDraft(d => ({ ...d, enabled }))} /></div>
            <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">{preview(draft)}. Closest enabled window wins; puja-specific scope wins a tie. Rules do not stack.</p>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={saveMutation.isPending || pujasQuery.isLoading || (draft.mode !== 'percent' && (!Number.isInteger(Math.abs(draft.value)) || Math.abs(draft.value) < 1)) || (draft.mode === 'percent' && Math.abs(draft.value) <= 0)}>{saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editing ? 'Save changes' : 'Create rule'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
