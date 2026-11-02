---
name: Production browser verification
description: Why successful builds and working development previews do not establish production runtime safety in this mixed-React workspace.
---

Verify the actual production frontend bundle in a browser before declaring a publishing-related frontend fix complete.

**Why:** The development preview worked and the production build succeeded, but separate peer-resolved copies of a shared query context crashed the published app before rendering. This workspace has consumers using different React major versions, which can make context-library duplication visible only in the production bundle.

**How to apply:** Check public entry routes using the built assets and capture uncaught browser exceptions. Keep the distinction between a locally verified production bundle and the currently published revision explicit; a workspace fix does not update the live site until the user republishes.
