---
name: Booking samagri delivery
description: Required customer checklist, admin resend semantics, and WhatsApp delivery boundaries
---

Customers need the booked puja's required samagri list in the application and on WhatsApp. Admin must configure mandatory and optional categories, optional photos, and resend per booking.

**Why:** The user explicitly requested all of these for booked pujas, without replacing the existing booking flow.

**How to apply:** Keep the checklist independent of the customer booking's existing samagri purchase/selection and pricing. Do not change either while adding checklist or delivery features.

Keep a booking's prepared list stable after booking. An explicit admin resend may refresh that booking to the latest saved puja list.

**Why:** Changing the catalogue silently after a customer has prepared supplies could leave them following a different list. A resend is the explicit point to distribute the revised checklist.

**How to apply:** Clearly explain the latest-list behavior on admin resend and preserve a booking-specific delivery history. Distinguish in-app availability, provider acceptance, and actual delivery; an unconnected WhatsApp provider must never be reported as sent.
