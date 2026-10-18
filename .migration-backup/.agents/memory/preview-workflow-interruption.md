---
name: Preview startup collision
description: Why development Preview intermittently showed 502 despite an apparently running app
---

The development URL can return 502 even when the published app works and a workflow claims to be running. Check for *more than one* dev server process trying to own the same port, not just the workflow state.

**Why:** The app started twice through overlapping workspace startup paths. One process bound the web port while the other logged `EADDRINUSE` but stayed alive because uncaught exceptions were marked non-fatal. Workflow restarts could stop the listening process and leave a non-listening duplicate behind; restarting alone could not reliably resolve it.

**How to apply:** For a preview-only 502, check workflow state, port response, logs, and the number of dev-server processes. Keep a single startup path and ensure port bind failures terminate cleanly. Do not diagnose an account or browser issue from the generic error page alone; production runs separately.