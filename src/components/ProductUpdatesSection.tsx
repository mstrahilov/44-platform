'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { creatorHref, type Profile } from '@/lib/platform';
import Link from 'next/link';

type UpdateProfile = Pick<Profile, 'id' | 'slug' | 'username' | 'display_name' | 'avatar_url'>;

type ProductUpdate = {
  id: string;
  product_id: string;
  author_id: string;
  title: string;
  body: string;
  version_label: string | null;
  status: string;
  created_at: string;
  authors?: UpdateProfile | UpdateProfile[] | null;
};

function resolveAuthor(update: ProductUpdate) {
  return Array.isArray(update.authors) ? update.authors[0] : update.authors;
}

export function ProductUpdatesSection({
  productId,
  emptyMessage = 'No updates from the creator yet.',
}: {
  productId: string;
  emptyMessage?: string;
}) {
  const [updates, setUpdates] = useState<ProductUpdate[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUpdates() {
      setError('');
      const { data, error: loadError } = await supabase
        .from('product_updates')
        .select('id,product_id,author_id,title,body,version_label,status,created_at,authors:profiles!author_id(id,slug,username,display_name,avatar_url)')
        .eq('product_id', productId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (loadError) {
        setError(loadError.message);
        return;
      }

      setUpdates((data as ProductUpdate[] | null) ?? []);
    }

    loadUpdates();
  }, [productId]);

  return (
    <div className="view-section">
      <div className="item-community-header" style={{ marginBottom: 16 }}>
        <h2 className="view-section-title" style={{ margin: 0 }}>Creator Updates</h2>
      </div>

      {error && <div className="dashboard-status dashboard-status-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="dashboard-list-surface item-domain-surface">
        {updates.length === 0 ? (
          <div className="dashboard-empty">{emptyMessage}</div>
        ) : (
          updates.map(update => {
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
          })
        )}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
