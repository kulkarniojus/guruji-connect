---
name: Cancellation control policy
description: User requirements for hourly cancellation charges, Guruji withdrawal, and admin authority
---

Guruji can never close a booking. Withdrawing from an accepted booking releases that Guruji and triggers a search for other eligible Gurujis; admin controls reassignment and final cancellation.

**Why:** The user explicitly said “guruji can never close the booking” and that admin should control decisions from Guruji, customer, or direct cancellation.

**How to apply:** Keep withdrawal separate from final booking cancellation. A replacement must genuinely accept. When a customer cancellation request is pending, pause replacement acceptance/search until admin decides; resume matching if admin rejects the request and no Guruji remains assigned.

Cancellation configuration is hourly, not explicit minimum/maximum time ranges, and must allow percentage or fixed amounts for customer and Guruji independently.

**Why:** The user corrected the proposed range-based approach: “keep hourly basis only not in range” with percentage or fixed deductions configurable.

**How to apply:** Preserve single-hour thresholds and clear timing semantics. Changes to existing policies must not silently reverse their original meaning.

A pending customer cancellation uses the charge quoted when the request was submitted, rather than automatically recalculating it when admin eventually reviews it. Any explicit admin override needs a recorded reason.

**Why:** Waiting for support or editing a rule afterward must not silently increase the customer's quoted penalty.

**How to apply:** Retain historical quotes even when rules change or are deleted. Follow the separate payment-and-acceptance policy: recorded charges are not actual deductions while payments are temporarily skipped.
