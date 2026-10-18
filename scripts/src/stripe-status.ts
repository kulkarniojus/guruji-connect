import { getUncachableStripeClient } from './stripeClient';

// Read-only connection check. Never log credentials or account/customer data.
try {
  const stripe = await getUncachableStripeClient();
  const balance = await stripe.balance.retrieve();
  console.log(JSON.stringify({ connected: true, mode: balance.livemode ? 'live' : 'test' }));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Stripe connection check failed');
  process.exitCode = 1;
}
