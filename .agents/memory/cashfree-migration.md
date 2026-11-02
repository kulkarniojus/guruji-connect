---
name: Cashfree-only payments
description: Cashfree is the only active online payment provider; old Stripe records remain archived
---

Cashfree is the only supported online payment provider in this project. Do not reintroduce Stripe checkout, webhook, SDK, sync, or automatic refund code without an explicit new request. Keep historical Stripe transaction rows for read-only records; route outstanding legacy refunds to the audited manual-refund process.

**Why:** The user explicitly chose to remove all Stripe support after Cashfree was integrated, while retaining existing financial history rather than deleting it.

**How to apply:** New puja/event checkout and automated refunds use Cashfree only. Never retry or reconcile archived Stripe attempts through a provider API. The Replit-level Stripe connector and old secrets must be disconnected/deleted manually in project settings; application source no longer uses them.

Cashfree sandbox must stay development-only; published payments require separately configured production credentials and merchant/domain approval. Connecting credentials must not change the admin's payment-required toggle.

**Why:** The supplied credentials were sandbox credentials, and the portal shares data with real customers and mobile apps. Test transactions must not be mistaken for collected money.

**How to apply:** Keep sandbox finance entries out of actual collections and block sandbox fulfillment in production. Obtain production credentials through the secure secrets flow before switching on live checkout.

Cashfree may return a fresh payment-session token when retrieving an existing order. Use the order id—not token equality—as the retry/idempotency identity.

**Why:** Sandbox verification returned different client tokens for repeated retrievals of the same order.

**How to apply:** Reuse the deterministic order id, accept the refreshed token, and do not log payment-session tokens in assertions.
