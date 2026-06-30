'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PageShell } from '@/components/Ui';

type Product = {
  id: string;
  title: string;
  price_cents?: number | null;
  is_free?: boolean | null;
  cover_url?: string | null;
  hero_url?: string | null;
  slug?: string | null;
  category?: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  music: 'Music',
  books: 'Books',
  games: 'Games',
  apparel: 'Apparel',
  merch: 'Merch',
  assets: 'Assets',
};

export default function StoreCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const label = CATEGORY_LABEL[category] ?? (category.charAt(0).toUpperCase() + category.slice(1));
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, price_cents, is_free, cover_url, hero_url, slug, category')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(120);

      if (error) {
        console.error('store/[category] fetch error:', JSON.stringify(error));
        setLoading(false);
        return;
      }

      const all = (data ?? []) as Product[];
      const filtered = all.filter(p =>
        (p.category ?? '').toLowerCase() === category.toLowerCase()
      );
      setProducts(filtered.length > 0 ? filtered : all.slice(0, 48));
      setLoading(false);
    }
    load();
  }, [category]);

  return (
    <PageShell>
      <style>{`
        .cat-page { display: flex; flex-direction: column; gap: 24px; }
        .cat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px;
        }
        .cat-card {
          display: flex; flex-direction: column;
          border-radius: 14px; overflow: hidden;
          background: var(--os-glass-panel-bg);
          border: 1px solid var(--os-glass-panel-border);
          box-shadow: var(--os-glass-shadow), var(--os-glass-highlight);
          backdrop-filter: blur(28px) saturate(1.6);
          -webkit-backdrop-filter: blur(28px) saturate(1.6);
          text-decoration: none; color: var(--os-color-ink);
          transition: transform 120ms ease, box-shadow 120ms ease;
        }
        .cat-card:hover { transform: translateY(-2px); }
        .cat-card-art {
          aspect-ratio: 1; overflow: hidden;
          background: var(--os-glass-recessed-bg);
        }
        .cat-card-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cat-card-body { padding: 12px; display: flex; flex-direction: column; gap: 4px; }
        .cat-card-title { font-size: 13px; font-weight: 600; line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .cat-card-price { font-size: 12px; color: var(--os-color-ink-secondary); }
        .cat-empty { padding: 48px 24px; text-align: center; color: var(--os-color-ink-muted); }
      `}</style>
      <div className="cat-page">
        <h1 className="browse-page-title os-type-display">{label}</h1>
        {loading ? (
          <div className="cat-empty os-type-body">Loading…</div>
        ) : products.length === 0 ? (
          <div className="cat-empty os-type-body">No {label.toLowerCase()} yet.</div>
        ) : (
          <div className="cat-grid">
            {products.map(p => {
              const img = p.cover_url ?? p.hero_url;
              const price = p.is_free ? 'Free' : p.price_cents ? `$${Math.round(p.price_cents / 100)}` : 'Free';
              const href = `/product/${p.slug ?? p.id}`;
              return (
                <Link key={p.id} href={href} className="cat-card">
                  <div className="cat-card-art">
                    {img && <img src={img} alt="" />}
                  </div>
                  <div className="cat-card-body">
                    <div className="cat-card-title">{p.title}</div>
                    <div className="cat-card-price">{price}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
