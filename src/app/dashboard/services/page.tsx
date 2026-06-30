import Link from 'next/link';
import { PageShell, GlassPanel } from '@/components/Ui';

const services = [
  { title: 'Album Mixing', status: 'Published', type: 'Audio' },
  { title: 'Creative Direction', status: 'Draft', type: 'Consulting' },
  { title: 'Brand Identity', status: 'Planning', type: 'Design' },
];

export default function DashboardServicesPage() {
  return (
    <PageShell>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '64px 0' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 48,
                fontWeight: 780,
                letterSpacing: '-0.04em',
                marginBottom: 10,
              }}
            >
              Services
            </h1>

            <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18 }}>
              Manage the services you offer through 44.
            </p>
          </div>

          <Link className="btn-primary" href="/dashboard/services/new">
            New Service
          </Link>
        </div>

        <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
          {services.map((service, index) => (
            <div
              key={service.title}
              style={{
                padding: '22px 26px',
                display: 'grid',
                gridTemplateColumns: '1fr 140px 120px',
                gap: 20,
                alignItems: 'center',
                borderTop:
                  index === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 720 }}>
                  {service.title}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    fontSize: 13,
                    color: 'var(--os-color-ink-muted)',
                  }}
                >
                  Service
                </div>
              </div>

              <div style={{ color: 'var(--os-color-ink-secondary)', fontSize: 14 }}>
                {service.type}
              </div>

              <div
                style={{
                  justifySelf: 'end',
                  borderRadius: 999,
                  padding: '7px 12px',
                  background: 'rgba(255,255,255,.07)',
                  color: 'var(--os-color-ink-secondary)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {service.status}
              </div>
            </div>
          ))}
        </GlassPanel>
      </div>
    </PageShell>
  );
}