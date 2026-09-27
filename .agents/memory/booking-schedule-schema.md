---
name: Booking schedule schema
description: Non-obvious live database shape and booking-duration decision for scheduling work
---

The live booking data stores a calendar date and separate display-formatted time. The shared schema describes a different shape, so scheduling changes must inspect the actual database rather than assume that schema matches production.

**Why:** A timestamp-only overlap calculation would have missed existing confirmed bookings because their start hour lives in a separate text field. Admin changes to service duration also must not silently reschedule bookings that were already placed.

**How to apply:** For schedule queries, combine the live date and time explicitly and use the booked duration snapshot when present. Preserve the overlap rule that a 0-hour exception reserves its starting minute, not an extended interval.