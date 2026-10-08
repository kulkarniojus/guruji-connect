---
name: Puja pricing policy
description: Rule precedence, India-time lead windows, and customer price-consent decisions
---

Short-notice rules do not stack. Apply the smallest matching lead-time window, with a per-puja rule taking precedence over an all-puja rule at the same window.

**Why:** A booking within four hours also matches twelve- and twenty-four-hour windows. Compounding all three would produce a price the admin did not explicitly set for that tier.

**How to apply:** Preserve single-rule precedence when adding further pricing conditions unless the user explicitly requests stacking.

Existing bookings retain the agreed price and explanation. If a fresh quote changes the total before submission, show the new price and require another customer submission rather than silently booking at the higher price.

**Why:** Customers must see why they pay more than the regular price, and changing admin rules should not alter agreements already made.

**How to apply:** Keep pricing explanations tied to the booking's agreed quote, including when rules are later edited, disabled, or deleted. Calculate lead time against the scheduled start in India time.
