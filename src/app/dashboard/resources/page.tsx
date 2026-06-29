import Link from 'next/link';
import { PageShell, GlassPanel } from '@/components/Ui';

const resources = [
  { title: 'Publishing Your First Release', status: 'Published', type: 'Guide' },
  { title: 'Unity API Integration', status: 'Draft', type: 'Documentation' },
  { title: 'Building Interactive Albums', status: 'Planning', type: 'Article' },
];

export default function DashboardResourcesPage() {
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
              Resources
            </h1>

            <p style={{ color: 'rgba(255,255,255,.62)', fontSize: 18 }}>
              Manage guides, articles, and creator documentation.
            </p>
          </div>

          <Link className="btn-primary" href="/dashboard/resources/new">
            New Resource
          </Link>
        </div>

        <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
          {resources.map((resource, index) => (
            <div
              key={resource.title}
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
                  {resource.title}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    fontSize: 13,
                    color: 'rgba(255,255,255,.48)',
                  }}
                >
                  Resource
                </div>
              </div>

              <div style={{ color: 'rgba(255,255,255,.58)', fontSize: 14 }}>
                {resource.type}
              </div>

              <div
                style={{
                  justifySelf: 'end',
                  borderRadius: 999,
                  padding: '7px 12px',
                  background: 'rgba(255,255,255,.07)',
                  color: 'rgba(255,255,255,.68)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {resource.status}
              </div>
            </div>
          ))}
        </GlassPanel>
      </div>
    </PageShell>
  );
}