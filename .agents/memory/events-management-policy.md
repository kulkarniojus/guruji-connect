---
name: Events management policy
description: Per-event payment choice, independence from puja finances, and private child registration
---

Admin must be able to enable online payment, manual payment, or both separately for each religious or educational event under Services.

**Why:** The user explicitly said “both should be allowed based on admin configure base don events.”

**How to apply:** Event fees and payment methods must not depend on the existing puja payment toggle or advance percentage. Do not change puja booking, commission, or refund flows when extending Events.

Published events are visible only to signed-in customer accounts whose registered city and state match the event's configured city and state. Admins can manage all events; guests and customers from other cities cannot list, open, or register.

**Why:** The user's latest city-targeting requirement supersedes the earlier request for public event browsing.

**How to apply:** Collect customer city from the active city directory, require admin to select an active city for each event, and enforce city matching on list, detail, and registration endpoints. Keep registration capacity and deadline checks unchanged.

Keep child registration details restricted to the owning guardian and admin. Online joining details belong only to admin and confirmed, fully paid or free registrations.

**Why:** Children’s names and ages are not a public participant directory; publishing an event must not publish its enrolment data or paid joining link.

**How to apply:** Use explicit public and private response projections. Preserve agreed enrolment fees and session/attendance history when an admin changes prices or reschedules.

Keep event notifications and payment claims accurate: current event notices are in-app; manual payments/refunds are records, not automatic transfers; Stripe test transactions are not real collections.

**Why:** Other delivery channels are not connected, and the connected gateway was in test mode when this feature was verified.

**How to apply:** Verify gateway readiness and live/test mode before claiming real payment collection or announcing a delivery channel.

Paid manual registrations remain pending until an admin explicitly confirms the offline payment and registration; verified online payment confirms automatically. Keep pending manual registrations included in capacity and visible in the admin event registration/payment list.

**Why:** The user specified that manual payment registrations must not be confirmed until an admin confirms the member, while online confirmation follows completed payment.

**How to apply:** Do not auto-confirm manual registrations when they are submitted or when a ledger entry is recorded. Preserve existing registrations and their historical status when applying this rule to new bookings.

Cancellation does not wait for a refund decision. Paid event registrations create an admin refund request; Stripe-backed payments return to the original source after approval, while staff pay and record manual/offline refunds.

**Why:** The user explicitly requested admin approval for cancellation refunds and chose Stripe source refunds with manual refunds tracked for staff.

**How to apply:** Do not treat an unpaid or test-mode checkout as refundable money. Keep the event cancellation and refund approval as separate decisions, and retain the staff payout reference for manual refunds.
