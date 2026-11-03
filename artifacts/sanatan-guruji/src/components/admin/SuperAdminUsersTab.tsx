import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ManagedUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: string;
  isSuperAdmin?: boolean;
  isBlocked?: boolean;
  createdAt?: string | null;
};

const blankAdmin = { firstName: '', lastName: '', email: '', mobile: '', password: '' };

export default function SuperAdminUsersTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [bootstrapEmail, setBootstrapEmail] = useState('');
  const [promoteEmail, setPromoteEmail] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(blankAdmin);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const bootstrapStatus = useQuery<{ available: boolean }>({
    queryKey: ['/api/admin/super-admin-bootstrap-status'],
    queryFn: async () => (await apiRequest('GET', '/api/admin/super-admin-bootstrap-status')).json(),
    enabled: !isSuperAdmin,
    refetchOnMount: 'always',
  });
  const usersQuery = useQuery<ManagedUser[]>({
    queryKey: ['/api/super-admin/users'],
    queryFn: async () => (await apiRequest('GET', '/api/super-admin/users')).json(),
    enabled: isSuperAdmin,
    refetchOnMount: 'always',
  });

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (usersQuery.data ?? []).filter(user =>
      !term || `${user.firstName} ${user.lastName} ${user.email} ${user.mobile} ${user.role}`.toLowerCase().includes(term)
    );
  }, [usersQuery.data, search]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/admin/super-admin-bootstrap-status'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] }),
    ]);
  };

  const runEmailAction = async (url: string, email: string, successTitle: string) => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const response = await apiRequest('POST', url, { email: email.trim() });
      const result = await response.json();
      toast({ title: successTitle, description: result.message || 'Access updated.' });
      setBootstrapEmail('');
      setPromoteEmail('');
      await refresh();
    } catch (error) {
      toast({
        title: 'Could not update access',
        description: error instanceof Error ? error.message : 'Please verify the account and try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const createAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest('POST', '/api/super-admin/admin-users', form);
      setForm(blankAdmin);
      toast({ title: 'Admin user created', description: 'The new account can sign in to the admin portal.' });
      await refresh();
    } catch (error) {
      toast({
        title: 'Could not create admin user',
        description: error instanceof Error ? error.message : 'Please check the details and try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const toggleAccountStatus = async (account: ManagedUser) => {
    if (!account.isBlocked && !window.confirm(`Block ${account.email} from signing in?`)) return;
    setBusy(true);
    try {
      await apiRequest('PUT', `/api/admin/users/${account.id}/${account.isBlocked ? 'unblock' : 'block'}`, {});
      toast({ title: account.isBlocked ? 'Account activated' : 'Account blocked' });
      await refresh();
    } catch (error) {
      toast({
        title: 'Could not update account',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) setSearch('');
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    if (bootstrapStatus.isLoading) return <p className="text-sm text-muted-foreground">Checking super admin setup…</p>;
    if (!bootstrapStatus.data?.available) {
      return <Card><CardContent className="pt-6 text-sm text-muted-foreground">Initial super admin setup is no longer available. Ask a super admin to manage staff accounts.</CardContent></Card>;
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set up the first super admin</CardTitle>
          <CardDescription>
            The account must already be registered. This one-time step grants it full admin access and payment/refund controls.
            Do not enter a password here; the account keeps the password its owner set during registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event => {
            event.preventDefault();
            if (window.confirm(`Grant the first Super Admin access to ${bootstrapEmail.trim()}?`)) {
              void runEmailAction('/api/admin/bootstrap-super-admin', bootstrapEmail, 'Super admin enabled');
            }
          }}>
            <div className="flex-1 space-y-2">
              <Label htmlFor="bootstrap-super-admin-email">Registered account email</Label>
              <Input id="bootstrap-super-admin-email" type="email" required value={bootstrapEmail} onChange={event => setBootstrapEmail(event.target.value)} />
            </div>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Enable super admin'}</Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  const updateForm = (key: keyof typeof blankAdmin, value: string) => setForm(current => ({ ...current, [key]: value }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create an admin user</CardTitle>
          <CardDescription>Admins can manage the portal and create sales users. Payment settings, refunds, and finance records remain super-admin-only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createAdmin} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="admin-first-name">First name</Label><Input id="admin-first-name" required maxLength={80} value={form.firstName} onChange={event => updateForm('firstName', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="admin-last-name">Last name</Label><Input id="admin-last-name" required maxLength={80} value={form.lastName} onChange={event => updateForm('lastName', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="admin-email">Email</Label><Input id="admin-email" type="email" required value={form.email} onChange={event => updateForm('email', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="admin-mobile">Mobile number</Label><Input id="admin-mobile" type="tel" required minLength={8} maxLength={20} value={form.mobile} onChange={event => updateForm('mobile', event.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="admin-password">Initial password</Label>
              <Input id="admin-password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={form.password} onChange={event => updateForm('password', event.target.value)} />
              <p className="text-xs text-muted-foreground">Enter a unique password directly in this form. It is hashed by the server and never shown in the user list.</p>
            </div>
            <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create admin user'}</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered accounts</CardTitle>
          <CardDescription>Promote an existing account to super admin. Its owner keeps the password they already set.</CardDescription>
          <Input aria-label="Search accounts" placeholder="Search by name, email, mobile, or role" value={search} onChange={event => setSearch(event.target.value)} />
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading accounts…</p> : usersQuery.isError ? (
            <p className="text-sm text-destructive">Could not load accounts. Refresh and try again.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Access</TableHead></TableRow></TableHeader>
                <TableBody>
                  {visibleUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>{`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.isSuperAdmin ? 'Super admin' : user.role}</TableCell>
                      <TableCell><Badge variant={user.isBlocked ? 'destructive' : 'outline'}>{user.isBlocked ? 'Blocked' : 'Active'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!user.isSuperAdmin && !user.isBlocked && (
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => {
                              if (window.confirm(`Grant Super Admin access to ${user.email}?`)) {
                                setPromoteEmail(user.email);
                                void runEmailAction('/api/super-admin/promote-super-admin', user.email, 'Super admin access enabled');
                              }
                            }}>Make super admin</Button>
                          )}
                          {user.isSuperAdmin && <Badge>Super admin</Badge>}
                          <Button
                            size="sm"
                            variant={user.isBlocked ? 'outline' : 'destructive'}
                            disabled={busy || currentUser?.id === user.id}
                            onClick={() => void toggleAccountStatus(user)}
                          >
                            {user.isBlocked ? 'Activate' : 'Block'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!visibleUsers.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No matching accounts.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
