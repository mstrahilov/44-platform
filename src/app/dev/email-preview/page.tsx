import { notFound } from 'next/navigation';
import { EMAIL_TEMPLATE_VERSIONS, type EmailTemplateKey } from '@/emails/contracts';
import { EMAIL_PREVIEW_FIXTURES } from '@/emails/fixtures';
import { renderEmail } from '@/emails/render';

export const dynamic = 'force-dynamic';

export default async function EmailPreviewPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { template: requested } = await searchParams;
  const keys = Object.keys(EMAIL_TEMPLATE_VERSIONS) as EmailTemplateKey[];
  const key = keys.includes(requested as EmailTemplateKey) ? requested as EmailTemplateKey : keys[0];
  const rendered = await renderEmail(key, EMAIL_PREVIEW_FIXTURES[key] as never);
  return <main style={{ minHeight: '100vh', padding: 24, background: '#e9e9e5', color: '#151515', fontFamily: 'Arial, sans-serif' }}>
    <h1 style={{ marginTop: 0 }}>44OS email preview</h1>
    <p><a href="/dev/auth-email-preview" style={{ color: '#151515' }}>Supabase Auth email previews</a></p>
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>{keys.map(item => <a key={item} href={`/dev/email-preview?template=${item}`} style={{ padding: '8px 10px', background: item === key ? '#151515' : '#fff', color: item === key ? '#fff' : '#151515', textDecoration: 'none' }}>{item}</a>)}</nav>
    <p><strong>Subject:</strong> {rendered.subject} · template v{EMAIL_TEMPLATE_VERSIONS[key]}</p>
    <section style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 600px) minmax(280px, 390px)', gap: 24, alignItems: 'start' }}>
      <div><h2>Desktop</h2><iframe title={`${key} desktop`} srcDoc={rendered.html} style={{ width: '100%', height: 720, border: '1px solid #bbb', background: '#fff' }} /></div>
      <div><h2>Mobile</h2><iframe title={`${key} mobile`} srcDoc={rendered.html} style={{ width: '100%', height: 720, border: '1px solid #bbb', background: '#fff' }} /></div>
    </section>
    <h2>Plain text</h2><pre style={{ maxWidth: 760, padding: 20, whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid #bbb', lineHeight: 1.5 }}>{rendered.text}</pre>
  </main>;
}
