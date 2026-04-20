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
  chargeType: 'free',
  chargeValue: '',
  description: '',
  isActive: true,
};

export default function CancellationRulesTab() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: rules = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/cancellation-rules'],
  });

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
    saveMutation.mutate({ ...rule, userType: rule.user_type, hoursThreshold: rule.hours_threshold, chargeType: rule.charge_type, chargeValue: rule.charge_value, isActive: !rule.is_active });
  };

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
      chargeType: rule.charge_type,
      chargeValue: String(rule.charge_value ?? ''),
      description: rule.description || '',
      isActive: rule.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.name || !form.hoursThreshold || !form.chargeType) {
      toast({ title: 'Fill all required fields', variant: 'destructive' });
      return;
    }
    saveMutation.mutate(form);
  };

  const gurujiRules = rules.filter(r => r.user_type === 'guruji');
  const customerRules = rules.filter(r => r.user_type === 'customer');

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
                    </div>
                    <p className="text-sm text-neutral-600 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-neutral-400" />
                      When cancelling &gt;= <strong>{rule.hours_threshold}h</strong> before booking
                    </p>
                    {rule.description && <p className="text-xs text-neutral-500 mt-1">{rule.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
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
          <p>When a cancellation happens, the system checks how many hours remain until the booking. It applies the rule whose <strong>hours threshold</strong> is the closest match (without exceeding). For example, if a guruji cancels with 10 hours left, the "within 12h" rule applies.</p>
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

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editRule ? 'Edit Rule' : 'Add Cancellation Rule'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Applies to *</Label>
                <Select value={form.userType} onValueChange={v => setForm((f: any) => ({ ...f, userType: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guruji">Guruji</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Min hours before booking *</Label>
                <Input
                  type="number" min="0" className="mt-1"
                  value={form.hoursThreshold}
                  onChange={e => setForm((f: any) => ({ ...f, hoursThreshold: e.target.value }))}
                  placeholder="e.g. 12"
                />
                <p className="text-xs text-neutral-400 mt-0.5">Rule applies if cancelled ≥ this many hours before</p>
              </div>
            </div>

            <div>
              <Label>Rule Name *</Label>
              <Input
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
                  <SelectTrigger className="mt-1">
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
                    type="number" min="0" className="mt-1"
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
