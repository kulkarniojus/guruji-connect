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

Keep pricing controls directly discoverable from Admin → Pujas, not below the full catalogue inside a nested scrolling panel.

**Why:** The user could not find the initial implementation when controls were placed below the puja list.

**How to apply:** Retain visible pricing navigation when adding or reorganizing admin controls.

Temporary regular-rate adjustments use inclusive From/To dates against the scheduled puja date, and can cover multiple selected pujas. They do not overwrite catalogue prices. Apply the single matching date adjustment first, then the winning short-notice rule to that effective regular rate.

**Why:** The user requested date-limited rates with deletion, while separately confirming that urgency depends on the selected puja timing. Keeping catalogue prices intact makes expiration/deletion restore the baseline without changing agreed bookings.

**How to apply:** Reject overlapping regular-rate ranges for the same puja. Deleting a dated adjustment removes only that adjustment from future quotes; enabled urgency rules still apply.

The configured hours are examples, not hardcoded tiers. A time-window increase must disappear when the customer selects a scheduled start beyond that window.

**Why:** The user repeated that a 24-hour rule applies only when the selected puja timing is within 24 hours, and that 24 hours is just an example.

**How to apply:** Requote when either date or time changes, and allow future times today rather than disabling the entire current day.

Display baseline plus surcharge/discount components plus samagri as the total. Do not present the final adjusted puja rate as an additional charge alongside the baseline.

**Why:** The user found the previous breakdown misleading: the final adjusted puja rate already contained the regular price, so its rows did not appear to add up.

**How to apply:** Use additive components consistently in live quotes and saved booking details.

Pricing additions must preserve the existing booking flow, especially the Select Guruji step with both specific selection and automated nearby search.

**Why:** The user explicitly instructed: “do not change existing implementation only this new pricing structure should be applied” and asked that both Guruji selection options work as earlier.

**How to apply:** Do not add price-availability gates to navigation into Guruji selection or booking review. Keep financial validation and renewed price confirmation at final review/submission, without replacing selection, matching, authentication, or genuine acceptance behavior.
