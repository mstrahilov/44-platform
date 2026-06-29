import { PageShell, GlassPanel } from '@/components/Ui';

export default function NewProductPage() {
  return (
    <PageShell>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '64px 0' }}>
        <h1 style={{ fontSize: 48, fontWeight: 780, letterSpacing: '-0.04em', marginBottom: 10 }}>
          New Resource
        </h1>

        <p style={{ color: 'rgba(255,255,255,.62)', fontSize: 18, marginBottom: 32 }}>
          Create a release, asset, book, apparel item, or interactive experience.
        </p>

        <GlassPanel style={{ padding: 32 }}>
          <div style={{ display: 'grid', gap: 22 }}>
            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Resource Title</div>
              <input className="input" placeholder="Enter product title" />
            </label>

            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Category</div>
              <select className="input">
                <option>Music Production</option>
                <option>Video Production</option>
                <option>Graphic Design</option>
                <option>Web Development</option>
                <option>Game Development</option>
                <option>Marketing</option>
              </select>
            </label>

            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Summary</div>
              <textarea className="input" rows={4} placeholder="Describe what this product is." />
            </label>

            <label>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Resource Type</div>
              <input className="input" placeholder="" />
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