import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type RecoveryAccount = {
  password: string;
  confirmPassword: string;
  mobile: string;
};

const initialAccount: RecoveryAccount = { password: '', confirmPassword: '', mobile: '' };

export default function AdminRecovery() {
  const [token, setToken] = useState('');
  const [accounts, setAccounts] = useState({ ojus: { ...initialAccount }, vaidik: { ...initialAccount } });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const completed = message.length > 0;

  function updateAccount(key: 'ojus' | 'vaidik', field: keyof RecoveryAccount, value: string) {
    setAccounts(current => ({ ...current, [key]: { ...current[key], [field]: value } }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (accounts.ojus.password.length < 12 || accounts.vaidik.password.length < 12) {
      setError('Use a fresh password of at least 12 characters for each account.');
      return;
    }
    if (accounts.ojus.password !== accounts.ojus.confirmPassword ||
        accounts.vaidik.password !== accounts.vaidik.confirmPassword) {
      setError('Each password and confirmation must match.');
      return;
    }
    if (accounts.ojus.password === accounts.vaidik.password) {
      setError('Choose different passwords for the two accounts.');
      return;
    }
    if (!token) {
      setError('Enter the one-time recovery key from your secure setup.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/owner-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-recovery-token': token,
        },
        credentials: 'omit',
        cache: 'no-store',
        body: JSON.stringify({
          ojus: { password: accounts.ojus.password, mobile: accounts.ojus.mobile },
          vaidik: { password: accounts.vaidik.password, mobile: accounts.vaidik.mobile },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Recovery could not be completed.');
      setToken('');
      setAccounts({ ojus: { ...initialAccount }, vaidik: { ...initialAccount } });
      setMessage(result.message || 'Owner recovery completed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Recovery could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-10">
      <Helmet>
        <title>Admin Account Recovery | Vaidik Dhara</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Owner admin recovery</h1>
          <p className="mt-2 text-sm text-neutral-600">
            One-time setup for the two Vaidik Dhara owner accounts.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{completed ? 'Recovery completed' : 'Verify and secure both accounts'}</CardTitle>
            <CardDescription>
              {completed
                ? 'Both accounts have been granted Super Admin access.'
                : 'Use a new password for each account. Passwords previously shared in chat must not be reused.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {completed ? (
              <div className="space-y-4">
                <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  {message}
                </p>
                <p className="text-sm text-neutral-700">
                  Remove <strong>ADMIN_RECOVERY_TOKEN</strong> from Replit Secrets now, then sign in at the admin portal
                  with the new passwords you just set.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="recovery-token">One-time recovery key</Label>
                  <Input
                    id="recovery-token"
                    type="password"
                    autoComplete="off"
                    value={token}
                    onChange={event => setToken(event.target.value)}
                    required
                  />
                  <p className="text-xs text-neutral-500">
                    This is the secret you add through Replit Secrets. It is not your account password.
                  </p>
                </div>

                {([
                  ['ojus', 'Ojus Kulkarni', 'kulkarni.ojus1991@gmail.com'],
                  ['vaidik', 'Vaidik Dhara Super Admin', 'vaidikdharasuperadmin@vaidikdhara.com'],
                ] as const).map(([key, title, email]) => (
                  <section key={key} className="space-y-4 rounded-lg border p-4">
                    <div>
                      <h2 className="font-semibold">{title}</h2>
                      <p className="text-sm text-neutral-600">{email}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`${key}-password`}>New password</Label>
                        <Input
                          id={`${key}-password`}
                          type="password"
                          autoComplete="new-password"
                          minLength={12}
                          maxLength={72}
                          value={accounts[key].password}
                          onChange={event => updateAccount(key, 'password', event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${key}-confirm`}>Confirm new password</Label>
                        <Input
                          id={`${key}-confirm`}
                          type="password"
                          autoComplete="new-password"
                          minLength={12}
                          maxLength={72}
                          value={accounts[key].confirmPassword}
                          onChange={event => updateAccount(key, 'confirmPassword', event.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${key}-mobile`}>Mobile number, if this account is not registered</Label>
                      <Input
                        id={`${key}-mobile`}
                        type="tel"
                        autoComplete="tel"
                        value={accounts[key].mobile}
                        onChange={event => updateAccount(key, 'mobile', event.target.value)}
                        placeholder="Leave blank if the account already exists"
                      />
                    </div>
                  </section>
                ))}

                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Securing accounts…</> : <><KeyRound className="mr-2 h-4 w-4" /> Recover both admin accounts</>}
                </Button>
                <p className="text-xs text-neutral-500">
                  This can succeed only once. It creates or resets only the two listed accounts and marks them as Super Admins.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
