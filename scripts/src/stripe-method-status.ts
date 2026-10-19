import { getUncachableStripeClient } from './stripeClient';

// Read-only diagnostics. Never log keys, personal/account identifiers, or
// checkout links; querying eligibility does not enable payment methods.
try {
  const stripe = await getUncachableStripeClient();
  const [balance, account, configurations] = await Promise.all([
    stripe.balance.retrieve(),
    stripe.accounts.retrieve(),
    stripe.paymentMethodConfigurations.list({ limit: 10 }),
  ]);
  console.log(JSON.stringify({
    mode: balance.livemode ? 'live' : 'test',
    accountCountry: account.country,
    chargesEnabled: account.charges_enabled,
    configurations: configurations.data.map(configuration => ({
      active: configuration.active,
      isDefault: configuration.is_default,
      methods: Object.entries(configuration)
        .filter(([, value]) => value && typeof value === 'object' && 'available' in value)
        .map(([method, value]) => {
          const settings = value as { available: boolean; display_preference?: { value?: string } };
          return { method, available: settings.available, preference: settings.display_preference?.value };
        }),
    })),
  }));
} catch {
  console.error('Could not read Stripe account payment-method configuration. No settings were changed.');
  process.exitCode = 1;
}
