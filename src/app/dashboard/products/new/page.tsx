import { PageShell, GlassPanel } from '@/components/Ui';

export default function NewProductPage() {
  return (
    <PageShell>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '64px 0' }}>
        <h1 style={{ fontSize: 48, fontWeight: 780, letterSpacing: '-0.04em', marginBottom: 10 }}>
          New Product
        </h1>

        <p style={{ color: 'var(--os-color-ink-secondary)', fontSize: 18, marginBottom: 32 }}>
          Create a release, asset, book, apparel item, or interactive experience.
        </p>

        <GlassPanel style={{ padding: 32 }}>
          <div style={{ display: 'grid', gap: 22 }}>
            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Product Title</div>
              <input className="input" placeholder="Example: ØLSTEN Flagship Release" />
            </label>

            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Category</div>
              <select className="input">
                <option>Music</option>
                <option>Games</option>
                <option>Books</option>
                <option>Apparel</option>
                <option>Assets</option>
              </select>
            </label>

            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Short Description</div>
              <textarea className="input" rows={4} placeholder="Describe what this product is." />
            </label>

            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Price</div>
              <input className="input" placeholder="$0.00" />
            </label>

            <button className="btn-primary" type="button" style={{ justifySelf: 'start' }}>
              Save Draft
            </button>
          </div>
        </GlassPanel>
      </div>
    </PageShell>
  );
}