---
name: Real accounts and Guruji availability
description: Login, registration data and booking availability scope requested by the user.
---

Remove demo access throughout the application; protected areas must require actual logins. Registration details must survive saving and be shown in the person's profile, including customer, Guruji, sales-created and admin-created accounts.

**Why:** The user explicitly requested real logins everywhere and an end-to-end check of each registration channel because customer profile details were missing.

**How to apply:** Test a fresh login and persisted profile, not just the registration response. Never silently reset existing users' passwords or infer missing historical registration details.

Preserve public puja browsing and the existing booking wizard's authentication at confirmation. Do not move the login gate ahead of date/address or Guruji selection; actual booking submission, personal dashboards and private APIs require a genuine session.

**Why:** The user repeatedly required the old booking flow to remain intact, with pricing only added to it. Real login is not permission to reorder that flow.

Customers must not have an Availability tab. Gurujis manage their own calendar and global/date/time availability. Both specific-Guruji selection and automatic nearby search must exclude unavailable Gurujis for the requested service duration.

**Why:** The user requested that unavailable Gurujis not appear in either booking path, while retaining the existing address/pincode and manual/automatic selection flow.

**How to apply:** Global off cannot be overridden by a time exception. Within global on, explicit time windows override a whole-day setting, but never override confirmed or in-progress bookings. Check the full service interval, including midnight crossings.
