---
name: Browser testing fallback
description: The runtime may reject the testing subagent kind even when the testing skill advertises it.
---

The testing subagent callback rejected `$kind: "testing"` with `Unknown config kind: testing` in this environment.

**Why:** The installed testing skill and callback runtime did not agree about supported subagent kinds.

**How to apply:** If the runtime returns that error, do not keep retrying that kind. Verify through the project's Chromium/CDP browser helper with temporary accounts and cleanup instead. This is an observed runtime limitation, not a permanent claim about platform support.