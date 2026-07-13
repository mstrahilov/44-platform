'use client';

import { useEffect, useState } from 'react';
import { creatorHref } from '@/lib/platform';
import Link from 'next/link';
import { SectionHeader } from '@/components/Ui';
import { listItemUpdates, type ItemUpdate } from '@/lib/domain/itemCommunity';

type ProductUpdate = ItemUpdate;

function resolveAuthor(update: ProductUpdate) {
  return Array.isArray(update.authors) ? update.authors[0] : update.authors;
}

export function ProductUpdatesSection({
  productId,
}: {
  productId: string;
  emptyMessage?: string;
}) {
  const [updates, setUpdates] = useState<ProductUpdate[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUpdates() {
      setError('');
      try {
        setUpdates(await listItemUpdates(productId));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load creator updates.');
        return;
      }
    }

    loadUpdates();
  }, [productId]);

  if (updates.length === 0 && !error) return null;

  return (
    <div className="view-section">
      <SectionHeader title="Creator Updates" />

      {error && <div className="dashboard-status dashboard-status-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="dashboard-list-surface item-domain-surface">
        {updates.map(update => {
          const author = resolveAuthor(update);
          return (
            <article key={update.id} className="product-update-row">
              <div className="product-domain-head">
                <div>
                  <h3 className="os-type-card-title">{update.title}</h3>
                  <div className="product-domain-meta">
                    {author ? (
                      <Link href={creatorHref(author)}>{author.display_name || author.username || '44 Creator'}</Link>
                    ) : (
                      <span>44 Creator</span>
                    )}
                    <span>{formatDate(update.created_at)}</span>
                  </div>
                </div>
                {update.version_label && <span className="os-pill os-status-owned">{update.version_label}</span>}
              </div>
              <p className="os-type-body product-domain-body">{update.body}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
