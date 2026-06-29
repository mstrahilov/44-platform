// src/app/settings/page.tsx

import { PageShell, GlassPanel } from '@/components/Ui';

export default function SettingsPage() {
  return (
    <PageShell>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 0' }}>
        <GlassPanel style={{ padding: 40 }}>
          <h1 style={{ fontSize: 42, fontWeight: 780, marginBottom: 12, letterSpacing: '-0.04em' }}>
            Settings
          </h1>

          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 18 }}>
            Customize your app preferences, appearance, notifications, and connected features.
          </p>
        </GlassPanel>
      </div>
    </PageShell>
  );
}