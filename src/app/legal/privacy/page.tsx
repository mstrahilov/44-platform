import Link from 'next/link';
import { LegalPage, LegalSection } from '@/components/LegalPage';
import { buildPageMetadata } from '@/lib/metadata';
import { AnalyticsPrivacyControls } from '@/components/AnalyticsConsent';
import { getAnalyticsMeasurementId } from '@/lib/analyticsConfig';

export const metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description: 'How forty four collects, uses, discloses, and safeguards information through 44OS.',
  path: '/legal/privacy',
});

export default function PrivacyPage() {
  const analyticsMeasurementId = getAnalyticsMeasurementId();
  return <LegalPage
    title="Privacy Policy"
    summary="How forty four collects, uses, discloses, and safeguards information through 44OS."
  >
    <p className="os-type-meta">Effective July 17, 2026 · Last updated July 18, 2026</p>

    <LegalSection title="Who we are and what this policy covers">
      <p>
        forty four (&ldquo;forty four,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
        operates 44OS. This Privacy Policy applies when you visit 44os.com, create or use a 44OS
        account, buy or publish an Item, contact Support, or otherwise use 44OS. It does not govern
        a third party&apos;s own website, service, or privacy practices.
      </p>
    </LegalSection>

    <LegalSection title="Information we collect">
      <p>Depending on how you use 44OS, we collect or process:</p>
      <ul>
        <li><strong>Account and profile information:</strong> email address, username, password or authentication credential, country, account type, profile details, preferences, and account status.</li>
        <li><strong>Content and activity:</strong> Items and files you submit, creator information you choose to publish, Community activity, Library and entitlement records, playback and achievement events, reports, and moderation history.</li>
        <li><strong>Purchase information:</strong> cart contents, orders, purchased Items, prices, currency, tax and shipping amounts, transaction and payment status, refunds, disputes, and provider reference numbers.</li>
        <li><strong>Delivery information:</strong> a recipient&apos;s name, United States shipping address, contact details, selected product variant, fulfillment status, and tracking information for a physical order.</li>
        <li><strong>Creator onboarding information:</strong> for an Admin-approved Member becoming a Creator, eligibility and country information and, when paid selling is enabled, tax classification, certifications, tax-form information, signature evidence, review status, and a Wise payout-claim email address. At launch, 44OS does not ask Creators to store bank-account details with us.</li>
        <li><strong>Communications:</strong> support requests, correspondence, notification preferences, consent records, and email delivery or suppression events.</li>
        <li><strong>Device, usage, and security information:</strong> IP address, browser and device information, request and event timestamps, page or feature interactions, error and security events, and similar technical records needed to operate and protect 44OS.</li>
        <li><strong>Browser storage:</strong> necessary session information and local preferences such as cart contents, interface settings, notification state, and media-player state.</li>
      </ul>
      <p>
        We receive information directly from you, automatically from your browser or device, from
        forty four administrators, and from service providers involved in authentication, payment,
        fulfillment, email, hosting, and support.
      </p>
    </LegalSection>

    <LegalSection title="How we use information">
      <p>We use information to:</p>
      <ul>
        <li>create, authenticate, maintain, and secure Member and Creator accounts;</li>
        <li>operate profiles, publishing, Store, Community, Library, playback, and account features;</li>
        <li>price and process purchases, calculate applicable tax and shipping, deliver digital purchases, fulfill physical orders, and administer refunds, disputes, and customer support;</li>
        <li>review Creator eligibility, meet tax and recordkeeping obligations, account for earnings, and initiate approved Creator payouts;</li>
        <li>send account, purchase, fulfillment, security, and support communications;</li>
        <li>detect fraud, abuse, infringement, technical failures, and threats to 44OS or its users;</li>
        <li>enforce our terms, preserve evidence, comply with law, and establish or defend legal claims; and</li>
        <li>understand performance and improve the reliability, accessibility, and usefulness of 44OS.</li>
      </ul>
      <p>We do not sell personal information or operate a behavioral advertising business.</p>
    </LegalSection>

    <LegalSection title="Optional analytics and your choice" id="analytics">
      <p>
        44OS does not load optional Google Analytics measurement unless it is configured and you
        choose &ldquo;Allow analytics.&rdquo; If you allow it, Google Analytics may process public page and
        feature interactions, approximate location, browser and device information, and a random
        client identifier to help us understand reliability and improve 44OS. We do not send your
        email address, username, profile name, payment-card information, private messages, support
        text, uploaded files, or Creator tax information to Google Analytics.
      </p>
      <p>
        Advertising storage, advertising user data, ad personalization, Google signals, and ad
        personalization signals remain denied. Analytics uses first-party cookies such as
        <code>_ga</code> and <code>_ga_*</code> only after consent. Declining does not affect account,
        security, Cart, Library, playback, or other necessary storage. You can change your choice
        below; declining after previously allowing analytics disables further collection in this
        browser and removes accessible 44OS analytics cookies.
      </p>
      <AnalyticsPrivacyControls measurementId={analyticsMeasurementId} />
    </LegalSection>

    <LegalSection title="Who receives information and why">
      <p>We disclose only the information reasonably needed for the applicable purpose:</p>
      <ul>
        <li><strong>Stripe</strong> receives payment, billing, tax, transaction, fraud-prevention, and—when needed for an order—shipping information to provide hosted checkout and payment services. Payment-card details are entered into Stripe&apos;s hosted systems; 44OS does not receive or store the full card number or card security code.</li>
        <li><strong>Printful</strong> receives the physical-product selection and delivery information needed to quote, prepare, fulfill, ship, and track an approved merchandise order.</li>
        <li><strong>Wise</strong> receives a Creator&apos;s payout-claim email address and the payment information needed when forty four manually initiates an approved Creator payout. Wise obtains any bank details required to claim that payment through its own process.</li>
        <li><strong>Supabase and Vercel</strong> process information to provide authentication, database, private file storage, application hosting, security, and delivery infrastructure.</li>
        <li><strong>Resend and our mailbox provider</strong> process email addresses, message contents, and delivery information to send account or transactional messages and handle Support correspondence.</li>
        <li><strong>Google Analytics</strong> processes limited device and public usage information only when optional measurement is configured and you affirmatively allow it. Advertising features remain disabled.</li>
        <li><strong>Professional advisers and authorities</strong> may receive information when reasonably necessary for accounting, tax, legal, insurance, security, compliance, or a valid legal request.</li>
        <li><strong>A successor or transaction participant</strong> may receive relevant information as part of a proposed or completed financing, reorganization, sale, or transfer of all or part of the business, subject to appropriate confidentiality and legal requirements.</li>
      </ul>
      <p>
        Public profile information and published Items are disclosed to other 44OS users and site
        visitors according to the visibility settings and features you use.
      </p>
    </LegalSection>

    <LegalSection title="How disclosures occur">
      <p>
        We disclose information through authenticated provider APIs, encrypted web connections,
        signed webhook connections, restricted provider dashboards, secure email where appropriate,
        or a legally required process. We seek to limit each disclosure to information needed for
        the service, transaction, support request, or legal purpose. Service providers process
        information under their own terms and privacy policies.
      </p>
    </LegalSection>

    <LegalSection title="Security practices">
      <p>
        We use administrative, technical, and organizational safeguards designed to protect
        information. These include HTTPS encryption in transit, provider-managed authentication,
        private storage for restricted files, database row-level security, server-only credentials,
        role-based and least-privilege access, access and decision audit trails, signed-provider
        event verification, data minimization, and backups. Sensitive Creator tax information is
        separated from ordinary browser-readable and Admin-list data, and access is restricted and
        audited. Stripe hosts the collection of payment-card details.
      </p>
      <p>
        No storage or transmission method is completely secure. You are responsible for using a
        strong, unique password, protecting your account and devices, and promptly telling us about
        suspected unauthorized access.
      </p>
    </LegalSection>

    <LegalSection title="Retention">
      <p>
        We retain information for as long as reasonably necessary to provide 44OS, maintain
        purchases and entitlements, fulfill orders, administer Creator and tax records, resolve
        disputes, prevent fraud, enforce agreements, and meet legal, accounting, and security
        obligations. Retention depends on the type of record and why it is held. We may retain
        transaction, entitlement, moderation, tax, provider-evidence, and audit records after an
        account closes when those records remain necessary for these purposes.
      </p>
    </LegalSection>

    <LegalSection title="Your choices and privacy rights">
      <p>
        You can update certain profile and preference information in Settings and can opt out of
        optional marketing messages using the message&apos;s unsubscribe method. Transactional,
        account, security, and support messages may still be necessary to provide 44OS.
      </p>
      <p>
        Depending on where you live, you may have rights to request access, correction, deletion,
        portability, restriction, or objection, or to appeal a privacy decision. To make a request,
        contact <a href="mailto:support@44os.com">support@44os.com</a>. We may need to verify your
        identity. These rights can be limited by law and by our need to preserve purchases,
        entitlements, tax records, security evidence, or legal claims.
      </p>
    </LegalSection>

    <LegalSection title="International processing">
      <p>
        44OS and its service providers may process information in the United States and other
        countries. Those countries may have privacy laws different from the laws where you live.
        Where required, we and our providers use legally recognized safeguards for international
        transfers.
      </p>
    </LegalSection>

    <LegalSection title="Children">
      <p>
        44OS is not directed to children under 13, and we do not knowingly collect personal
        information from a child under 13. If you believe a child has provided such information,
        contact Support so we can review and take appropriate action.
      </p>
    </LegalSection>

    <LegalSection title="Changes and contact">
      <p>
        We may update this Privacy Policy as 44OS or legal requirements change. We will post the
        updated policy here and change the effective date; we will provide additional notice when
        required by law. Questions or concerns can be sent to{' '}
        <a href="mailto:support@44os.com">support@44os.com</a> or submitted through the{' '}
        <Link href="/support">Support page</Link>.
      </p>
    </LegalSection>
  </LegalPage>;
}
