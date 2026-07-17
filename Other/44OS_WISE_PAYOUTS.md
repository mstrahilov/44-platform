# 44OS Wise creator payouts

Status: local implementation complete; production activation blocked  
Decision date: 2026-07-17  
Operator: `forty four`  
Platform: `44OS`

This is the operating and implementation contract, not legal or tax advice.

## Final launch decision

- Stripe receives buyer money and remains the buyer-payment processor.
- Wise Business is the sole creator-payout provider.
- The owner sends creator payments manually through the Wise Business interface.
- 44OS does not create Wise transfers through an API at launch.
- PayPal, Stripe Connect payouts, and Stripe Global Payouts are not used.
- Historical provider rows and the dormant Stripe Connect adapter remain preserved.
- Launch delivery is Wise **email-to-claim**. The creator supplies an email; Wise
  sends the secure claim link and collects the creator's bank details.
- A creator does not need a Wise account for the email-to-claim flow described
  by Wise. 44OS stores no bank-account, routing, IBAN, SWIFT, or branch fields.
- Direct bank-recipient collection is a later one-to-one fallback milestone,
  not a hidden branch of launch onboarding.

Official Wise description:
[recipient without bank details](https://wise.com/help/articles/2448398/what-if-i-dont-know-my-recipient's-bank-details)
and [send money to an email](https://wise.com/us/send-money/send-money-to-email).
Country evidence and the distinction between Wise registration, balance holding,
and external-bank delivery live in `Other/44OS_WISE_COUNTRY_RESEARCH.md`.

## Account and promotion boundary

44OS has two account types:

1. **Member** — browse, listen, save, and buy.
2. **Creator** — list Items for sale after mandatory onboarding.

There is no free Creator account or optional paid-seller upgrade. Country is
required at Member signup and stored as an ISO alpha-2 profile fact. Admin
promotion from Member to Creator is allowed only when an unexpired,
operator-verified Wise Business email-to-claim route exists for that country
and target currency. Promotion creates a 44OS notification linking to Creator
Setup. Until onboarding is ready, the new-Item page exposes no upload controls
and the database rejects authenticated Item creation.

A country route is evidence, not a claim that Wise is globally available. The
owner must verify the exact business-to-individual email-to-claim route in the
live Wise Business interface and record a dated evidence reference and
revalidation date. No production route is seeded by the migration.

## Individual seller and tax boundary

Launch sellers are natural persons acting for themselves. Corporations,
partnerships, trusts, nonprofits, multi-member LLCs, and other entity sellers
are waitlisted. W-8BEN-E is therefore out of scope.

The Creator self-certifies federal U.S.-person status:

- U.S. individual: official Form W-9, revision March 2024.
- Foreign individual: official Form W-8BEN, revision October 2021.
- Possible W-8ECI, Form 8233, contradictory answers, and uncertainty: fail
  closed for professional review.

The creator downloads, completes, signs, and uploads the current official IRS
PDF. 44OS records form type, revision, certification, signature confirmation,
signed/submitted timestamps, immutable SHA-256 digest, review evidence, and
W-8BEN expiration/revalidation state. The PDF is AES-256-GCM encrypted with a
server-only versioned key. Ciphertext, TIN, address, signature, treaty claim,
and form contents have no browser or ordinary Admin table grant and must never
enter logs, email, analytics, support history, or auth/profile metadata.

Current official references:
[W-9 requester instructions](https://www.irs.gov/instructions/iw9) and
[W-8BEN](https://www.irs.gov/forms-pubs/about-form-w-8-ben).

## Tax-professional launch gates

Code cannot decide the following. A qualified professional must approve and
record a versioned policy before a Creator becomes ready or a batch is built:

- whether creator proceeds are royalties, marketplace proceeds, services, or
  another category;
- U.S./foreign source rules and treaty treatment;
- withholding rates, deposits, and negative/carry-forward handling;
- Forms 1099, 1042, and 1042-S responsibilities;
- electronic-form validity, change-in-circumstances rules, expiration,
  retention, deletion, and restricted reviewer access;
- sole-proprietor/DBA/disregarded-entity handling and creator-facing terms.

No implementation promises zero withholding.

## Private payout destination

Creator Setup accepts one email address and the current server-selected route
ID. It does not let the browser choose a country, currency, destination type,
or bank schema. The server validates the route against the creator's immutable
profile country, encrypts the normalized email with AES-256-GCM, and stores:

- encrypted email and immutable digest;
- masked email;
- country, target currency, route version, and replacement history;
- access and submission audit evidence.

Ordinary browser/Admin queries cannot read destination ciphertext. Replacement
requires a fresh password reauthentication and creates a new immutable version;
the previous version is disabled, not overwritten.

## Monthly manual payout lifecycle

The append-only creator earnings ledger remains authority for what forty four
owes. The Wise interface and retained evidence are authority for what was sent.
No callback, email, screenshot, or operator statement alone marks a payout paid.

Distinct states remain visible:

1. accrued;
2. pending tax;
3. pending destination/country;
4. eligible;
5. approved;
6. processing;
7. failed or returned;
8. paid.

The durable monthly process:

1. An Admin creates one currency batch with a UTC cutoff and provider
   idempotency key.
2. A transaction-level advisory lock prevents competing batch construction.
   Each earnings entry belongs to at most one payout item.
3. Only entries created and available by the cutoff are selected. Refunds,
   disputes, Stripe processing allocations, and prior adjustments already in
   the ledger affect the sum. Balances below the approved minimum remain
   unassigned and carry forward.
4. Batch membership, cutoff, currency, policy version, count, and total lock
   immutably.
5. A restricted tax reviewer records withholding before approval.
6. An Admin approves the exact batch with an evidence digest.
7. The owner creates the email-to-claim transfer in Wise manually, then records
   the Wise reference, source/target amount and currency, fee, FX rate, and an
   immutable evidence digest. Repeating the same record is idempotent; different
   evidence fails closed.
8. A different Admin independently reconciles the Wise result. Only a
   reconciled `paid` result creates the append-only negative payout ledger
   entry. Failed/returned evidence remains durable for a later reviewed retry.

Wise fees and FX are snapshotted on the payout item; they are never inferred
from the creator's claimed amount. The batch/provider controls have an
independent emergency stop and default to batching, recording, and
reconciliation disabled.

## Implementation evidence

Forward migration:
`supabase/migrations/20260717010000_m12_wise_manual_creator_payouts.sql`

Creator application boundary:

- `src/app/studio/onboarding/page.tsx`
- `src/lib/server/sellerOnboarding.ts`
- `src/app/api/creator/seller/*`

Security and finance acceptance:
`supabase/tests/m12_wise_manual_creator_payouts_security.sql`

The local schema replay passes. The Wise suite passes 31 assertions covering
country fail-closed promotion, entity waitlisting, private tax/destination
grants, masked-only status, authenticated upload blocking, immutable cutoff,
minimum/carry-forward construction, withholding, approval, operator
idempotency, independent reconciliation, exactly one payout debit, and absence
of bank-detail columns.

## Production activation remains unauthorized

The migration is local and unapplied to the linked project. Runtime controls
remain off and emergency stop remains on. No live route, real tax form, real
email claim, API token, bank data, transfer, linked migration, deployment, or
runtime activation was created.

Before production:

1. Owner verifies the exact Namibia (and each later country/currency)
   business-to-individual email-to-claim route in Wise Business using the
   non-developer steps in `Other/44OS_WISE_COUNTRY_RESEARCH.md`.
2. Tax professional approves the versioned launch policy above.
3. Owner approves backup, linked migration, encryption-key secret placement,
   restricted tax reviewer(s), route evidence, creator terms, and controls.
4. One owner-authorized low-value live email claim is independently reconciled
   to Wise receipt/statement and the ledger.
5. Activation remains creator-specific and reversible.

If a creator reports email-to-claim failure, do not collect bank details in
support or ordinary Admin history. Open a separate reviewed direct-bank fallback
milestone for that individual and country.
