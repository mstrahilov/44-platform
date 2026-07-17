import { LegalPage, LegalSection } from '@/components/LegalPage';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({ title: 'Copyright and Takedowns', description: 'How to report copyright concerns on 44OS.', path: '/legal/copyright' });

export default function CopyrightPage() {
  return <LegalPage title="Copyright and Takedowns" summary="How creators confirm rights and how rights holders can report material.">
    <p className="os-type-meta">Effective July 12, 2026</p>
    <LegalSection title="Creator responsibility"><p>Creators must own submitted work or have permission to publish and distribute it. 44OS records a versioned acknowledgement when a creator publishes a new Item; that acknowledgement is not independent verification by 44.</p></LegalSection>
    <LegalSection title="Report infringement"><p>Email copyright@44os.com with your contact information, the protected work, the exact 44OS URL, a good-faith statement that the use is unauthorized, an accuracy and authority statement, and your physical or electronic signature.</p></LegalSection>
    <LegalSection title="Response and appeals"><p>44 may hide or restrict reported material while reviewing it, notify the creator, preserve audit history, and act on repeat infringement. Creators may respond with evidence of ownership or permission. False or abusive reports may result in account restrictions.</p></LegalSection>
  </LegalPage>;
}
