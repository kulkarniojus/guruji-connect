---
name: Booking schedule schema
description: Non-obvious live database shape and booking-duration decision for scheduling work
---

The live booking data stores a calendar date and separate display-formatted time. The shared schema describes a different shape, so scheduling changes must inspect the actual database rather than assume that schema matches production.

**Why:** A timestamp-only overlap calculation would have missed existing confirmed bookings because their start hour lives in a separate text field. Admin changes to service duration also must not silently reschedule bookings that were already placed.

**How to apply:** For schedule queries, combine the live date and time explicitly and use the booked duration snapshot when present. Preserve the overlap rule that a 0-hour exception reserves its starting minute, not an extended interval.

Validate date-only values as calendar strings, not by converting local midnight into a UTC date.

**Why:** In India time, local midnight becomes the previous day in UTC, so comparing its ISO date to the input incorrectly rejects valid From/To dates.

**How to apply:** Use timezone-neutral calendar validation for date fields; combine a scheduled date and time in India time only when calculating a start instant.