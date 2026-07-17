import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const templates = {
  confirmation: { subject: 'Confirm your 44OS email', values: { '{{ .ConfirmationURL }}': 'https://auth.44os.com/auth/v1/verify?type=signup&token=preview' } },
  recovery: { subject: 'Reset your 44OS password', values: { '{{ .ConfirmationURL }}': 'https://auth.44os.com/auth/v1/verify?type=recovery&token=preview' } },
  magic_link: { subject: 'Your 44OS sign-in link', values: { '{{ .ConfirmationURL }}': 'https://auth.44os.com/auth/v1/verify?type=magiclink&token=preview' } },
  invite: { subject: 'You are invited to 44OS', values: { '{{ .ConfirmationURL }}': 'https://auth.44os.com/auth/v1/verify?type=invite&token=preview' } },
  email_change: {
    subject: 'Confirm your new 44OS email',
    values: { '{{ .ConfirmationURL }}': 'https://auth.44os.com/auth/v1/verify?type=email_change&token=preview', '{{ .NewEmail }}': 'new-address@example.com' },
  },
  reauthentication: { subject: '12345678 is your 44OS verification code', values: { '{{ .Token }}': '12345678' } },
  password_changed: { subject: 'Your 44OS password was changed', values: { '{{ .SiteURL }}': 'https://44os.com' } },
  email_changed: {
    subject: 'Your 44OS email was changed',
    values: { '{{ .OldEmail }}': 'old-address@example.com', '{{ .Email }}': 'new-address@example.com' },
  },
} as const;

type AuthTemplateKey = keyof typeof templates;

async function renderFixture(key: AuthTemplateKey) {
  let html = await readFile(path.join(process.cwd(), 'supabase', 'templates', `${key}.html`), 'utf8');
  for (const [variable, value] of Object.entries(templates[key].values)) html = html.replaceAll(variable, value);
  return html;
}

export default async function AuthEmailPreviewPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { template: requested } = await searchParams;
  const keys = Object.keys(templates) as AuthTemplateKey[];
  const key = keys.includes(requested as AuthTemplateKey) ? requested as AuthTemplateKey : keys[0];
  const html = await renderFixture(key);

  return <main style={{ minHeight: '100vh', padding: 24, background: '#e9e9e5', color: '#151515', fontFamily: 'Arial, sans-serif' }}>
    <h1 style={{ marginTop: 0 }}>44OS Auth email preview</h1>
    <p><a href="/dev/email-preview" style={{ color: '#151515' }}>Application email previews</a></p>
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
      {keys.map(item => <a key={item} href={`/dev/auth-email-preview?template=${item}`} style={{ padding: '8px 10px', background: item === key ? '#151515' : '#fff', color: item === key ? '#fff' : '#151515', textDecoration: 'none' }}>{item}</a>)}
    </nav>
    <p><strong>Subject:</strong> {templates[key].subject}</p>
    <section style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 600px) minmax(280px, 390px)', gap: 24, alignItems: 'start' }}>
      <div><h2>Desktop</h2><iframe title={`${key} desktop`} srcDoc={html} style={{ width: '100%', height: 620, border: '1px solid #bbb', background: '#fff' }} /></div>
      <div><h2>Mobile</h2><iframe title={`${key} mobile`} srcDoc={html} style={{ width: '100%', height: 620, border: '1px solid #bbb', background: '#fff' }} /></div>
    </section>
  </main>;
}
