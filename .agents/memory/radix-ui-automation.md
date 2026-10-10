---
name: Radix UI automation
description: Reliable native pointer and keyboard interaction with Radix controls in headless browser tests
---

Radix dropdown triggers should be activated with a browser-native pointer click, not a synthetic DOM `element.click()`.

**Why:** A simulated account-switch test waited indefinitely for the menu after a synthetic click; the same menu opened immediately with a native pointer click. The installed Puppeteer version also lacks the newer locator API.

**How to apply:** In headless interaction tests, locate the trigger element and use Puppeteer's element-handle click before waiting for menu items.

When switching login and registration dialogs, scope field filling to the intended form and wait for select portals to close before submitting.

**Why:** Closing dialogs can briefly retain matching email/password inputs, and select overlays can intercept the next pointer action. Both produced false registration failures while real registration was working.

**How to apply:** Identify the registration form by its distinct fields, verify checkbox state, wait for option portals to disappear, and use native form submission or settled native keyboard/pointer activation.

For admin tabs and buttons whose coordinates can shift while dashboard data loads, browser-native keyboard activation is more reliable than measuring coordinates immediately after the control appears. CDP Enter events must include the carriage-return text to reproduce the browser's normal button activation.

**Why:** Asynchronous dashboard content shifted pointer targets during catalogue checks. Enter keydown alone changed Radix tabs but did not activate ordinary buttons; including the native Enter text produced the expected click.

**How to apply:** Wait for the actual loaded control, focus it, and dispatch Enter with its key code and carriage-return text, followed by keyup. Keep pointer activation for dropdowns where the installed Radix implementation requires it.

Radix Select validates items even when the dropdown is closed. Disabled loading items still need nonempty values.

**Why:** Restoring a booking draft while city data was loading caused the entire booking page to unmount because an empty-valued disabled item threw a runtime error.

**How to apply:** Use a nonempty sentinel for loading items; never use an empty Select.Item as a placeholder. Check restored/loading states, not only screens after data has loaded.

Set explicit desktop and phone viewports when verifying native controls, and use instant scrolling before measuring pointer coordinates.

**Why:** The city dropdown worked on a fresh anonymous page but failed in an authenticated fixture at the default headless viewport; explicit desktop sizing resolved the discrepancy. Existing reminder panels make the authenticated layout different.

**How to apply:** Do not infer a broken dropdown solely from a failed centre-point click. Inspect the hit target and overlays, and verify at intended viewport sizes before changing production controls.