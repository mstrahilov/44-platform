import Link from 'next/link';
import { LegalPage, LegalSection } from '@/components/LegalPage';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Terms of Service',
  description: 'The terms governing accounts, purchases, publishing, and use of 44OS.',
  path: '/legal/terms',
});

export default function TermsPage() {
  return <LegalPage
    title="Terms of Service"
    summary="The terms governing accounts, purchases, publishing, and use of 44OS."
  >
    <p className="os-type-meta">Effective July 17, 2026 · Last updated July 18, 2026</p>

    <LegalSection title="Agreement and operator">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) are an agreement between you and forty four
        (&ldquo;forty four,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), the
        operator of 44OS. By creating an account, purchasing an Item, publishing through 44OS, or
        otherwise using 44OS, you agree to these Terms and our{' '}
        <Link href="/legal/privacy">Privacy Policy</Link>. If you do not agree, do not use 44OS.
      </p>
    </LegalSection>

    <LegalSection title="Accounts">
      <p>
        You must provide accurate information, keep it current, protect your login credentials, and
        promptly report suspected unauthorized access. You are responsible for activity through
        your account. Members can browse, buy, and use available community features. Only a Member
        promoted and approved by an administrator may become a Creator and list Items for sale.
        Creator access is not automatic and may require eligibility, country, tax, identity, and
        payout onboarding before publishing tools are enabled.
      </p>
      <p>
        You may not create an account or use 44OS if doing so would violate applicable law. If you
        use 44OS for another person, you represent that you are authorized to bind that person to
        these Terms.
      </p>
    </LegalSection>

    <LegalSection title="Purchases and payment">
      <p>
        Prices, currency, available options, and any applicable shipping or tax are shown before
        you submit an order. Stripe processes customer payments through Stripe-hosted Checkout.
        Your order is not paid or complete merely because your browser returns to 44OS; payment is
        confirmed only after 44OS receives and verifies provider evidence. We may reject, cancel,
        limit, or refund an order affected by an error, suspected fraud, unavailability, legal
        restriction, or failure to receive payment.
      </p>
      <p>
        You authorize the applicable purchase price, tax, shipping, and other amounts disclosed at
        checkout. Your card issuer or payment provider may apply separate terms, conversion rates,
        or fees. Creator payouts are separate from customer payment processing and do not change
        your payment obligation as a buyer.
      </p>
    </LegalSection>

    <LegalSection title="Digital Items and Library access">
      <p>
        A digital purchase gives you the access or license described on the Item and at checkout;
        it does not transfer copyright or ownership of the underlying work. Unless the specific
        Item license expressly allows it, you may not reproduce, redistribute, resell, publicly
        share, sublicense, scrape, or bypass access controls for a digital Item. Sample Packs and
        other licensed materials may have additional Item-specific license terms that form part of
        your purchase.
      </p>
      <p>
        44OS may preserve the purchase and entitlement record even if an Item later leaves public
        sale. Access can be restricted where payment is refunded, reversed, disputed, fraudulent,
        unlawful, or used outside the applicable license.
      </p>
    </LegalSection>

    <LegalSection title="Physical merchandise and shipping">
      <p>
        Launch merchandise is sold by forty four and fulfilled by Printful. Physical checkout is
        limited to supported United States delivery addresses. The current launch shipping method
        is Standard Shipping for $14.99 USD, with an estimated 5–10 business-day delivery window,
        as also disclosed at checkout. Product appearance can vary slightly from on-screen images,
        and availability, production, delivery estimates, and tracking can change. An order entering
        fulfillment is not a guarantee of a particular delivery date. You are responsible for
        providing a complete and accurate deliverable address.
      </p>
      <p>
        If we cannot ship within the time represented for your order, we will notify you and offer
        the choice required by applicable law: consent to the delay or cancel the unshipped order
        for a prompt full refund. If an Item becomes unavailable or fulfillment cannot proceed, we
        may hold the order for review, offer a reasonable alternative that you may accept, or cancel
        and refund the affected amount. Risk and title transfer only to the extent provided by
        applicable law.
      </p>
    </LegalSection>

    <LegalSection title="Cancellations, refunds, and returns">
      <p>
        Contact <a href="mailto:support@44os.com">support@44os.com</a> as soon as possible if you
        need to cancel an order or report an incorrect, damaged, defective, missing, or undelivered
        Item. We cannot guarantee cancellation after physical production begins or after a digital
        Item has been delivered or accessed.
      </p>
      <p>
        Refund and return eligibility depends on the Item, fulfillment status, purchase terms shown
        at checkout, the circumstances of the request, and applicable law. We may request reasonable
        order details or evidence needed to investigate. Approved refunds are returned to the
        original payment method where possible; provider processing times may apply. Nothing in
        these Terms limits a non-waivable consumer right.
      </p>
    </LegalSection>

    <LegalSection title="Creators and submitted work">
      <p>
        You retain ownership of original work you submit. You grant forty four a non-exclusive,
        worldwide license to host, store, reproduce, encode, stream, display, promote, distribute,
        and make the work available through 44OS as needed to operate the features and sales you
        enable. This license includes use of submitted names, artwork, descriptions, previews, and
        metadata for those purposes and continues as reasonably needed to honor existing purchases,
        entitlements, records, disputes, and legal obligations.
      </p>
      <p>
        A Creator must own the submitted work or hold every right and permission needed to publish,
        sell, license, and authorize forty four&apos;s use of it. Creator approval, pricing,
        earnings, tax, payout, removal, and other seller obligations may be governed by additional
        Creator terms accepted during onboarding. No payout is due merely because an amount is
        displayed as accrued, pending, under review, or otherwise unreconciled.
      </p>
    </LegalSection>

    <LegalSection title="Acceptable use">
      <p>
        Do not use 44OS to violate law or another person&apos;s rights; harass, threaten, exploit,
        deceive, or impersonate anyone; distribute malware or spam; interfere with security or
        service operation; test stolen payment credentials; scrape or access data without
        permission; evade moderation or access controls; manipulate plays, engagement, sales, or
        earnings; or publish unlawful, infringing, or misleading material.
      </p>
      <p>
        Copyright concerns are handled under our{' '}
        <Link href="/legal/copyright">Copyright and Takedowns policy</Link>.
      </p>
    </LegalSection>

    <LegalSection title="Platform changes and availability">
      <p>
        44OS is an evolving service. We may add, change, suspend, or discontinue features and may
        restrict an Item, transaction, or account to maintain security, comply with law, resolve a
        rights claim, address provider limitations, or protect users and the platform. We do not
        promise uninterrupted or error-free availability. We will use reasonable care when changes
        affect completed purchases and legally protected rights.
      </p>
    </LegalSection>

    <LegalSection title="Third-party services">
      <p>
        44OS relies on third parties such as Stripe for payment, Printful for physical fulfillment,
        Wise for Creator payouts, and infrastructure and email providers. Their services may be
        governed by separate terms and privacy policies. We are not responsible for a third-party
        service outside our reasonable control, but this does not limit responsibilities that
        cannot legally be excluded.
      </p>
    </LegalSection>

    <LegalSection title="Disclaimers and limitation of liability">
      <p>
        To the maximum extent permitted by law, 44OS is provided &ldquo;as is&rdquo; and &ldquo;as
        available,&rdquo; and we disclaim implied warranties of merchantability, fitness for a
        particular purpose, title, and non-infringement. We do not warrant that every Creator
        submission is accurate, lawful, or suitable for you.
      </p>
      <p>
        To the maximum extent permitted by law, forty four will not be liable for indirect,
        incidental, special, consequential, exemplary, or punitive damages, or for lost profits,
        revenue, data, goodwill, or opportunity, arising from use of or inability to use 44OS.
        These exclusions do not apply where prohibited by law, and nothing excludes liability that
        cannot legally be limited.
      </p>
    </LegalSection>

    <LegalSection title="Suspension and termination">
      <p>
        You may stop using 44OS at any time. We may restrict or terminate access for a material or
        repeated breach of these Terms, fraud, security risk, legal requirement, rights violation,
        provider restriction, or conduct that creates harm or liability. We may preserve permanent
        Item identifiers, purchases, entitlements, transaction, moderation, provider, tax, payout,
        and audit records where needed for users, disputes, security, accounting, or law.
      </p>
    </LegalSection>

    <LegalSection title="Changes to these Terms">
      <p>
        We may update these Terms as 44OS, our providers, or legal requirements change. We will post
        the revised Terms here and update the effective date, and will provide additional notice
        when required. Your continued use after revised Terms become effective means you accept the
        revision, except where applicable law requires another form of consent.
      </p>
    </LegalSection>

    <LegalSection title="Contact">
      <p>
        Questions, order issues, or legal notices can be sent to{' '}
        <a href="mailto:support@44os.com">support@44os.com</a> or submitted through the{' '}
        <Link href="/support">Support page</Link>.
      </p>
    </LegalSection>
  </LegalPage>;
}
