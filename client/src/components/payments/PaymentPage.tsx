import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import DummyPaymentForm from './DummyPaymentForm';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';

interface PaymentPageProps {
  bookingId: number;
  amount: number;
  pujaName: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function PaymentPage({ bookingId, amount, pujaName, onBack, onSuccess }: PaymentPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      setIsLoading(true);
      
      // Update the booking with payment details
      await apiRequest('POST', `/api/payments`, {
        bookingId,
        amount,
        paymentId,
        status: 'paid',
      });
      
      toast({
        title: "Booking confirmed",
        description: "Your booking has been confirmed. Thank you!",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast({
        title: "Error confirming booking",
        description: "There was an error confirming your booking. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {showPaymentForm ? (
        <DummyPaymentForm 
          amount={amount} 
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentForm(false)}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>Complete payment to confirm your booking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
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
                  <span className="text-primary">₹{amount.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="rounded-lg border p-4 flex items-center">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Card Payment</h4>
                    <p className="text-sm text-neutral-600">Pay securely with debit or credit card</p>
                  </div>
                  <Button onClick={() => setShowPaymentForm(true)}>Pay Now</Button>
                </div>
              </div>
              
              <div className="text-sm text-neutral-600">
                <p className="mb-2">By proceeding with the payment, you agree to our Terms and Conditions.</p>
                <p>For any assistance, please contact our customer support.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!showPaymentForm && (
        <Button 
          variant="ghost" 
          className="mt-4"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}
    </div>
  );
}
