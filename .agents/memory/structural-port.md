---
name: Structural port constraints
description: Compatibility boundaries for maintaining the existing portal in a multi-app workspace.
---

Keep the portal's legacy database adapter, environment references, session store, and request layer intact during structural moves. Do not push the shared models into the connected database.

**Why:** The user explicitly requires unchanged web behavior and the connected physical database differs from the shared models. The generic migration helper rewrites validation versions and database imports, which is not safe for this portal.

**How to apply:** Copy legacy source without those automatic conversions. Keep shared browser-safe models separate from database connection code. Do not treat the scaffold database package as the portal's active database, and keep setup scripts free of database pushes.
