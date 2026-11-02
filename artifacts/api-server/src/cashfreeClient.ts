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
  return process.env.NODE_ENV === 'production' &&
    process.env.CASHFREE_MODE?.trim().toLowerCase() === 'production';
}

export function cashfreeGatewayStatus(): { available: boolean; mode: CashfreeMode } {
  if (process.env.CASHFREE_MODE?.trim().toLowerCase() === 'production') {
    if (!cashfreeLiveModeEnabled()) return { available: false, mode: 'unavailable' };
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
  if (liveMode && process.env.NODE_ENV !== 'production')
    throw new Error('Live Cashfree credentials are available only to the published production server.');
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
    Object.assign(error, { status: response.status, cashfreeCode: (result as {code?:string}|null)?.code });
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
  if (liveMode && process.env.NODE_ENV !== 'production') return false;
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
  is_captured?: boolean;
};

export function isVerifiedCashfreePayment(
  order:CashfreeOrder,
  payment:CashfreePayment,
  expectedOrderId:string,
  expectedPaise:number,
) {
  return Number.isSafeInteger(expectedPaise) && expectedPaise>0 &&
    order.order_id===expectedOrderId && order.order_status==='PAID' && order.order_currency==='INR' &&
    Math.round(Number(order.order_amount)*100)===expectedPaise &&
    payment.order_id===expectedOrderId && payment.payment_status==='SUCCESS' &&
    payment.payment_currency==='INR' && payment.order_currency==='INR' &&
    Math.round(Number(payment.order_amount)*100)===expectedPaise &&
    Math.round(Number(payment.payment_amount)*100)===expectedPaise &&
    payment.is_captured!==false && !!payment.cf_payment_id;
}

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

export async function createCashfreeOrder(body: Record<string,unknown> & {order_id:string},liveMode:boolean) {
  try {
    return await cashfreeRequest<CashfreeOrder>('POST','/orders',liveMode,body);
  } catch(error) {
    // The response may be lost after order creation. Reuse the deterministic
    // order id rather than opening a second payment attempt.
    try { return await getCashfreeOrder(body.order_id,liveMode); }
    catch { throw error; }
  }
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
  try { return await cashfreeRequest<CashfreeRefund>(
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
  ); } catch(error) {
    // A timed-out POST may already have created the refund. Never change its id.
    try { return await getCashfreeRefund(orderId,refundId,liveMode); }
    catch { throw error; }
  }
}

export async function getCashfreeRefund(orderId: string, refundId: string, liveMode: boolean) {
  return cashfreeRequest<CashfreeRefund>(
    'GET',
    `/orders/${encodeURIComponent(orderId)}/refunds/${encodeURIComponent(refundId)}`,
    liveMode,
  );
}
