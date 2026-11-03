---
name: Admin role hierarchy
description: Preserve the existing admin role while distinguishing elevated Super Admin access.
---

Represent Super Admin as an elevated flag on an admin account rather than as a new user role. This preserves existing admin checks and routes; Super Admins retain every admin capability while finance, payment configuration, transaction, and refund operations require the elevated flag on both UI and API.

**Why:** A separate role would need careful updates to many legacy admin checks and could silently lose access to existing portal functions.

**How to apply:** Keep ordinary admin access for operations and sales-user creation. Gate privileged finance/refund endpoints in server code, not only by hiding dashboard tabs. Bootstrap the first Super Admin only through an authenticated admin session and promote already registered accounts.
