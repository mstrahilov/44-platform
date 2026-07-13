import { LegalPage, LegalSection } from '@/components/LegalPage';
import { buildPageMetadata } from '@/lib/metadata';
import { notFound } from 'next/navigation';

export const metadata = buildPageMetadata({ title: 'Privacy Policy', description: 'How 44OS handles account and platform data.', path: '/legal/privacy' });

export default function PrivacyPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_M13_REVIEWED_SURFACES !== 'true') notFound();
  return <LegalPage title="Privacy Policy" summary="How 44OS handles account, catalog, Community, Library, and operational data.">
    <p className="os-type-meta">Effective July 12, 2026</p>
    <LegalSection title="Data we handle"><p>44OS handles account identifiers, profile information, uploaded work, Community activity, Library relationships, playback and achievement events, preferences, reports, security events, and support messages. Payment details are not currently collected by 44OS checkout.</p></LegalSection>
    <LegalSection title="Why we use it"><p>We use data to operate accounts, publishing, playback, Library access, achievements, moderation, security, support, analytics, and platform improvement. We do not operate an advertising business or sell personal information.</p></LegalSection>
    <LegalSection title="Service providers"><p>44OS uses infrastructure providers including Supabase for authentication, database, and storage, and Vercel for application hosting and delivery. Those providers process data to deliver their services.</p></LegalSection>
    <LegalSection title="Retention and safety"><p>We retain information while needed to operate accounts and preserve permanent Item, entitlement, Library, moderation, and audit history. Access is restricted through authentication, row-level security, private storage, and server-authoritative operations.</p></LegalSection>
    <LegalSection title="Your choices"><p>You can edit profile information and preferences in Settings. To request access, correction, or deletion review, contact privacy@44os.com. Some records may be retained where required for security, user entitlements, disputes, or law.</p></LegalSection>
    <LegalSection title="Children and changes"><p>44OS is not directed to children under 13. We may update this policy as the platform and payment model develop; material changes will receive a new effective date.</p></LegalSection>
  </LegalPage>;
}
