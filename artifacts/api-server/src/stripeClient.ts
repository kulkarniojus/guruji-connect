import Stripe from 'stripe';
import { StripeSync } from 'stripe-replit-sync';

// Fetch fresh credentials for each operation; connected keys may rotate.
async function getStripeCredentials(): Promise<{ secretKey: string; webhookSecret?: string }> {
  // The generic API-key connector can proxy requests without exposing a key to
  // stripe-replit-sync. In that case, use the separately configured server secret.
  if (process.env.STRIPE_SECRET_KEY) {
    return { secretKey: process.env.STRIPE_SECRET_KEY, webhookSecret: process.env.STRIPE_WEBHOOK_SECRET };
  }
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL ? `depl ${process.env.WEB_REPL_RENEWAL}` : null;
  if (!hostname || !token) throw new Error('The Stripe connection is unavailable in this environment.');
  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    { headers: { Accept: 'application/json', X_REPLIT_TOKEN: token }, signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) throw new Error(`Stripe connection could not be loaded (${response.status}).`);
  const data = await response.json() as {items?:Array<{settings?:{secret_key?:string;webhook_secret?:string}}>};
  const settings = data.items?.[0]?.settings;
  if (!settings?.secret_key) throw new Error('The Stripe connection does not contain a payment API key.');
  return { secretKey: settings.secret_key, webhookSecret: settings.webhook_secret };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

export async function getStripeSync(signingSecret?: string): Promise<StripeSync> {
  if (!process.env.DATABASE_URL) throw new Error('Persistent database configuration is required for Stripe.');
  const { secretKey, webhookSecret } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: process.env.DATABASE_URL, max: 2, idleTimeoutMillis: 1000 },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: signingSecret ?? webhookSecret ?? '',
  });
}
