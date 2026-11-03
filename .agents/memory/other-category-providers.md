---
name: Other-category providers
description: Preserve account identity and existing role behavior when adding provider categories beyond Guruji.
---

Other-category provider access must layer onto the user's existing customer or Guruji account. Do not promote customer accounts to the Guruji role; grant provider actions only when the relevant category application is approved and active.

**Why:** Customers may offer an additional service without losing their customer account or existing booking behavior. Role-wide changes can unintentionally affect existing permissions and flows.

**How to apply:** For new booking, availability, profile, or cancellation endpoints, check the approved category application and provider profile where needed, while keeping ordinary customer and Guruji authorization paths unchanged. When filtering provider search by the category's linked puja ID, include the approved active category application; these providers may have no Guruji-puja join or legacy specialization entry.
