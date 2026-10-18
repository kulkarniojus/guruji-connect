---
name: Customer puja reminders
description: Customers need ongoing puja schedule information until the booking is completed.
---

Keep customers informed about their active pujas with an ongoing on-screen reminder showing the puja, scheduled date, and time until completion. Do not remove a reminder merely because its scheduled date has passed. Cancelled or otherwise closed requests should not remain active reminders.

**Why:** The user requested a continuous customer notification until the puja is marked completed, rather than a temporary message.

**How to apply:** Preserve reminders across customer navigation and reloads. Keep pending requests distinguishable from accepted bookings, and reflect completion or cancellation from actual booking status.

The reminder must be a fixed floating notification, not part of the screen scroll or an in-flow banner.

**Why:** The user explicitly requested that the message should not be part of screen scrolling.

**How to apply:** Keep its viewport position unchanged while the page scrolls, and avoid covering the mobile chat launcher.

Customers may minimize the reminder on web or drag it sideways into a small restorable control on mobile. A full page reload must show the expanded reminder again on both.

**Why:** The user explicitly requested temporary minimize/side-drag controls without removing the ongoing reminders.

**How to apply:** Keep minimization temporary, not saved across reloads. Retain the active puja count and a restore control, and do not obscure existing support/chat controls.