---
name: Booking privacy and admin communications
description: Participant phone privacy, strict pre-start address window, and explicit admin sharing exceptions.
---

Customer and Guruji must not see each other's phone numbers.

**Why:** The user explicitly required, “both guruji and customer should not see each other phone numbers”.

**How to apply:** Enforce this in API responses as well as the interface, including nested booking requests and public Guruji profiles. Preserve each user's own contact editing.

Automatic Guruji access to the customer's exact address is only during the four hours before the scheduled start, not after the start or until completion. Interpret Indian booking calendar dates and wall-clock times in India time.

**Why:** The user selected “Only during the four hours before the scheduled start”.

**How to apply:** Outside that window hide exact address details and address-bearing booking notes. Mask expired cached UI data too; city-level matching information may remain visible.

Admin may explicitly send the exact address at any time, and send address, OTP, notification or message to the customer, Guruji or both. The requested delivery channels are in-app, WhatsApp and email.

**Why:** The user said “admin should b able to send anytime in app,, whatsapp, email” and permitted OTP sharing to “both”.

**How to apply:** Audit releases and sends by booking and recipient. An admin address release is a deliberate exception to the automatic window, bound to its recipient. Sending the OTP to Guruji bypasses independent customer confirmation; disclose and record that distinction.