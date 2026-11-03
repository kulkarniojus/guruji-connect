---
name: Production catalog refresh
description: Preserve production customer, booking, payment, and event history while refreshing catalog content.
---

For Vaidik Dhara, production catalog refreshes must be selective: match pujas by normalized name, preserve IDs and prices on existing pujas, keep inactive pujas inactive, insert only missing active catalog entries, and audit the change. Never use the full Publish data overwrite when the requested scope is only the catalog and admin access; it replaces the entire production database. Admin identities and credentials remain production-owned; restore Super Admin access through the authenticated bootstrap/promote flow rather than copying password data.

**Why:** The user explicitly limited production refresh to puja catalog and admin access while preserving customer, Guruji, and transaction history.

**How to apply:** Require an admin preview and explicit confirmation before a selective production sync. Show development prices for new entries, and leave all unrelated production records untouched.
