---
name: Cancellation control policy
description: User requirements for hourly cancellation charges, Guruji withdrawal, and admin authority
---

Guruji can never close a booking. Withdrawing from an accepted booking releases that Guruji and triggers a search for other eligible Gurujis; admin controls reassignment and support/Guruji-initiated final cancellation. Customers cancel their own eligible bookings immediately under policy, without admin approval.

**Why:** The user said “guruji can never close the booking.” They later explicitly replaced customer approval with direct cancellation; Guruji withdrawal/reassignment rules remain unchanged.

**How to apply:** Keep withdrawal separate from final booking cancellation. A replacement must genuinely accept. Customer cancellation closes the booking and outstanding Guruji requests atomically, rather than creating an approval request. Preserve legacy pending requests and their frozen quotes until explicitly resolved.

Cancellation configuration is hourly, not explicit minimum/maximum time ranges, and must allow percentage or fixed amounts for customer and Guruji independently.

**Why:** The user corrected the proposed range-based approach: “keep hourly basis only not in range” with percentage or fixed deductions configurable.

**How to apply:** Preserve single-hour thresholds and clear timing semantics. Changes to existing policies must not silently reverse their original meaning.

A legacy pending customer cancellation keeps its originally quoted charge when resolved, including when the customer converts it to direct cancellation. Any explicit admin override needs a recorded reason.

**Why:** Waiting for support or editing a rule afterward must not silently increase the customer's quoted penalty.

**How to apply:** Retain historical quotes even when rules change or are deleted. Keep Guruji withdrawal reviews separate from customer cancellation.

Customer refunds are manual: track the refund owed, then admin pays it and records the refund with a reference. Never infer payment from the booking price or a skipped checkout.

**Why:** The user explicitly chose “Track the refund owed; admin pays it and records the refund.”

**How to apply:** Apply the existing cancellation policy to the agreed booking amount, but retain no more than actual recorded customer payments. Show the remaining refundable balance separately from refunds already paid. Preserve booked prices; documented extra charges/credits belong to the customer account rather than silently repricing a booking. No recorded payment means no invented refund or collected cancellation money.
