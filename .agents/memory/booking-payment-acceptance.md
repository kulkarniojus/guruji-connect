---
name: Booking payment and acceptance
description: Admin-controlled payment enablement and genuine Guruji acceptance
---

On 2026-10-03 the user instructed: “for now skip the payment process.” New booking requests may temporarily be sent without payment. Do not create a paid transaction or describe skipped payment as successful payment. Guruji acceptance, not payment or customer selection, is what confirms a booking.

**Why:** The explicit payment-skip request supersedes the earlier instruction to pause requests without a gateway. It does not authorize pretending payment was collected or that a Guruji accepted.

**How to apply:** The user subsequently requested complete payments when the admin payment toggle is enabled. Keep the existing no-payment flow when it is off; never enable charges merely because credentials were connected. Keep selected and auto-matched requests unconfirmed until a Guruji genuinely accepts. Only accepted pujas may start, and only in-progress pujas may complete.

When payments resume, require server-verified gateway payment before creating and notifying a booking request. If checkout is unavailable then, pause paid requests instead of accepting a self-reported UPI checkbox.

**Why:** The old flow treated a checkbox as payment and selection as acceptance; both mislead customers.

**How to apply:** Validate the amount and transaction server-side. Preserve the agreed direct-cancellation/manual-refund policy and Guruji reassignment behavior; do not add automatic money transfers or infer acceptance from payment.