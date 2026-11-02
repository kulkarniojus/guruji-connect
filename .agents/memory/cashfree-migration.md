---
name: Cashfree gateway migration
description: Preserve original payment sources and separate sandbox from real customer collections
---

New checkout uses Cashfree, but retain Stripe references and its refund path for historical Stripe payments. Never migrate an original transaction's provider merely because the default checkout gateway changes.

**Why:** Refunds must go through the gateway that collected the payment. The user requested replacement of new checkout, not deletion of old payment history.

**How to apply:** Add provider-aware fields and preserve historical references when extending payments, reports, refunds or reconciliation.

Cashfree sandbox must stay development-only; published payments require separately configured production credentials and merchant/domain approval. Connecting credentials must not change the admin's payment-required toggle.

**Why:** The supplied credentials were sandbox credentials, and the portal shares data with real customers and mobile apps. Test transactions must not be mistaken for collected money.

**How to apply:** Keep sandbox finance entries out of actual collections and block sandbox fulfillment in production. Obtain production credentials through the secure secrets flow before switching on live checkout.

Cashfree may return a fresh payment-session token when retrieving an existing order. Use the order id—not token equality—as the retry/idempotency identity.

**Why:** Sandbox verification returned different client tokens for repeated retrievals of the same order.

**How to apply:** Reuse the deterministic order id, accept the refreshed token, and do not log payment-session tokens in assertions.
