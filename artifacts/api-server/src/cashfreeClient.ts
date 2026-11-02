import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export type CashfreeMode = 'test' | 'live' | 'unavailable';
const API_VERSION = '2026-01-01';

type CashfreeEnvironment = 'sandbox' | 'production';
type CashfreeCredentials = { appId: string; secret: string; environment: CashfreeEnvironment };

function configuredCredentials(environment: CashfreeEnvironment): CashfreeCredentials | null {
  const appId = environment === 'production'
    ? process.env.CASHFREE_PRODUCTION_APP_ID
    : process.env.CASHFREE_SANDBOX_APP_ID;
  const secret = environment === 'production'
    ? process.env.CASHFREE_PRODUCTION_SECRET_KEY
    : process.env.CASHFREE_SANDBOX_SECRET_KEY;
  if (!appId?.trim() || !secret?.trim()) return null;
  return { appId: appId.trim(), secret: secret.trim(), environment };
}

export function cashfreeLiveModeEnabled() {
  return process.env.CASHFREE_MODE?.trim().toLowerCase() === 'production';
}

export function cashfreeGatewayStatus(): { available: boolean; mode: CashfreeMode } {
  if (cashfreeLiveModeEnabled()) {
    const liveCredentials = configuredCredentials('production');
    return liveCredentials ? { available: true, mode: 'live' } : { available: false, mode: 'unavailable' };
  }
  // Never let sandbox credentials collect bookings in a published deployment.
  if (process.env.NODE_ENV === 'production') return { available: false, mode: 'unavailable' };
  return configuredCredentials('sandbox')
    ? { available: true, mode: 'test' }
    : { available: false, mode: 'unavailable' };
}

function credentialsFor(liveMode: boolean): CashfreeCredentials {
  const credentials = configuredCredentials(liveMode ? 'production' : 'sandbox');
  if (!credentials) throw new Error(`Cashfree ${liveMode ? 'production' : 'sandbox'} credentials are not configured.`);
  return credentials;
}

export async function cashfreeRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  liveMode: boolean,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const credentials = credentialsFor(liveMode);
  const base = credentials.environment === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
    'x-api-version': API_VERSION,
    'x-client-id': credentials.appId,
    'x-client-secret': credentials.secret,
    'x-request-id': randomUUID(),
  };
  if (idempotencyKey) headers['x-idempotency-key'] = idempotencyKey;
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`Cashfree request failed (${response.status}).`);
    Object.assign(error, { status: response.status, cashfreeCode: result?.code });
    throw error;
  }
  return result as T;
}

export function verifyCashfreeWebhookSignature(
  rawBody: Buffer,
  timestamp: string,
  signature: string,
  liveMode: boolean,
): boolean {
  const credentials = configuredCredentials(liveMode ? 'production' : 'sandbox');
  if (!credentials || !Buffer.isBuffer(rawBody) || !timestamp || !signature) return false;
  try {
    const expected = createHmac('sha256', credentials.secret)
      .update(timestamp, 'utf8')
      .update(rawBody)
      .digest();
    const received = Buffer.from(signature, 'base64');
    return received.length === expected.length && timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}

export type CashfreeOrder = {
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: string;
  payment_session_id?: string;
};

export type CashfreePayment = {
  cf_payment_id: string | number;
  order_id: string;
  order_amount: number;
  order_currency: string;
  payment_amount: number;
  payment_currency: string;
  payment_status: string;
};

export type CashfreeRefund = {
  cf_refund_id?: string | number;
  refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_status: string;
  status_description?: string;
};

export async function getCashfreeOrder(orderId: string, liveMode: boolean) {
  return cashfreeRequest<CashfreeOrder>('GET', `/orders/${encodeURIComponent(orderId)}`, liveMode);
}

export async function getCashfreePayments(orderId: string, liveMode: boolean) {
  return cashfreeRequest<CashfreePayment[]>('GET', `/orders/${encodeURIComponent(orderId)}/payments`, liveMode);
}

export async function createCashfreeRefund(
  orderId: string,
  refundId: string,
  amountPaise: number,
  liveMode: boolean,
) {
  return cashfreeRequest<CashfreeRefund>(
    'POST',
    `/orders/${encodeURIComponent(orderId)}/refunds`,
    liveMode,
    {
      refund_id: refundId,
      refund_amount: amountPaise / 100,
      refund_note: 'Vaidik Dhara customer cancellation refund',
      refund_speed: 'STANDARD',
    },
    refundId,
  );
}

export async function getCashfreeRefund(orderId: string, refundId: string, liveMode: boolean) {
  return cashfreeRequest<CashfreeRefund>(
    'GET',
    `/orders/${encodeURIComponent(orderId)}/refunds/${encodeURIComponent(refundId)}`,
    liveMode,
  );
}
