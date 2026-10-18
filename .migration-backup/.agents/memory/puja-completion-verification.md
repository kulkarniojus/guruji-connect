---
name: Puja completion verification
description: User's chosen OTP scope and required admin control for puja completion
---

Use only a completion OTP, normally held by the customer and shared with the assigned Guruji after the ceremony. Do not require a second OTP to start the puja.

**Why:** The user said, “2 times otp should not be there..... only complete otp should be ok”, then approved the customer-to-Guruji flow along with admin controls.

**How to apply:** When implementing puja verification, keep starting separate from OTP verification. Do not introduce start OTPs without a new user decision.

Admin must be able to track and resend completion OTPs in the app and manually mark a puja complete with a recorded reason and activity history.

**Why:** The user requested that “admin should have full control”.

**How to apply:** Include admin tracking, resend, and manual completion alongside the participant completion flow.

Manual admin completion must remain distinguishable from customer OTP verification.

**Why:** An administrative override records an operator decision, not confirmation from both participants. Full admin control must not manufacture customer consent.

**How to apply:** Keep the override reason, actor, and time in the audit trail, and label overrides as not OTP-verified.

Admin may now explicitly share a completion OTP with the Guruji as well as the customer.

**Why:** In the booking-privacy request the user answered “both” when asked who may receive an admin-sent completion OTP.

**How to apply:** Preserve private customer-only access by default. Explicit admin sharing grants code access to the assigned Guruji, but subsequent verification must be labelled admin-shared OTP, not independent customer confirmation. A fresh code invalidates the previous sharing grant.