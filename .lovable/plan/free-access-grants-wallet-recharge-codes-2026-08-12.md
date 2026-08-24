# Free access grants + Wallet recharge codes

## 1. Grant a session for free to a specific student

In the session page (Students tab) add a **Grant free access** button:
- Search/pick a student (by name or student ID), optional note, then confirm.
- Creates a normal enrollment (same expiry rules as a paid one) marked `source: "Free"` — no wallet charge, no transaction.
- The enrolled-students count keeps counting everyone (paid + free) and a small breakdown is shown: `24 enrolled · 21 paid · 3 free`.
- Each row shows an "Access" tag (Paid / Free) and free grants can be revoked (removes the enrollment).
- Existing enrollments are treated as Paid.

## 2. New "Codes" section (sidebar entry `/codes`)

**Generate**
- Choose value (e.g. 120 EGP), quantity (e.g. 50), optional label/batch name and optional expiry date.
- Produces unique codes (format `MTH-XXXX-XXXX`, unambiguous characters), each single-use.
- Copy one code, copy all, or export the batch to Excel to distribute.

**Manage / search**
- Table of all codes: code, value, status (Unused / Used / Expired), batch, created date, redeemed-by student (name + student ID), redeemed date & time.
- Search box matches a code (full or partial) and shows exactly who used it and when; filters by status, value and batch.
- Actions: deactivate an unused code, delete, export filtered list to Excel.
- Stat cards: total issued, unused, redeemed, total value issued vs redeemed.

**Redeeming**
- Admin can redeem a code on behalf of a student from the code row or from the student page ("Redeem code"), which credits the wallet and writes a `Wallet Code Redemption` transaction visible in Payments and the student's ledger.
- A code can never be redeemed twice; expired/deactivated codes are rejected with a clear message.

## Extra suggestions (say if you want them)
- **Bulk free access**: grant a session to a whole level or to multiple selected students at once.
- **WhatsApp the code**: send a code straight to a student's phone with a ready-made message.
- **Dashboard tile**: redeemed code value this month next to the other revenue metrics.
- **Payments filter** for code redemptions so recharges by code are separable from Fawry.

## Technical notes
- `types.ts`: add `source: "Paid" | "Free"` (+ `grantedBy`/`grantedAt`) to `Enrollment`; add `WalletCode` type and `codes: WalletCode[]` to `DB`; add `"Wallet Code Redemption"` to `TxType` and `"Code"` to `PaymentMethod`.
- `store.tsx`: `grantFreeAccess`, `revokeAccess`, `generateCodes`, `redeemCode` (guards against reuse/expiry, reuses `addTransaction` for the wallet credit), `deactivateCode`, `deleteCode`.
- New route `src/routes/codes.tsx` + nav item, reusing the existing panel/table styling and `exportWorkbook` for Excel.
- Data stays in the local store (localStorage) like the rest of the app; note that real single-use enforcement across student devices would need Lovable Cloud later.
