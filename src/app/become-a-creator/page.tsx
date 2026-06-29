import { PageShell, GlassPanel } from '@/components/Ui';

export default function PlaceholderPage() {
  return (
    <PageShell>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 0' }}>
        <GlassPanel style={{ padding: 40 }}>
          <h1 style={{ fontSize: 42, fontWeight: 780, marginBottom: 12, letterSpacing: '-0.04em' }}>
            Become a Creator
          </h1>
        </GlassPanel>
      </div>
    </PageShell>
  );
}