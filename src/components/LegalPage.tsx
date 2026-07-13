import Link from 'next/link';
import { PageShell, HubHero } from '@/components/Ui';

export function LegalPage({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return <PageShell><main className="app-page legal-page"><HubHero title={title} copy={summary} /><div className="os-paper-panel legal-document">{children}<nav className="legal-links" aria-label="Legal documents"><Link href="/legal/terms">Terms</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal/copyright">Copyright</Link><Link href="/support">Support</Link></nav></div></main></PageShell>;
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="os-type-panel-title">{title}</h2><div className="os-type-body">{children}</div></section>;
}
