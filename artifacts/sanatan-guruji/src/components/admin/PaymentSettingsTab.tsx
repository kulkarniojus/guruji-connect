import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, CreditCard, QrCode, AlertCircle, CheckCircle2 } from 'lucide-react';
import CheckoutHistory from './CheckoutHistory';
import RefundRequestsAdmin from './RefundRequestsAdmin';
import type { PaymentConfiguration } from '@workspace/api-client-react';

type PaymentSettings=PaymentConfiguration;

export default function PaymentSettingsTab() {
  const { toast } = useToast();
  const [form, setForm] = useState<PaymentSettings | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<PaymentSettings>({
    queryKey: ['/api/settings/payment'],
    queryFn: async () => {
      const res = await fetch('/api/settings/payment');
      if (!res.ok) throw new Error('Payment settings could not be loaded');
      const json = await res.json();
      return json;
    },
  });
  useEffect(()=>{if (data) setForm(previous=>previous??data);},[data]);

  const mutation = useMutation({
    mutationFn: async (payload: PaymentSettings) => {
      const res = await apiRequest('PUT', '/api/admin/settings/payment', payload);
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: (saved) => {
      setForm(saved);
      queryClient.invalidateQueries({ queryKey: ['/api/settings/payment'] });
      toast({ title: 'Payment settings saved', description: 'Changes will apply to all new bookings immediately.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    },
  });

  if (isError) return <div role="alert" className="space-y-3"><p>Payment settings could not be loaded.</p><Button variant="outline" onClick={()=>void refetch()}>Retry</Button></div>;
  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </div>
    );
  }

  const handleSave = () => mutation.mutate(form);

  return (
    <div className="space-y-6 max-w-5xl">
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
          {!data?.checkoutAvailable && (
            <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Cashfree is not ready for this environment. Production credentials are required on the published site; sandbox credentials only work in development. When the switch is off, the existing no-payment booking flow continues.
            </div>
          )}

          {/* Payment Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50">
            <div>
              <p className="font-medium">Require payment before booking</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {form.paymentRequired
                  ? 'Customers complete verified Cashfree checkout before the request is sent to the Guruji.'
                  : 'Bookings are sent to Guruji without any advance payment.'}
              </p>
            </div>
            <Switch
              checked={form.paymentRequired}
              disabled={!data?.checkoutAvailable&&!form.paymentRequired}
              onCheckedChange={(val) => setForm(prev => prev ? { ...prev, paymentRequired: val } : prev)}
            />
          </div>

          {/* Status indicator */}
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${form.paymentRequired ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            {form.paymentRequired
              ? <><CheckCircle2 className="h-4 w-4 flex-shrink-0" /> Payment required — Cashfree must verify the advance before sending the booking request</>
              : <><AlertCircle className="h-4 w-4 flex-shrink-0" /> Payment not required — bookings proceed without advance payment</>}
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-medium">Cashfree connection: {data?.checkoutAvailable?'Ready':'Not ready'} · {data?.providerMode?.toUpperCase()}</h3>
            {data?.providerMode==='test' && <p className="text-sm text-amber-800">SANDBOX mode only. No real money is collected and test checkouts do not become actual finance receipts. Production credentials, Cashfree account activation, domain approval and webhook setup are required before accepting real payments.</p>}
            {data?.providerMode==='live' && <p className="text-sm text-green-800">LIVE mode: enabling and saving the switch will require real customer advance payments for new bookings.</p>}
            <div className="space-y-2">
              <Label htmlFor="paymentAdvance">Customer advance (% of final booking total)</Label>
              <Input id="paymentAdvance" type="number" min="1" max="100" step="0.01" value={form.advancePercentage}
                onChange={e=>setForm(previous=>previous?{...previous,advancePercentage:Number(e.target.value)}:previous)} />
              <p className="text-xs text-muted-foreground">Example: ₹3,000 at {form.advancePercentage}% collects ₹{(Math.round(300000*form.advancePercentage/100)/100).toFixed(2)} online; the rest is paid directly to Guruji. This is separate from your commission configuration. Existing booking totals and paid advances never change when settings change.</p>
            </div>
            <p className="text-sm text-muted-foreground">Payment does not mean a Guruji has accepted. Failed/cancelled checkout sends no request. Cancellation deductions use the configured policy and actual collections. Refunds require admin approval and return through the original gateway; existing Stripe transactions remain supported. Manual payouts are paid and recorded by the support team.</p>
          </div>

          {/* UPI Settings */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <QrCode className="h-4 w-4 text-violet-600" />
              UPI Payment Details
            </h3>
            <p className="text-sm text-muted-foreground">
              Your existing manual UPI reference details are retained. They do not enable checkout or prove payment; online booking advances are verified through Cashfree, not a checkbox or QR screenshot.
            </p>

            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                placeholder="e.g. vaidikdhara@upi"
                value={form.upiId ?? ''}
                onChange={(e) => setForm(prev => prev ? { ...prev, upiId: e.target.value } : prev)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upiName">Account Name (shown to customer)</Label>
              <Input
                id="upiName"
                placeholder="e.g. Vaidik Dhara Services"
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
      <CheckoutHistory />
      <RefundRequestsAdmin />
    </div>
  );
}
