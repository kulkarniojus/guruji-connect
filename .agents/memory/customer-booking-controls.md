---
name: Customer booking controls
description: User-approved temporary samagri restriction and customer address, name and rating requirements.
---

Samagri is temporarily read-only in customer booking only; admins must still be able to edit it.

**Why:** The user explicitly chose “Customer booking only” and said the restriction is temporary.

**How to apply:** Disable customer samagri selection without locking admin samagri editing or modifying already-agreed bookings. Restore customer editing only when the user requests it.

Customer booking uses Google Places for actual address selection; accept a manual full address when the exact address cannot be found or the provider is unavailable. Physical bookings require a valid pincode.

**Why:** The user chose Google Places and requested “if the actual address is not available then only take it in text” and mandatory customer pincode.

**How to apply:** Preserve the existing Date & Location step and genuine specific/nearby Guruji selection. Keep Google credentials server-side and do not log address search responses.

Customer-facing Guruji names show only the first name, without Pandit or surname, alongside genuine ratings (or an explicit unrated state).

**Why:** The user explicitly requested first-name-only Guruji display and visible Guruji ratings.

**How to apply:** Apply to booking selection and customer booking summaries; do not fabricate ratings or remove full names from admin workflows.

Booking bug fixes must preserve the existing selection, address/pincode, specific-or-nearby Guruji, and authentication flows except for the explicitly requested change. Keep Step 1 Continue accessible while browsing long puja lists, and open Step 2 at the page top.

**Why:** The user repeatedly requested bug-only changes without changing existing booking functionality, and specifically requested accessible Continue navigation and Step 2 starting at the top.

**How to apply:** Scope navigation/layout fixes to the affected booking step; keep existing validation and data selections intact and avoid covering the support/chat controls.

Keep Continue's original right-aligned button appearance while keeping it visible during scrolling; do not replace it with a centered full-width bottom action bar.

**Why:** The user rejected that visual change and explicitly requested the original button made sticky instead.

**How to apply:** Preserve the Step 2 scroll-to-top fix and all existing booking behavior when adjusting this control.
