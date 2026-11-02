import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { PaymentConfiguration } from '@workspace/api-client-react';

interface PaymentPageProps {
  amount: number;
  pujaName: string;
  onBack: () => void;
  onSuccess: () => Promise<void>;
}

export default function PaymentPage({ amount, pujaName, onBack, onSuccess }: PaymentPageProps) {
  const [submitting, setSubmitting] = useState(false);
  const settings=useQuery<PaymentConfiguration>({
    queryKey:['/api/settings/payment'],
    queryFn:async()=>{
      const response=await fetch('/api/settings/payment',{credentials:'include',cache:'no-store'});
      if (!response.ok) throw new Error('Payment configuration could not be loaded.');
      return response.json();
    },
    staleTime:0,refetchInterval:15000,
  });
  const required=settings.data?.paymentRequired;
  const advance=Math.round(Math.round(amount*100)*(settings.data?.advancePercentage||0)/100)/100;

  const submit = async () => {
    setSubmitting(true);
    try {
      await onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle>{required?'Pay your booking advance':'Send your booking request'}</CardTitle>
        <CardDescription>{required?'Continue to secure Cashfree checkout. Guruji acceptance is still required.':'No payment is collected now. Guruji acceptance is still required.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">{pujaName}</h3>
          <p className="mt-2 text-sm text-muted-foreground">Quoted service amount: ₹{amount.toFixed(2)}</p>
          {required && <div className="mt-3 space-y-1 text-sm">
            <p className="font-semibold">Advance now ({settings.data?.advancePercentage}%): ₹{advance.toFixed(2)}</p>
            <p>Balance paid directly to Guruji: ₹{(amount-advance).toFixed(2)}</p>
          </div>}
        </div>
        {settings.isError && <p role="alert" className="text-sm text-red-700">Payment settings could not be confirmed. Please reload before continuing.</p>}
        {required && settings.data?.providerMode==='test' && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Cashfree SANDBOX mode: no real money is collected. Test transactions are not recorded as actual finance receipts.</p>}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {required?'Your advance must be verified by Cashfree before the request is sent. Failed or cancelled checkout does not send a request. Refunds owed under your cancellation policy are handled and recorded by the support team.':
            'No payment will be collected or marked as paid.'} Your request remains awaiting Guruji acceptance; selecting or paying does not confirm the puja.
        </div>
        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="outline" onClick={onBack} disabled={submitting}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={submit} disabled={submitting||settings.isLoading||settings.isError||!!(required&&!settings.data?.checkoutAvailable)}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? required?'Opening checkout…':'Sending request…' : required?'Continue to secure payment':'Send Booking Request'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}