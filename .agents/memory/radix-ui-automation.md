---
name: Radix UI automation
description: Reliable interaction with Radix dropdowns in the project's headless browser tests
---

Radix dropdown triggers should be activated with a browser-native pointer click, not a synthetic DOM `element.click()`.

**Why:** A simulated account-switch test waited indefinitely for the menu after a synthetic click; the same menu opened immediately with a native pointer click. The installed Puppeteer version also lacks the newer locator API.

**How to apply:** In headless interaction tests, locate the trigger element and use Puppeteer's element-handle click before waiting for menu items.