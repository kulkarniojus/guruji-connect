---
name: Events management policy
description: Per-event payment choice, independence from puja finances, and private child registration
---

Admin must be able to enable online payment, manual payment, or both separately for each religious or educational event under Services.

**Why:** The user explicitly said “both should be allowed based on admin configure base don events.”

**How to apply:** Event fees and payment methods must not depend on the existing puja payment toggle or advance percentage. Do not change puja booking, commission, or refund flows when extending Events.

Keep child registration details restricted to the owning guardian and admin. Online joining details belong only to admin and confirmed, fully paid or free registrations.

**Why:** Children’s names and ages are not a public participant directory; publishing an event must not publish its enrolment data or paid joining link.

**How to apply:** Use explicit public and private response projections. Preserve agreed enrolment fees and session/attendance history when an admin changes prices or reschedules.

Keep event notifications and payment claims accurate: current event notices are in-app; manual payments/refunds are records, not automatic transfers; Stripe test transactions are not real collections.

**Why:** Other delivery channels are not connected, and the connected gateway was in test mode when this feature was verified.

**How to apply:** Verify gateway readiness and live/test mode before claiming real payment collection or announcing a delivery channel.
