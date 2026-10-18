---
name: Mobile and web parity
description: User requires separate Android/iOS apps sharing the portal and database without changing existing web behavior
---

Keep the web portal working as is while adding separate Android and iOS apps. They must share the same database, and changes to the web application must also appear in mobile.

**Why:** The user explicitly repeated that only the mobile application should be created, without touching the existing web part, and that web changes should happen in mobile as well.

**How to apply:** Preserve existing web business logic, authentication and booking flows. Prefer a live-portal mobile wrapper over duplicated mobile screens that would drift from web changes. Access the database only through the existing portal/backend, never directly from a shipped mobile client. Explain that published web changes can appear automatically, while native-shell changes may require app updates. Any prerequisite structural migration needs explicit approval and web-parity verification.

The mobile release must not infer its production portal from the workspace's development domain.

**Why:** A mobile wrapper connects to whichever portal origin it loads. Accidentally shipping a preview origin connects real users to development rather than the intended live portal.

**How to apply:** Require an explicitly confirmed HTTPS live origin for release; allow a clearly labelled development fallback only in development. Preserve first-party portal sessions rather than inventing native account storage or copying database credentials into the app. Browser iframe previews and native bundle exports do not prove native-device login, permission or restart behavior.
