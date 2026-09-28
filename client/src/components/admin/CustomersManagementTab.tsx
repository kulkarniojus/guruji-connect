import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Pencil, LockKeyhole, UnlockKeyhole, BellRing, Loader2, Users } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  age: number | null;
  gender: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isBlocked: boolean;
  createdAt: string | null;
  missingFields: string[];
  bookingCount: number;
  completedBookings: number;
  latestBookingAt: string | null;
}

type CustomerForm = Omit<Pick<Customer,
  'firstName' | 'lastName' | 'email' | 'mobile' | 'gender' | 'address' | 'city' | 'state' | 'pincode'
>, 'gender'> & { age: string; gender: string };

const blankForm: CustomerForm = {
  firstName: '', lastName: '', email: '', mobile: '', age: '', gender: '',
  address: '', city: '', state: '', pincode: '',
};

export default function CustomersManagementTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(blankForm);
  const [statusCustomer, setStatusCustomer] = useState<Customer | null>(null);

  const { data: customers = [], isLoading, isError, refetch } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/customers', { credentials: 'include' });
      if (!response.ok) throw new Error('Could not load customers');
      return response.json();
    },
    refetchInterval: 30000,
    refetchOnMount: 'always',
  });

  const refreshCustomers = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editingCustomer) throw new Error('Select a customer first');
      const response = await apiRequest('PUT', `/api/admin/customers/${editingCustomer.id}`, {
        ...form,
        age: Number(form.age),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
      });
      return response.json();
    },
    onSuccess: () => {
      refreshCustomers();
      setEditingCustomer(null);
      toast({ title: 'Customer updated', description: 'The profile changes have been saved.' });
    },
    onError: (error: Error) => toast({
      title: 'Could not save changes',
      description: error.message,
      variant: 'destructive',
    }),
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!statusCustomer) throw new Error('Select a customer first');
      const response = await apiRequest('PUT', `/api/admin/customers/${statusCustomer.id}/status`, {
        isBlocked: !statusCustomer.isBlocked,
      });
      return response.json();
    },
    onSuccess: () => {
      refreshCustomers();
      toast({
        title: statusCustomer?.isBlocked ? 'Customer activated' : 'Customer blocked',
        description: statusCustomer?.isBlocked
          ? 'This customer can sign in again.'
          : 'This customer can no longer sign in.',
      });
      setStatusCustomer(null);
    },
    onError: (error: Error) => toast({
      title: 'Could not update access',
      description: error.message,
      variant: 'destructive',
    }),
  });

  const reminderMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const response = await apiRequest('POST', `/api/admin/customers/${customerId}/remind`, {});
      return response.json();
    },
    onSuccess: (result: { missingFields?: string[] }) => {
      toast({
        title: 'In-app reminder sent',
        description: `Asked the customer to complete: ${(result.missingFields || []).join(', ')}.`,
      });
    },
    onError: (error: Error) => toast({
      title: 'Reminder not sent',
      description: error.message,
      variant: 'destructive',
    }),
  });

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(customer =>
      `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term) ||
      customer.mobile.includes(term) ||
      `${customer.city} ${customer.state}`.toLowerCase().includes(term) ||
      String(customer.id).includes(term),
    );
  }, [customers, search]);

  const blockedCount = customers.filter(customer => customer.isBlocked).length;
  const incompleteCount = customers.filter(customer => customer.missingFields.length > 0).length;

  const startEditing = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      mobile: customer.mobile || '',
      age: customer.age == null ? '' : String(customer.age),
      gender: customer.gender || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Customer Management</h2>
        <p className="text-sm text-muted-foreground">
          View customer contact and profile details, booking activity, and account access.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4">
          <Users className="h-5 w-5 text-primary" />
          <div><p className="text-sm text-muted-foreground">Customers</p><p className="text-xl font-semibold">{customers.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Profiles missing details</p>
          <p className="text-xl font-semibold">{incompleteCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Blocked accounts</p>
          <p className="text-xl font-semibold">{blockedCount}</p>
        </CardContent></Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, email, phone, city, or ID"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : isError ? (
        <Card><CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm text-destructive">Customer records could not be loaded.</p>
          <Button variant="outline" onClick={() => refetch()}>Try again</Button>
        </CardContent></Card>
      ) : filteredCustomers.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          {customers.length ? 'No customers match this search.' : 'No customer accounts found.'}
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table className="min-w-[1080px]">
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map(customer => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                    <p className="text-xs text-muted-foreground">Customer #{customer.id}</p>
                  </TableCell>
                  <TableCell>
                    <p>{customer.email}</p>
                    <p className="text-xs text-muted-foreground">{customer.mobile}</p>
                  </TableCell>
                  <TableCell className="max-w-56">
                    <p className="truncate">{customer.city || 'No city'}{customer.state ? `, ${customer.state}` : ''}</p>
                    <p className="truncate text-xs text-muted-foreground">{customer.address || 'No address'}{customer.pincode ? ` · ${customer.pincode}` : ''}</p>
                  </TableCell>
                  <TableCell>
                    <p>{customer.bookingCount} total</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.completedBookings} completed
                      {customer.latestBookingAt && ` · latest ${new Date(customer.latestBookingAt).toLocaleDateString('en-IN')}`}
                    </p>
                  </TableCell>
                  <TableCell>
                    {customer.missingFields.length ? (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                        Missing {customer.missingFields.length}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">Complete</Badge>
                    )}
                    {customer.missingFields.length > 0 && (
                      <p className="mt-1 max-w-40 text-xs text-muted-foreground">{customer.missingFields.join(', ')}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.isBlocked ? 'destructive' : 'outline'}
                      className={!customer.isBlocked ? 'border-green-300 bg-green-50 text-green-700' : ''}>
                      {customer.isBlocked ? 'Blocked' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEditing(customer)} aria-label={`Edit ${customer.firstName} ${customer.lastName}`}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!customer.missingFields.length || reminderMutation.isPending}
                        onClick={() => reminderMutation.mutate(customer.id)}
                        aria-label={`Send profile reminder to ${customer.firstName}`}
                      >
                        <BellRing className="mr-1.5 h-3.5 w-3.5" /> Remind
                      </Button>
                      <Button size="sm" variant={customer.isBlocked ? 'default' : 'destructive'} onClick={() => setStatusCustomer(customer)}>
                        {customer.isBlocked
                          ? <><UnlockKeyhole className="mr-1.5 h-3.5 w-3.5" /> Activate</>
                          : <><LockKeyhole className="mr-1.5 h-3.5 w-3.5" /> Block</>}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editingCustomer} onOpenChange={open => { if (!open) setEditingCustomer(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit customer profile</DialogTitle>
            <DialogDescription>
              Update contact, demographic, and address details for {editingCustomer?.firstName} {editingCustomer?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={event => { event.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {([
                ['firstName', 'First name', 'text'],
                ['lastName', 'Last name', 'text'],
                ['email', 'Email', 'email'],
                ['mobile', 'Mobile (10 digits)', 'tel'],
                ['age', 'Age', 'number'],
                ['gender', 'Gender (male, female, other)', 'text'],
                ['address', 'Address', 'text'],
                ['city', 'City', 'text'],
                ['state', 'State', 'text'],
                ['pincode', 'Postal code', 'text'],
              ] as const).map(([field, label, type]) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={`customer-${field}`}>{label}</Label>
                  {field === 'gender' ? (
                    <select
                      id="customer-gender"
                      required
                      value={form.gender}
                      onChange={event => setForm(current => ({ ...current, gender: event.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select gender</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <Input
                      id={`customer-${field}`}
                      type={type}
                      min={field === 'age' ? 18 : undefined}
                      max={field === 'age' ? 120 : undefined}
                      maxLength={type === 'text' ? 300 : undefined}
                      required={['firstName', 'lastName', 'email', 'mobile', 'age'].includes(field)}
                      value={form[field]}
                      onChange={event => setForm(current => ({ ...current, [field]: event.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusCustomer} onOpenChange={open => { if (!open) setStatusCustomer(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{statusCustomer?.isBlocked ? 'Activate customer account?' : 'Block customer account?'}</DialogTitle>
            <DialogDescription>
              {statusCustomer?.isBlocked
                ? `${statusCustomer.firstName} ${statusCustomer.lastName} will be able to sign in again.`
                : `${statusCustomer?.firstName} ${statusCustomer?.lastName} will no longer be able to sign in until activated.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusCustomer(null)}>Cancel</Button>
            <Button
              variant={statusCustomer?.isBlocked ? 'default' : 'destructive'}
              onClick={() => statusMutation.mutate()}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {statusCustomer?.isBlocked ? 'Activate account' : 'Block account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}