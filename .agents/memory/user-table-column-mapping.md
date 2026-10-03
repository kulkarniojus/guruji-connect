---
name: Live user-table columns
description: The connected PostgreSQL users table uses quoted camelCase columns for several fields despite shared-schema naming differences.
---

For user writes, use the actual connected table columns: `firstName`, `lastName`, `isVerified`, `isBlocked`, and `updatedAt` are quoted camelCase identifiers. Other user fields such as `email`, `mobile`, `age`, `gender`, `address`, `city`, `state`, and `pincode` are lowercase.

**Why:** The live table was created with a physical layout that does not fully match the shared schema's declared column names. Snake_case updates to camelCase fields fail at runtime.

**How to apply:** Before changing user persistence, verify column names against the connected database's `information_schema` and quote mixed-case identifiers in SQL.

The mismatch also affects Guruji profiles and service relationships: modeled fields and modeled defaults are not guarantees about the connected tables.

**Why:** Integration fixtures failed when they assumed modeled profile fields existed and that relationship timestamps had database defaults. These assumptions were not valid in the live schema.

**How to apply:** Before adding writes or integration fixtures for a new table, inspect its physical columns, nullability, and database defaults. Keep fixtures aligned with that storage rather than changing the database to match assumptions in a test.