import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { CreditCard, CheckCircle, Loader2 } from 'lucide-react';

interface DummyPaymentFormProps {
  amount: number;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

export default function DummyPaymentForm({ amount, onSuccess, onCancel }: DummyPaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('4242424242424242');
  const [expiryDate, setExpiryDate] = useState('12/25');
  const [cvc, setCvc] = useState('123');
  const [name, setName] = useState('Test User');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      // Simulate API call for payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a random payment ID
      const paymentId = 'pi_' + Math.random().toString(36).substring(2, 15);
      
      setIsSuccess(true);
      
      // Notify success
      toast({
        title: "Payment successful",
        description: `Payment of ₹${amount.toFixed(2)} has been processed successfully`,
      });
      
      // Wait for animation to complete before calling onSuccess
      setTimeout(() => {
        onSuccess(paymentId);
      }, 1000);
      
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          {isSuccess ? 'Payment Successful' : 'Complete Payment'}
        </CardTitle>
        <CardDescription>
          {isSuccess 
            ? 'Your booking has been confirmed'
            : 'Enter your card details to process payment'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Thank You!</h3>
            <p className="text-neutral-600 mb-4">
              Your payment of ₹{amount.toFixed(2)} has been processed successfully.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="border rounded-md p-3 bg-neutral-50 font-medium">
                ₹{amount.toFixed(2)}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Name on Card</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input 
                id="cardNumber" 
                value={cardNumber} 
                onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, '').slice(0, 16))}
                placeholder="4242 4242 4242 4242"
                required
              />
              <p className="text-xs text-neutral-500">For testing, use card number: 4242 4242 4242 4242</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input 
                  id="expiryDate" 
                  value={expiryDate} 
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="MM/YY"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input 
                  id="cvc" 
                  value={cvc} 
                  onChange={(e) => setCvc(e.target.value.slice(0, 3))}
                  placeholder="123"
                  required
                />
              </div>
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {isSuccess ? (
          <Button onClick={() => onSuccess('dummy_payment_id')} className="w-full">
            Continue
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay ₹{amount.toFixed(2)}</>
              )}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
