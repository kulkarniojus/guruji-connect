---
name: Booking payment and acceptance
description: Product rule separating verified checkout from Guruji acceptance
---

Booking requests should only be sent after server-verified gateway payment; Guruji acceptance, not payment or customer selection, is what confirms the booking. If no verified gateway is connected, pause new booking requests rather than relying on a self-reported UPI payment checkbox.

**Why:** The old review screen could mark a payment complete based on a checkbox, and selecting a Guruji immediately marked bookings confirmed before they accepted. Either shortcut misleads customers.

**How to apply:** Any future payment integration must validate amount and transaction server-side before creating and notifying a booking request. Do not enable booking creation solely by turning on a frontend setting. Decide a refund or reassignment policy for successful payments when a Guruji declines before collecting live payments.