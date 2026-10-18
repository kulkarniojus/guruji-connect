---
name: Guruji puja matching
description: Why booking service matching must include both linked and legacy profile specializations
---

Until Guruji service data is reconciled, booking filters should accept a puja recorded in either the explicit service relationship or the profile's specialization list, while retaining city, approval, verification, and availability checks.

**Why:** Approved, available Gurujis had the requested service in their profile and lived in the selected city, but lacked the separate service link. Filtering only by the link made booking show no Gurujis even though valid profiles existed.

**How to apply:** When changing Guruji booking, registration, or profile service logic, consider both representations of specializations (names and numeric IDs in older data). Do not broaden city or approval checks merely to make results appear.