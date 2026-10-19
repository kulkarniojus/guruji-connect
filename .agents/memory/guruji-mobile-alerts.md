---
name: Guruji mobile puja alerts
description: User-selected alert frequency and native release boundaries for Guruji booking requests
---

Send **one sound-and-vibration notification per new puja request**, not repeating reminders or a continuously ringing alarm.

**Why:** The user explicitly selected one notification per new request. Existing booking/acceptance and web behavior must remain unchanged.

**How to apply:** Native notification opt-in is Guruji-only. Request creation remains authoritative for recipient selection, including specific, nearby and reassigned requests. Do not infer acceptance from notification delivery or taps. Respect logout, account switches, permission denial, silent mode and Do Not Disturb. Device delivery requires a configured installed native build and actual phone verification; successful server tests, browser previews and JavaScript exports do not prove phone sound/vibration or background delivery.
