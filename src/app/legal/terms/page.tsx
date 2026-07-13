import { LegalPage, LegalSection } from '@/components/LegalPage';
import { buildPageMetadata } from '@/lib/metadata';
import { notFound } from 'next/navigation';

export const metadata = buildPageMetadata({ title: 'Terms of Use', description: 'The rules for using 44OS.', path: '/legal/terms' });

export default function TermsPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_M13_REVIEWED_SURFACES !== 'true') notFound();
  return <LegalPage title="Terms of Use" summary="The rules for using 44OS during trusted testing and public operation.">
    <p className="os-type-meta">Effective July 12, 2026</p>
    <LegalSection title="Using 44OS"><p>You must provide accurate account information, protect your login, and use 44OS lawfully. Fan registration does not grant Studio publishing access. During trusted testing, publishing is limited to creators approved by 44.</p></LegalSection>
    <LegalSection title="Your work"><p>You keep ownership of work you submit. You give 44 the limited permission needed to host, reproduce, stream, display, and distribute that work through 44OS according to the features you enable. You must own the work or have the necessary permissions.</p></LegalSection>
    <LegalSection title="Community conduct"><p>Do not harass people, impersonate others, distribute malware, spam, evade moderation, or publish unlawful or infringing material. 44 may restrict or remove content and accounts to protect people, rights holders, and the platform.</p></LegalSection>
    <LegalSection title="Testing and availability"><p>44OS is in active testing. Features may change and interruptions may occur. Paid checkout remains unavailable until its operating model and verified payment systems are approved.</p></LegalSection>
    <LegalSection title="Removal and termination"><p>Creators may remove Items from active catalog display, but 44 may retain permanent identifiers, Library relationships, entitlements, and audit records needed for security, user access, disputes, and legal compliance.</p></LegalSection>
    <LegalSection title="Contact"><p>Questions about these terms can be sent to support@44os.com.</p></LegalSection>
  </LegalPage>;
}
