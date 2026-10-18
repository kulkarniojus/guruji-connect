import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface PaymentPageProps {
  amount: number;
  pujaName: string;
  onBack: () => void;
  onSuccess: () => Promise<void>;
}

// Temporary no-payment booking review. Never creates or claims a paid transaction.
export default function PaymentPage({ amount, pujaName, onBack, onSuccess }: PaymentPageProps) {
  const [submitting, setSubmitting] = useState(false);

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
        <CardTitle>Send your booking request</CardTitle>
        <CardDescription>Payment is skipped for now. Guruji acceptance is still required.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">{pujaName}</h3>
          <p className="mt-2 text-sm text-muted-foreground">Quoted service amount: ₹{amount.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No payment will be collected or marked as paid. Your request remains awaiting Guruji acceptance;
          selecting a Guruji does not confirm the puja.
        </div>
        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="outline" onClick={onBack} disabled={submitting}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? 'Sending request…' : 'Send Booking Request'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}