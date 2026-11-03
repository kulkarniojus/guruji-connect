import { useState, type FormEvent } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const emptyForm = { firstName: '', lastName: '', email: '', mobile: '', password: '' };

export default function RegisterSalesRepTab() {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest('POST', '/api/admin/register-sales-rep', form);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Sales user created', description: 'The new account can now sign in as a sales user.' });
    } catch (error) {
      toast({
        title: 'Could not create sales user',
        description: error instanceof Error ? error.message : 'Please check the details and try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof typeof emptyForm, value: string) => setForm(current => ({ ...current, [key]: value }));

  return (
    <Card>
      <CardHeader><CardTitle>Create a sales user</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sales-first-name">First name</Label>
            <Input id="sales-first-name" required maxLength={80} value={form.firstName} onChange={event => update('firstName', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sales-last-name">Last name</Label>
            <Input id="sales-last-name" required maxLength={80} value={form.lastName} onChange={event => update('lastName', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sales-email">Email</Label>
            <Input id="sales-email" type="email" required value={form.email} onChange={event => update('email', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sales-mobile">Mobile number</Label>
            <Input id="sales-mobile" type="tel" required minLength={8} maxLength={20} value={form.mobile} onChange={event => update('mobile', event.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sales-password">Initial password</Label>
            <Input id="sales-password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={form.password} onChange={event => update('password', event.target.value)} />
            <p className="text-xs text-muted-foreground">Use a unique password of at least 10 characters.</p>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create sales user'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
