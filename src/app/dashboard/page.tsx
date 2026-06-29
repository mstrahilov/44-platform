import Link from 'next/link';
import { PageShell, GlassPanel } from '@/components/Ui';

const sections = [
  {
    title: 'Products',
    description: 'Manage products and releases.',
    href: '/dashboard/products',
  },
  {
    title: 'Services',
    description: 'Offer creative services.',
    href: '/dashboard/services',
  },
  {
    title: 'Resources',
    description: 'Publish guides and articles.',
    href: '/dashboard/resources',
  },
  {
    title: 'Analytics',
    description: 'View product performance.',
    href: '/dashboard/analytics',
  },
  {
    title: 'Orders',
    description: 'Manage customer orders.',
    href: '/dashboard/orders',
  },
  {
    title: 'Payouts',
    description: 'View earnings and payouts.',
    href: '/dashboard/payouts',
  },
  {
    title: 'Settings',
    description: 'Manage creator settings.',
    href: '/dashboard/settings',
  },
];

export default function DashboardPage() {
  return (
    <PageShell>
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '64px 0',
        }}
      >
        <h1
          style={{
            fontSize: 48,
            fontWeight: 780,
            marginBottom: 12,
            letterSpacing: '-0.04em',
          }}
        >
          Creator Dashboard
        </h1>

        <p
          style={{
            color: 'rgba(255,255,255,.65)',
            fontSize: 18,
            marginBottom: 40,
          }}
        >
          Manage everything you publish on 44.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
            gap: 20,
          }}
        >
          {sections.map(section => (
            <Link
              key={section.href}
              href={section.href}
              style={{ textDecoration: 'none' }}
            >
              <GlassPanel
                style={{
                  padding: 28,
                  height: '100%',
                  cursor: 'pointer',
                }}
              >
                <h2
                  style={{
                    fontSize: 24,
                    marginBottom: 8,
                  }}
                >
                  {section.title}
                </h2>

                <p
                  style={{
                    color: 'rgba(255,255,255,.6)',
                  }}
                >
                  {section.description}
                </p>
              </GlassPanel>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}