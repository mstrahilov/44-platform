import { PageShell, GlassPanel } from '@/components/Ui';

export default function DashboardPlaceholder() {
  return (
    <PageShell>
      <div
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: '64px 0',
        }}
      >
        <GlassPanel
          style={{
            padding: 40,
          }}
        >
          <h1
            style={{
              fontSize: 42,
              fontWeight: 780,
              marginBottom: 12,
              letterSpacing: '-0.04em',
            }}
          >
            Payouts
          </h1>

          <p
            style={{
              color: 'var(--os-color-ink-secondary)',
              fontSize: 18,
            }}
          >
            This page is ready to be built.
          </p>
        </GlassPanel>
      </div>
    </PageShell>
  );
}