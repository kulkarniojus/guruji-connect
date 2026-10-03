---
name: Booking payment and acceptance
description: Current payment-skip exception and future verified-checkout requirements
---

On 2026-10-03 the user instructed: “for now skip the payment process.” New booking requests may temporarily be sent without payment. Do not create a paid transaction or describe skipped payment as successful payment. Guruji acceptance, not payment or customer selection, is what confirms a booking.

**Why:** The explicit payment-skip request supersedes the earlier instruction to pause requests without a gateway. It does not authorize pretending payment was collected or that a Guruji accepted.

**How to apply:** Preserve the temporary no-payment mode until the user changes it. Keep selected and auto-matched requests unconfirmed until a Guruji genuinely accepts. Only accepted pujas may start, and only in-progress pujas may complete.

When payments resume, require server-verified gateway payment before creating and notifying a booking request. If checkout is unavailable then, pause paid requests instead of accepting a self-reported UPI checkbox.

**Why:** The old flow treated a checkbox as payment and selection as acceptance; both mislead customers.

**How to apply:** Validate the amount and transaction server-side. Agree on refund or reassignment behavior for Guruji declines before collecting live payments.