# M11 Provisional Payment Model

**State:** Provisional architecture only — not approved for live commerce.

44OS intends to use Stripe to collect customer payments and PayPal Payouts to pay creators where eligible. Checkout, settlement, earnings availability, and payouts remain disabled until M11 has legal/accounting approval and M12 sandbox failure testing passes.

## Working boundary

- 44 is provisionally the seller collecting customer funds through its Stripe account. This is not a final merchant-of-record or marketplace conclusion.
- Creator earnings are calculated in an append-only internal ledger and are not treated as payable or paid until reconciled against provider records.
- PayPal recipient eligibility is verified per creator. Country listing alone is not proof that an account can receive and withdraw a payout.
- Provider IDs wrap the existing 44OS order, Item, entitlement, and Library identities; they never replace them.
- Signed webhooks and reconciliation are the only paths that may later move orders, entitlements, refunds, disputes, earnings, or payouts between authoritative states.
- All runtime switches default off. Missing configuration must fail closed.

## Decisions required before M11 approval

1. Legal seller/merchant-of-record structure and whether the model creates marketplace, money-transmission, or safeguarded-funds obligations.
2. Tax registration, calculation, invoicing, remittance, and creator tax reporting by selling country.
3. Platform fee, processor-fee allocation, reserves, payout timing/minimum, currency conversion, negative balances, and abandoned/unclaimed funds.
4. Refund and dispute policy, including which party bears fees and when access is revoked.
5. Creator identity/KYC and sanctions screening, supported creator countries, PayPal receive/withdraw verification, and a fallback for ineligible recipients.
6. Physical fulfillment, shipping tax, returns, chargebacks, inventory, and seller responsibilities.
7. Supported buyer countries, presentment/settlement currencies, pricing rules, and customer support ownership.

## Credential-dependent M12 acceptance

- Stripe test-mode checkout, signed webhook replay, duplicate/out-of-order delivery, delayed success, failure, refund, partial refund, and dispute tests.
- PayPal sandbox approval, signed webhook verification, duplicate delivery, batch/item reconciliation, blocked/held/failed/returned/refunded/unclaimed cases, and insufficient-funds tests.
- A reconciliation run must prove provider totals, orders, entitlement events, creator earnings, and payouts cannot silently diverge.
- Production activation requires an explicit reviewed migration/configuration change; adding credentials alone must not enable commerce.
