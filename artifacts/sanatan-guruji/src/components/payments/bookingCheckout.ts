import type { CheckoutBooking, CheckoutStartResult, PaymentConfiguration } from '@workspace/api-client-react';
import { apiRequest } from '@/lib/queryClient';
import { openCashfreeCheckout } from './cashfreeCheckout';

const ATTEMPT_KEY='sg-booking-checkout-attempt';
const RETURN_KEY='sg-booking-checkout-return';
export function checkoutReturnPath() {
  const value=sessionStorage.getItem(RETURN_KEY)||'/booking';
  return /^\/booking(?:\?|$)/.test(value)?value:'/booking';
}
export function clearCheckoutAttempt() { sessionStorage.removeItem(ATTEMPT_KEY); }

/** Returns a saved booking, or null while leaving for secure payment checkout. */
export async function submitBooking(booking: CheckoutBooking): Promise<{id:number}|null> {
  const configResponse=await fetch('/api/settings/payment',{credentials:'include',cache:'no-store'});
  if (!configResponse.ok) throw new Error('Payment settings could not be confirmed. Please retry.');
  const config=await configResponse.json() as PaymentConfiguration;
  if (!config.paymentRequired) return (await apiRequest('POST','/api/bookings',booking)).json();
  if (!config.checkoutAvailable) throw new Error('Secure payment checkout is unavailable. No booking was sent.');
  const payload=JSON.stringify(booking);
  let attempt:{payload:string;requestId:string;createdAt:number}|null=null;
  try { attempt=JSON.parse(sessionStorage.getItem(ATTEMPT_KEY)||'null'); } catch { /* Start a new attempt. */ }
  if (!attempt || attempt.payload!==payload || Date.now()-attempt.createdAt>35*60_000) {
    attempt={payload,requestId:crypto.randomUUID(),createdAt:Date.now()};
    sessionStorage.setItem(ATTEMPT_KEY,JSON.stringify(attempt));
  }
  sessionStorage.setItem(RETURN_KEY,window.location.pathname+window.location.search);
  const response=await apiRequest('POST','/api/payments/checkout',{booking,requestId:attempt.requestId});
  const result=await response.json() as CheckoutStartResult;
  if (result.bookingId) { clearCheckoutAttempt(); return {id:result.bookingId}; }
  if (result.sessionId) {
    window.location.assign(`/payment-return?session_id=${encodeURIComponent(result.sessionId)}`);
    return null;
  }
  if (result.paymentSessionId) {
    await openCashfreeCheckout(result.paymentSessionId,result.providerMode||config.providerMode);
    return null;
  }
  if (result.orderId) {
    window.location.assign(`/payment-return?order_id=${encodeURIComponent(result.orderId)}`);
    return null;
  }
  if (!result.checkoutUrl) throw new Error('The payment provider did not return a checkout session.');
  const target=new URL(result.checkoutUrl);
  if (target.protocol!=='https:' || target.hostname!=='checkout.stripe.com')
    throw new Error('The checkout address could not be verified.');
  window.location.assign(target.href);
  return null;
}
