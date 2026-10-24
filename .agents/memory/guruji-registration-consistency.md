---
name: Guruji registration consistency
description: Sales-assisted registrations must use the same service, city and language choices as regular Guruji registration.
---

Sales-assisted Guruji registration must offer the same selectable puja specializations, service cities and languages as the regular Guruji registration page. Do not maintain a separate set of comma-separated free-text choices for sales.

**Why:** The user explicitly requested that these fields be the same as the actual Guruji registration page.

**How to apply:** Keep both registration paths aligned when changing available choices or selection behavior. Ensure chosen service cities and pujas survive saving, rather than displaying controls whose selections are discarded.

Guruji's personal city is separate from service cities. Save and display the personal city independently; never derive it from the first selected service city.

**Why:** The user reported a Guruji whose personal city was Bangalore and service city was Nagpur, while My Profile incorrectly showed Nagpur.

**How to apply:** Preserve the distinction across direct, self, sales-assisted and admin registration, profile reads, and profile edits. For legacy records, prefer the user's saved personal city when the Guruji profile city was populated from service cities.