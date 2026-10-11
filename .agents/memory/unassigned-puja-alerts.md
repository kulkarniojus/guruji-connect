---
name: Unassigned puja alerts
description: Admin oversight required for customer auto-search puja requests
---

The user requested that an auto-search puja request alert eligible Gurujis based on location and also alert the admin about all unassigned pujas.

**Why:** The user wants admin oversight of requests waiting for a Guruji, rather than relying only on Guruji notifications.

**How to apply:** Keep the admin's active unassigned-request list visible even when no eligible Guruji matches. Automatic requests and admin resends must stay within service and location eligibility; never broadcast a no-match request to unrelated Gurujis. Clear active alerts after genuine assignment or cancellation, not merely because a request was sent.

Automatic search must not stop at an exact-pincode subset when a service city is selected. Include every eligible Guruji serving that city, while retaining service, approval, blocking, and scheduled availability checks.

**Why:** Exact-pincode early return sent notifications to only one Guruji and silently omitted other available specialists shown by the specific-Guruji selection flow.

**How to apply:** Keep manual and automatic service-city eligibility consistent. A shared pincode alone does not qualify a Guruji in another city. Repairs must add only missing requests, never reopen declines or override support-team decisions.

A Guruji declining a request must notify admins. If no open requests remain, keep the booking open for reassignment and clear a previously selected Guruji so it appears in Unassigned. Preserve other pending requests during partial auto-search declines.

**Why:** The user reported that a rejected puja disappeared from admin oversight because the selected Guruji remained attached and rejection generated no admin notification.

**How to apply:** Handle decline and admin alerts together, repair affected older active requests idempotently, and never reopen confirmed, completed or cancelled bookings.