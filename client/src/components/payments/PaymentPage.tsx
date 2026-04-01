import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CheckCircle, QrCode, Copy, ExternalLink } from 'lucide-react';

interface PaymentPageProps {
  bookingId: number;
  amount: number;
  pujaName: string;
  onBack: () => void;
  onSuccess: () => void;
}

interface PaymentSettings {
  paymentRequired: boolean;
  upiId: string | null;
  upiName: string | null;
  upiQrImageUrl: string | null;
}

export default function PaymentPage({ bookingId, amount, pujaName, onBack, onSuccess }: PaymentPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const { toast } = useToast();

  const { data: paymentSettings, isLoading: settingsLoading } = useQuery<PaymentSettings>({
    queryKey: ['/api/settings/payment'],
    queryFn: async () => {
      const res = await fetch('/api/settings/payment');
      return res.json();
    },
    staleTime: 60000,
  });

  const handleProceed = async () => {
    try {
      setIsLoading(true);
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error processing booking',
        description: 'There was an error processing your booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyUpiId = () => {
    if (paymentSettings?.upiId) {
      navigator.clipboard.writeText(paymentSettings.upiId);
      toast({ title: 'UPI ID copied!', description: paymentSettings.upiId });
    }
  };

  if (settingsLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  const paymentRequired = paymentSettings?.paymentRequired ?? false;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Booking Request Ready
          </CardTitle>
          <CardDescription>Please review your booking details below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Amount summary */}
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-semibold mb-2">{pujaName}</h3>
            <div className="flex justify-between mb-2">
              <span className="text-neutral-600">Service Fee</span>
              <span>₹{amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-neutral-600">Platform Fee</span>
              <span>₹0.00</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t mt-2">
              <span>Total Amount</span>
              <span className="text-violet-700">₹{amount.toFixed(2)}</span>
            </div>
          </div>

          {paymentRequired ? (
            /* ── Payment required: show UPI/QR ── */
            <div className="space-y-4">
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-5">
                <h3 className="font-semibold text-violet-900 mb-1 flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Pay via UPI to confirm your booking
                </h3>
                <p className="text-sm text-violet-700 mb-4">
                  Please complete the payment of <strong>₹{amount.toFixed(2)}</strong> to the UPI address below,
                  then check the box and proceed.
                </p>

                {paymentSettings?.upiQrImageUrl && (
                  <div className="flex justify-center mb-4">
                    <div className="bg-white rounded-xl p-3 border shadow-sm inline-block">
                      <img
                        src={paymentSettings.upiQrImageUrl}
                        alt="UPI QR Code"
                        className="w-48 h-48 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  </div>
                )}

                {paymentSettings?.upiId && (
                  <div className="flex items-center gap-3 bg-white border rounded-lg px-4 py-3">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {paymentSettings.upiName ?? 'UPI ID'}
                      </p>
                      <p className="font-mono font-medium text-sm">{paymentSettings.upiId}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={copyUpiId} className="text-violet-600 hover:text-violet-800">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`upi://pay?pa=${paymentSettings.upiId}&am=${amount}&cu=INR`, '_blank')}
                      className="text-violet-600 hover:text-violet-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {!paymentSettings?.upiId && !paymentSettings?.upiQrImageUrl && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    Payment details not configured yet. Please contact support.
                  </p>
                )}
              </div>

              {/* Confirmation checkbox */}
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-gray-50">
                <Checkbox
                  id="payConfirm"
                  checked={paymentConfirmed}
                  onCheckedChange={(val) => setPaymentConfirmed(!!val)}
                  className="mt-0.5"
                />
                <label htmlFor="payConfirm" className="text-sm cursor-pointer">
                  I have completed the UPI payment of <strong>₹{amount.toFixed(2)}</strong> and understand that my
                  booking will be confirmed once the payment is verified by our team.
                </label>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-900 mb-1">🔔 What happens next?</h4>
                <p className="text-amber-800 text-sm">
                  After your payment is verified, qualified Gurujis in your area will be notified.
                  You'll receive confirmation once a Guruji accepts your request.
                </p>
              </div>
            </div>
          ) : (
            /* ── Payment NOT required ── */
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">📞 Payment Process</h3>
                <div className="space-y-2 text-blue-800 text-sm">
                  <p>✓ Our admin team will contact you within 2-4 hours for payment</p>
                  <p>✓ You can pay via UPI, Bank Transfer, or Cash on Service</p>
                  <p>✓ No advance payment required – secure and flexible</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-900 mb-1">🔔 What happens next?</h4>
                <p className="text-amber-800 text-sm">
                  Once you proceed, qualified Gurujis in your area will be notified.
                  You'll receive confirmation once a Guruji accepts your request.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={handleProceed}
              className="flex-1 bg-violet-600 hover:bg-violet-700"
              disabled={isLoading || (paymentRequired && !paymentConfirmed)}
              data-testid="button-proceed-booking"
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {paymentRequired ? 'I have paid — Confirm Booking' : 'Proceed with Booking Request'}
            </Button>
            <Button variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
