---
name: Signed-in browser test isolation
description: Why independent role-based test suites must have isolated browser debugging endpoints
---

Independent browser test suites need separate browser processes, profiles, and debugging endpoints—not merely different profile directories.

**Why:** Concurrent customer, Guruji, and admin checks connected to the same debugging endpoint and controlled the same page. Navigation and cookie changes from one suite caused misleading failures in another.

**How to apply:** Use each browser's own discovered debugging endpoint. Never attach an independent suite to the first existing page at a shared fixed endpoint. This matters especially when tests switch signed-in identities.
