---
name: Preview workflow interruption
description: Distinguishing intermittent development URL 502s from app failures
---

The development URL can return 502 when the workspace workflow unexpectedly becomes not started, even though the published app remains healthy. A page may load initially, then fail after the workflow disappears.

**Why:** During investigation, the preview host returned 200 while the workflow was running and 502 immediately when it became not started. The server printed no application crash before the interruption; an agent shell command also reported a disconnected server. Re-starting the workflow restored 200.

**How to apply:** For a preview-only 502, check current workflow state and local port before changing app code. If the workflow disappears without a crash log while the workspace is active, treat it as a workspace/runtime interruption rather than attributing it to a browser component. A published app runs separately.