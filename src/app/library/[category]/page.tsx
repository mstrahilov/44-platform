'use client';

import { useParams } from 'next/navigation';
import { PageShell } from '@/components/Ui';

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const label = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <PageShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
        <h1 className="os-type-display">{label}</h1>
        <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
          {label} content coming soon.
        </p>
      </div>
    </PageShell>
  );
}
