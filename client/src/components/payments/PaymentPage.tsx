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

  // Simulate successful payment and trigger notifications
  const handleProceedWithBooking = async () => {
    try {
      setIsLoading(true);
      
      // Call the success callback to create booking and notify gurujis
      onSuccess();
      
    } catch (error) {
      console.error('Error processing booking:', error);
      toast({
        title: "Error processing booking",
        description: "There was an error processing your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">📞 Payment Process</h3>
            <div className="space-y-2 text-blue-800">
              <p>✓ Our admin team will contact you within 2-4 hours for payment</p>
              <p>✓ You can pay via UPI, Bank Transfer, or Cash on Service</p>
              <p>✓ No advance payment required - secure and flexible</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 mb-2">🔔 What happens next?</h4>
            <p className="text-amber-800 text-sm">
              Once you proceed, qualified Gurujis in your area will be notified. 
              You'll receive confirmation once a Guruji accepts your request.
            </p>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={handleProceedWithBooking}
              className="flex-1"
              data-testid="button-proceed-booking"
            >
              Proceed with Booking Request
            </Button>
            <Button 
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
