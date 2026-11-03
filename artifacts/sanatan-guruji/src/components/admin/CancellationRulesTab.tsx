import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Plus, Edit2, Trash2, Loader2, Clock, IndianRupee, Users, UserCheck } from 'lucide-react';
import CancellationRequests from './CancellationRequests';

const CHARGE_TYPE_LABELS: Record<string, string> = {
  free: 'Free (No Charge)',
  percentage: 'Percentage of Booking Amount',
  fixed: 'Fixed Amount (₹)',
  full: 'Full Booking Amount',
};

const chargeTypeBadge: Record<string, string> = {
  free: 'bg-green-100 text-green-800',
  percentage: 'bg-blue-100 text-blue-800',
  fixed: 'bg-amber-100 text-amber-800',
  full: 'bg-red-100 text-red-800',
};

function ruleChargeLabel(rule: any) {
  if (rule.charge_type === 'free') return 'No charge';
  if (rule.charge_type === 'full') return 'Full amount';
  if (rule.charge_type === 'percentage') return `${rule.charge_value}% of booking`;
  if (rule.charge_type === 'fixed') return `₹${rule.charge_value} fixed`;
  return rule.charge_type;
}

const emptyForm = {
  userType: 'guruji',
  name: '',
  hoursThreshold: '',
  timeBasis: 'within',
  pujaId: null,
  chargeType: 'free',
  chargeValue: '',
  description: '',
  isActive: true,
};

export default function CancellationRulesTab({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: rules = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['/api/admin/cancellation-rules'],
  });
  const {data:pujas=[]}=useQuery<any[]>({queryKey:['/api/pujas']});

  const saveMutation = useMutation({
    mutationFn: (data: any) => editRule
      ? apiRequest('PUT', `/api/admin/cancellation-rules/${editRule.id}`, data)
      : apiRequest('POST', '/api/admin/cancellation-rules', data),
    onSuccess: () => {
      toast({ title: editRule ? 'Rule Updated' : 'Rule Created' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cancellation-rules'] });
      setShowDialog(false);
      setEditRule(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/cancellation-rules/${id}`),
    onSuccess: () => {
      toast({ title: 'Rule Deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cancellation-rules'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleActive = (rule: any) => {
    toggleMutation.mutate({id:rule.id,isActive:!rule.is_active});
  };

  const toggleMutation = useMutation({
    mutationFn: ({id,isActive}: {id:number;isActive:boolean}) =>
      apiRequest('PUT', `/api/admin/cancellation-rules/${id}`, {isActive}),
    onSuccess: () => queryClient.invalidateQueries({queryKey:['/api/admin/cancellation-rules']}),
    onError: (e: Error) => toast({title:'Cannot change rule',description:e.message,variant:'destructive'}),
  });

  const openNew = () => {
    setEditRule(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (rule: any) => {
    setEditRule(rule);
    setForm({
      userType: rule.user_type,
      name: rule.name,
      hoursThreshold: String(rule.hours_threshold),
      timeBasis: rule.time_basis || 'at_least',
      pujaId: rule.puja_id ?? null,
      chargeType: rule.charge_type,
      chargeValue: String(rule.charge_value ?? ''),
      description: rule.description || '',
      isActive: rule.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || form.hoursThreshold === '' || !form.chargeType ||
      !Number.isInteger(Number(form.hoursThreshold)) || Number(form.hoursThreshold) < 0 ||
      (['fixed','percentage'].includes(form.chargeType) && (form.chargeValue === '' ||
        Number(form.chargeValue) < 0 || (form.chargeType === 'percentage' && Number(form.chargeValue) > 100)))) {
      toast({ title: 'Fill all required fields', variant: 'destructive' });
      return;
    }
    saveMutation.mutate(form);
  };

  const gurujiRules = rules.filter(r => r.user_type === 'guruji');
  const customerRules = rules.filter(r => r.user_type === 'customer');
  const conflicts = form.isActive ? rules.filter(r => r.is_active && r.id !== editRule?.id &&
    r.user_type === form.userType && (r.time_basis || 'at_least') === form.timeBasis &&
    Number(r.hours_threshold) === Number(form.hoursThreshold) &&
    (r.puja_id ?? null) === (form.pujaId ?? null)) : [];

  const RuleList = ({ rules: list, label, icon: Icon }: { rules: any[], label: string, icon: any }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {label} Cancellation Rules
        </CardTitle>
        <CardDescription>Rules applied when {label.toLowerCase()}s cancel a booking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4 text-center">No rules defined yet</p>
        ) : (
          list
            .sort((a, b) => b.hours_threshold - a.hours_threshold)
            .map(rule => (
              <div key={rule.id} className={`rounded-lg border p-4 ${rule.is_active ? '' : 'opacity-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{rule.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${chargeTypeBadge[rule.charge_type]}`}>
                        {ruleChargeLabel(rule)}
                      </span>
                      {!rule.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                       <Badge variant="outline">{rule.puja_id ? pujas.find(p=>p.id===rule.puja_id)?.name || `Puja #${rule.puja_id}` : 'All pujas'}</Badge>
                    </div>
                    <p className="text-sm text-neutral-600 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-neutral-400" />
                       {rule.time_basis === 'within' ? 'Within' : 'At least'} <strong>{rule.hours_threshold}h</strong> before the puja
                    </p>
                    {rule.description && <p className="text-xs text-neutral-500 mt-1">{rule.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch aria-label={`Activate ${rule.name}`} checked={rule.is_active} disabled={toggleMutation.isPending} onCheckedChange={() => toggleActive(rule)} />
                    <Button aria-label={`Edit ${rule.name}`} variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                       aria-label={`Delete ${rule.name}`}
                      className="h-8 w-8 text-red-500 hover:bg-red-50"
                      onClick={() => { if (confirm('Delete this rule?')) deleteMutation.mutate(rule.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Cancellation Rules</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Define time-based cancellation charges for gurujis and customers</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Add Rule
        </Button>
      </div>

      {/* How it works */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">How rules work:</p>
          <p>Rules use the selected puja date and time in India time and the saved booking amount. For “within” rules, the smallest matching hourly threshold wins: with 10 hours left, a 12-hour rule wins over a 24-hour rule. Otherwise, the largest matching “at least” threshold applies. Charges never stack.</p>
          <p>Use “at least 0 hours” as an all-time fallback. Existing rules retain their original “at least” meaning until you edit them.</p>
          <p>A matching puja-specific rule takes priority over an all-pujas rule.</p>
          <p>Customers cancel immediately under the configured policy, without admin approval. Any refund owed is paid manually and recorded by admin. Guruji withdrawal never closes a booking: other eligible Gurujis are contacted and admin controls reassignment or final cancellation.</p>
          <p className="font-medium">Payments are disabled. Charges are recorded only—not deducted or refunded.</p>
          <ul className="list-disc list-inside space-y-0.5 mt-1">
            <li><strong>Free</strong> — No charge applied</li>
            <li><strong>Percentage</strong> — % of total booking amount is charged</li>
            <li><strong>Fixed</strong> — A flat ₹ amount is charged</li>
            <li><strong>Full</strong> — Entire booking amount is charged</li>
          </ul>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RuleList rules={gurujiRules} label="Guruji" icon={UserCheck} />
          <RuleList rules={customerRules} label="Customer" icon={Users} />
        </div>
      )}
      {isError && <p role="alert">Unable to load rules. <Button variant="outline" onClick={()=>void refetch()}>Retry</Button></p>}
      {isSuperAdmin && <CancellationRequests />}

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRule ? 'Edit Rule' : 'Add Cancellation Rule'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Applies to *</Label>
                <Select value={form.userType} onValueChange={v => setForm((f: any) => ({ ...f, userType: v }))}>
                  <SelectTrigger aria-label="Cancellation applies to" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guruji">Guruji</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hours before puja *</Label>
                <Input
                  aria-label="Hours before puja" type="number" min="0" step="1" className="mt-1"
                  value={form.hoursThreshold}
                  onChange={e => setForm((f: any) => ({ ...f, hoursThreshold: e.target.value }))}
                  placeholder="e.g. 12"
                />
                <p className="text-xs text-neutral-400 mt-0.5">Hourly threshold only—no date or hour ranges.</p>
              </div>
            </div>

            <div>
              <Label>Timing basis</Label>
              <Select value={form.timeBasis} onValueChange={v => setForm((f:any) => ({...f,timeBasis:v}))}>
                <SelectTrigger aria-label="Timing basis"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="within">Within these hours before the puja</SelectItem>
                  <SelectItem value="at_least">At least these hours before the puja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Applies to puja</Label>
              <Select value={form.pujaId==null ? 'all' : String(form.pujaId)} onValueChange={v=>setForm((f:any)=>({...f,pujaId:v==='all' ? null : Number(v)}))}>
                <SelectTrigger aria-label="Cancellation puja scope"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All pujas</SelectItem>
                  {pujas.map(p=><SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rule Name *</Label>
              <Input
                aria-label="Cancellation rule name"
                className="mt-1"
                value={form.name}
                onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Last-minute cancellation"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Charge Type *</Label>
                <Select value={form.chargeType} onValueChange={v => setForm((f: any) => ({ ...f, chargeType: v }))}>
                  <SelectTrigger aria-label="Cancellation charge type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free (No Charge)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    <SelectItem value="full">Full Booking Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.chargeType === 'percentage' || form.chargeType === 'fixed') && (
                <div>
                  <Label>{form.chargeType === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'} *</Label>
                  <Input
                    aria-label="Cancellation charge value" type="number" min="0" step="0.01" max={form.chargeType === 'percentage' ? 100 : undefined} className="mt-1"
                    value={form.chargeValue}
                    onChange={e => setForm((f: any) => ({ ...f, chargeValue: e.target.value }))}
                    placeholder={form.chargeType === 'percentage' ? 'e.g. 50' : 'e.g. 500'}
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                className="mt-1"
                value={form.description}
                onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                placeholder="Describe when this rule applies..."
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={v => setForm((f: any) => ({ ...f, isActive: v }))}
              />
              <Label>Rule is active</Label>
            </div>
          </div>

          {form.hoursThreshold !== '' && conflicts.length > 0 && (
            <div role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm space-y-2">
              <p>An active rule already uses this role, puja and hourly setting. Edit it instead, or explicitly deactivate it before saving this rule. Existing booking history is retained.</p>
              {conflicts.map(rule=><div key={rule.id} className="flex flex-wrap items-center gap-2">
                <span>{rule.name}</span>
                <Button type="button" size="sm" variant="outline" onClick={()=>openEdit(rule)}>Edit existing rule</Button>
                <Button type="button" size="sm" variant="outline" disabled={toggleMutation.isPending}
                  onClick={()=>toggleMutation.mutate({id:rule.id,isActive:false})}>Deactivate conflicting rule</Button>
              </div>)}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || (form.hoursThreshold !== '' && conflicts.length > 0)}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
