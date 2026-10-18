---
name: Stripe connector compatibility
description: The generic Stripe proxy connection differs from the native Stripe credential template
---

This workspace's Stripe connector successfully proxies API requests through `@replit/connectors-sdk`, but its connection settings do not expose the `secret_key` expected by the native Stripe setup template. Do not reinstall or reauthorize a healthy connection to fix this mismatch.

**Why:** A read-only proxy request succeeded while the native credential-template check failed. The managed `stripe-replit-sync` setup requires a server API key that this generic connector does not expose.

**How to apply:** Use the secure secrets flow for the server Stripe key if implementing the managed sync/webhook setup. Do not print or manually copy credentials, invent a key, or bypass payment verification. Treat proxy connectivity alone as insufficient evidence that checkout is fully configured.
