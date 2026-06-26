'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '@/lib/products';
import { browseHref, formatProductPrice, productMeta } from '@/lib/products';

interface ProductCardProps {
  product: Product;
  owned?: boolean;
  onGet?: (product: Product) => void;
}

export default function ProductCard({ product, owned = false, onGet }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const canOpenProduct = !product.id.startsWith('fallback-');

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'border-color 150ms ease, background 150ms ease, transform 150ms ease',
      }}
    >
      {canOpenProduct ? (
        <Link href={`/product/${product.id}`} style={{ display: 'block' }}>
          <ProductArt product={product} />
        </Link>
      ) : (
        <ProductArt product={product} />
      )}

      <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Link href={browseHref({ category: product.category })} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: 4 }}>{productMeta(product)}</Link>
        {canOpenProduct ? (
          <Link href={`/product/${product.id}`} style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 2, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {product.title}
          </Link>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 2, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</div>
        )}
        <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>{product.creator}</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {(product.tags ?? []).slice(0, 2).map(tag => (
            <Link
              key={tag}
              href={browseHref({ tag })}
              style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 5, padding: '2px 6px', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.34)', lineHeight: 1.2 }}
            >
              {tag}
            </Link>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: product.is_free ? '#93FF00' : 'rgba(255,255,255,0.90)' }}>{formatProductPrice(product)}</div>
          <button
            onClick={() => onGet?.(product)}
            disabled={owned || !onGet}
            style={{
              background: 'rgba(255,255,255,0.09)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 9999,
              padding: '4px 12px',
              fontFamily: 'inherit',
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.70)',
              cursor: owned || !onGet ? 'default' : 'pointer',
              letterSpacing: '0.04em',
              opacity: owned || !onGet ? 0.6 : 1,
            }}
          >
            {owned ? 'Owned' : product.is_free ? 'Get' : 'View'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductArt({ product }: { product: Product }) {
  return (
    <div style={{ width: '100%', aspectRatio: '1', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      {product.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}
    </div>
  );
}
