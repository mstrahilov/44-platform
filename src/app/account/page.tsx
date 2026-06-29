// src/app/account/page.tsx

import { PageShell, GlassPanel } from '@/components/Ui';

export default function AccountPage() {
  return (
    <PageShell>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 0' }}>
        <GlassPanel style={{ padding: 40 }}>
          <h1 style={{ fontSize: 42, fontWeight: 780, marginBottom: 12, letterSpacing: '-0.04em' }}>
            Account
          </h1>

          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 18 }}>
            Manage your email, security, billing, and account details.
          </p>
        </GlassPanel>
      </div>
    </PageShell>
  );
}