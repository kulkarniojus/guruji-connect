---
name: Radix UI automation
description: Reliable native pointer and keyboard interaction with Radix controls in headless browser tests
---

Radix dropdown triggers should be activated with a browser-native pointer click, not a synthetic DOM `element.click()`.

**Why:** A simulated account-switch test waited indefinitely for the menu after a synthetic click; the same menu opened immediately with a native pointer click. The installed Puppeteer version also lacks the newer locator API.

**How to apply:** In headless interaction tests, locate the trigger element and use Puppeteer's element-handle click before waiting for menu items.

For admin tabs and buttons whose coordinates can shift while dashboard data loads, browser-native keyboard activation is more reliable than measuring coordinates immediately after the control appears. CDP Enter events must include the carriage-return text to reproduce the browser's normal button activation.

**Why:** Asynchronous dashboard content shifted pointer targets during catalogue checks. Enter keydown alone changed Radix tabs but did not activate ordinary buttons; including the native Enter text produced the expected click.

**How to apply:** Wait for the actual loaded control, focus it, and dispatch Enter with its key code and carriage-return text, followed by keyup. Keep pointer activation for dropdowns where the installed Radix implementation requires it.