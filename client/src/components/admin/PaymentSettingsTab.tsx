import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, CreditCard, QrCode, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PaymentSettings {
  paymentRequired: boolean;
  upiId: string | null;
  upiName: string | null;
  upiQrImageUrl: string | null;
}

export default function PaymentSettingsTab() {
  const { toast } = useToast();
  const [form, setForm] = useState<PaymentSettings | null>(null);

  const { data, isLoading } = useQuery<PaymentSettings>({
    queryKey: ['/api/settings/payment'],
    queryFn: async () => {
      const res = await fetch('/api/settings/payment');
      const json = await res.json();
      return json;
    },
    onSuccess: (data) => {
      if (!form) setForm(data);
    },
  } as any);

  if (!form && data && !isLoading) {
    setForm(data);
  }

  const mutation = useMutation({
    mutationFn: async (payload: PaymentSettings) => {
      const res = await apiRequest('PUT', '/api/admin/settings/payment', payload);
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/payment'] });
      toast({ title: 'Payment settings saved', description: 'Changes will apply to all new bookings immediately.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Could not save settings. Please try again.', variant: 'destructive' });
    },
  });

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </div>
    );
  }

  const handleSave = () => mutation.mutate(form);

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-violet-600" />
            Payment Configuration
          </CardTitle>
          <CardDescription>
            Control whether customers must pay before their booking request is sent to a Guruji.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Payment Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50">
            <div>
              <p className="font-medium">Require payment before booking</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {form.paymentRequired
                  ? 'Customers must pay via UPI before the request is sent to the Guruji.'
                  : 'Bookings are sent to Guruji without any advance payment.'}
              </p>
            </div>
            <Switch
              checked={form.paymentRequired}
              onCheckedChange={(val) => setForm(prev => prev ? { ...prev, paymentRequired: val } : prev)}
            />
          </div>

          {/* Status indicator */}
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${form.paymentRequired ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            {form.paymentRequired
              ? <><CheckCircle2 className="h-4 w-4 flex-shrink-0" /> Payment required — customers will see UPI details before confirming</>
              : <><AlertCircle className="h-4 w-4 flex-shrink-0" /> Payment not required — bookings proceed without advance payment</>}
          </div>

          {/* UPI Settings */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <QrCode className="h-4 w-4 text-violet-600" />
              UPI Payment Details
            </h3>
            <p className="text-sm text-muted-foreground">
              These details are shown to customers when payment is required. Configure them even if payment is currently disabled.
            </p>

            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                placeholder="e.g. gurujiconnect@upi"
                value={form.upiId ?? ''}
                onChange={(e) => setForm(prev => prev ? { ...prev, upiId: e.target.value } : prev)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upiName">Account Name (shown to customer)</Label>
              <Input
                id="upiName"
                placeholder="e.g. GurujiConnect Services"
                value={form.upiName ?? ''}
                onChange={(e) => setForm(prev => prev ? { ...prev, upiName: e.target.value } : prev)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upiQr">QR Code Image URL</Label>
              <Input
                id="upiQr"
                placeholder="https://... (link to your UPI QR code image)"
                value={form.upiQrImageUrl ?? ''}
                onChange={(e) => setForm(prev => prev ? { ...prev, upiQrImageUrl: e.target.value } : prev)}
              />
              {form.upiQrImageUrl && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                  <img
                    src={form.upiQrImageUrl}
                    alt="UPI QR Code"
                    className="w-40 h-40 object-contain border rounded-lg p-2 bg-white"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Payment Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
