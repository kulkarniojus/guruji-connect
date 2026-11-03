---
name: Guruji finance policy
description: Customer advance collection, direct Guruji balances, automatic monthly records and settlement safeguards
---

Customers pay around 20–25% of the booking amount to the portal, with the remaining amount paid directly to Guruji. This qualifies the user's dropdown answer that the portal collects payment; it does not mean the portal collects the whole booking amount.

**Why:** The user explicitly clarified this split while requesting Guruji pending-payment, cancellation-fine and financial reports.

**How to apply:** Do not assume the portal owes the entire Guruji share after every booking. Distinguish the saved commission allocation from actual receipts and transfers. A portal advance above the saved portal commission can leave an amount owed to Guruji; an advance below it can leave Guruji owing the difference after full collections. Unknown historical collections or allocations must not become invented financial debts or payouts.

Monthly deductions should post automatically on an admin-configured monthly date.

**Why:** The user explicitly selected automatic monthly posting.

**How to apply:** Treat postings as financial records, not real money deductions. Keep recorded periods immutable and prevent duplicate postings across restarts or repeated runs. Catch up missed due periods; archiving a schedule must retain its existing charges and audit trail.

Keep finance management admin-only and separate from the existing customer/Guruji booking and cancellation flows.

**Why:** The user explicitly restricted the bug fixes to their affected areas and asked not to change existing functionality or flow.

**How to apply:** Financial records must not mark bookings paid, change acceptance, alter saved commission shares, or initiate transfers. Proposed withdrawal charges stay separate from reviewed liabilities. Repeated withdrawals are a signal for admin review, never automatic proof of fraud; actual collection involving a replaced Guruji needs manual reconciliation.

Approved Other-category providers may appear in finance reports and be selected individually for scheduled accounting entries. The existing all-Guruji schedule scope must remain Guruji-only.

**Why:** Other-category providers keep the customer account role, and automatically expanding an existing blanket deduction schedule could create unintended charges.

**How to apply:** Recognize approved category applications when reporting or validating explicit provider targets; do not broaden an “all Gurujis” recurring schedule to Other-category providers.
