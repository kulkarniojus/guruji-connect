---
name: Booking authentication return
description: Required return behavior when customers authenticate during booking
---

The user repeated this requirement: after registration or login from Book Your Service / “Proceed to Payment,” return to the same booking page and step with the selected booking details intact.

**Why:** The user explicitly reported being sent elsewhere after authentication and seeing login remain open despite registration. Authentication must not interrupt the customer's booking.

**How to apply:** Treat registration, existing-account login, and header authentication while on the registration return path as parts of the same booking flow. A successful new customer registration must sign the customer in and resume their booking, not send them to the dashboard or require another login. Preserve the booking URL, service, schedule, location, Guruji choice, and samagri selection. Keep authentication failures on the form without dropping those details.