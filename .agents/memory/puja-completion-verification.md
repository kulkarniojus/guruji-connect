---
name: Puja completion verification
description: User's chosen OTP scope and required admin control for puja completion
---

Use only a completion OTP. Do not require a second OTP to start the puja.

**Why:** The user said, “2 times otp should not be there..... only complete otp should be ok”.

**How to apply:** When implementing puja verification, keep starting separate from OTP verification. Do not introduce start OTPs without a new user decision.

Admin must be able to track and resend completion OTPs in the app and manually mark a puja complete.

**Why:** The user requested that “admin should have full control”.

**How to apply:** Include admin tracking, resend, and manual completion alongside the participant completion flow. OTP ownership and delivery details remain implementation decisions, not confirmed requirements.