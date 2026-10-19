---
name: Guruji mobile puja alerts
description: User-selected alert frequency and native release boundaries for Guruji booking requests
---

Send **one sound-and-vibration notification per new puja request**, not repeating reminders or a continuously ringing alarm.

**Why:** The user explicitly selected one notification per new request. Existing booking/acceptance and web behavior must remain unchanged.

**How to apply:** Native notification opt-in is Guruji-only. Request creation remains authoritative for recipient selection, including specific, nearby and reassigned requests. Do not infer acceptance from notification delivery or taps. Respect logout, account switches, permission denial, silent mode and Do Not Disturb. Device delivery requires a configured installed native build and actual phone verification; successful server tests, browser previews and JavaScript exports do not prove phone sound/vibration or background delivery.

Keep installed-build notification dependencies out of the Expo Go startup evaluation path, not merely behind permission checks.

**Why:** Importing the notifications package attempted to load a native module absent from Android Expo Go and prevented the entire portal from opening. A successful Android bundle export did not catch this runtime failure.

**How to apply:** Preserve Expo Go access to the full portal without native push; select installed-only notification code before importing it, and regression-test that Expo Go never evaluates that dependency tree.
