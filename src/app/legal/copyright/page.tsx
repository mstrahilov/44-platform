import { LegalPage, LegalSection } from '@/components/LegalPage';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({ title: 'Copyright and Takedowns', description: 'How to report copyright concerns on 44OS.', path: '/legal/copyright' });

export default function CopyrightPage() {
  return <LegalPage title="Copyright and Takedowns" summary="How creators confirm rights and how rights holders can report material.">
    <p className="os-type-meta">Effective July 12, 2026 · Last updated July 18, 2026</p>
    <LegalSection title="Creator responsibility"><p>Creators must own submitted work or have permission to publish and distribute it. 44OS records a versioned acknowledgement when a creator publishes a new Item; that acknowledgement is not independent verification by 44.</p></LegalSection>
    <LegalSection title="Report infringement">
      <p>
        Email <a href="mailto:support@44os.com?subject=Copyright%20notice">support@44os.com</a> with
        the subject &ldquo;Copyright notice.&rdquo; Include your contact information, identification of
        the protected work, the exact 44OS URL or other information sufficient to locate the reported
        material, a good-faith statement that the use is not authorized by the rights holder, its
        agent, or law, a statement under penalty of perjury that the report is accurate and that you
        are authorized to act, and your physical or electronic signature.
      </p>
    </LegalSection>
    <LegalSection title="Response and appeals">
      <p>
        44 may hide or restrict reported material while reviewing it, notify the creator, preserve
        audit history, and act on repeat infringement. A creator may respond through the same
        monitored address with identification of the removed material, evidence of ownership,
        permission, or lawful use, contact information, and any statements or consent required by
        applicable law. False or abusive reports or responses may create legal liability and may
        result in account restrictions.
      </p>
    </LegalSection>
  </LegalPage>;
}
