---
name: Auth query observers
description: Avoid stale signed-out or signed-in screens when changing the authenticated identity.
---

Preserve active query observers on login, registration and logout. Update the authentication query in place with the actual identity or null, and reset other queries rather than deleting their active observers.

**Why:** Clearing the entire React Query cache destroyed the active authentication observer. Setting the same key afterwards created a new query without updating the old observer, leaving protected screens stuck at login despite a valid session.

**How to apply:** Cancel in-flight queries, reset other query data and replace the authentication data without destroying its observer. Verify real browser login/logout and return to the original protected URL, not only a direct login API request. Modal close callbacks must distinguish successful authentication from cancellation.
