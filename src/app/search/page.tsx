'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell, ProductCard, ProductGrid, PostCard, EmptyMessage, HubSection } from '@/components/Ui';
import { SocialProfileRow } from '@/components/Social';
import { productStoreHref } from '@/lib/experience';
import type { Product } from '@/lib/products';
import type { CommunityPost, Profile } from '@/lib/platform';
import { creatorHref } from '@/lib/platform';
import { supabase } from '@/lib/supabase';
import { matchesQuery } from '@/lib/taxonomy';

type SearchProfile = Pick<Profile, 'id' | 'slug' | 'username' | 'display_name' | 'avatar_url' | 'bio' | 'role' | 'creator_type'>;

export default function SearchPage() {
  return (
    <Suspense fallback={<PageShell><EmptyMessage>Searching...</EmptyMessage></PageShell>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q')?.trim() ?? '';
  const [draft, setDraft] = useState(query);
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSearchIndex() {
      setLoading(true);
      const [productResult, postResult, profileResult] = await Promise.all([
        supabase
          .from('products')
          .select('*, creators:profiles!author_id(*)')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(120),
        supabase
          .from('posts')
          .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(120),
        supabase
          .from('profiles')
          .select('id, slug, username, display_name, avatar_url, bio, role, creator_type')
          .order('display_name', { ascending: true })
          .limit(120),
      ]);

      setProducts((productResult.data as Product[] | null) ?? []);
      setPosts((postResult.data as CommunityPost[] | null) ?? []);
      setProfiles((profileResult.data as SearchProfile[] | null) ?? []);
      setLoading(false);
    }

    loadSearchIndex();
  }, []);

  useEffect(() => { setDraft(query); }, [query]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  }

  const productMatches = useMemo(
    () => products.filter(product => matchesQuery(product, query)).slice(0, 12),
    [products, query],
  );
  const postMatches = useMemo(
    () => posts.filter(post => matchesQuery(post, query)).slice(0, 8),
    [posts, query],
  );
  const profileMatches = useMemo(
    () => profiles.filter(profile => profileMatchesQuery(profile, query)).slice(0, 8),
    [profiles, query],
  );
  const hasResults = productMatches.length + postMatches.length + profileMatches.length > 0;

  return (
    <PageShell>
      <main className="app-page">
        <header className="dashboard-header">
          <div className="dashboard-header-copy">
            <h1 className="os-type-display">Search</h1>
            <p className="os-type-body">
              {query ? `Results for "${query}" across 44OS.` : 'Search items, creators, and posts.'}
            </p>
          </div>
        </header>

        <form className="settings-field" style={{ maxWidth: 720 }} onSubmit={submitSearch} role="search">
          <div className="settings-field-head">
            <div className="os-type-field-title">Search 44OS</div>
            <p className="os-type-body-small">Find items, creators, and posts.</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--os-space-3)', alignItems: 'center' }}>
            <input
              className="os-input-field"
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder="Search"
              aria-label="Search"
            />
            <button className="os-button os-button-primary" type="submit">Search</button>
          </div>
        </form>

        {loading ? (
          <EmptyMessage>Searching...</EmptyMessage>
        ) : !query ? (
          <EmptyMessage>Type in the topbar search to search across 44OS.</EmptyMessage>
        ) : !hasResults ? (
          <EmptyMessage>No results found.</EmptyMessage>
        ) : (
          <>
            {productMatches.length > 0 && (
              <HubSection title="Items">
                <ProductGrid>
                  {productMatches.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </ProductGrid>
              </HubSection>
            )}

            {profileMatches.length > 0 && (
              <HubSection title="Creators">
                <div className="dashboard-list-surface">
                  {profileMatches.map(profile => (
                    <SocialProfileRow
                      key={profile.id}
                      profile={profile}
                      aside={<Link className="os-button os-button-secondary os-button-compact" href={creatorHref(profile)}>Open</Link>}
                      subtitle={profile.bio || profile.creator_type || '44 Creator'}
                    />
                  ))}
                </div>
              </HubSection>
            )}

            {postMatches.length > 0 && (
              <HubSection title="Posts">
                <div className="app-grid">
                  {postMatches.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </HubSection>
            )}

            {productMatches.length > 0 && (
              <div className="app-tag-row">
                {productMatches.slice(0, 3).map(product => (
                  <Link key={product.id} className="os-button os-button-secondary os-button-compact" href={productStoreHref(product)}>
                    Open {product.title}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </PageShell>
  );
}

function profileMatchesQuery(profile: SearchProfile, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    profile.display_name,
    profile.username,
    profile.slug,
    profile.bio,
    profile.creator_type,
  ].filter(Boolean).join(' ').toLowerCase().includes(normalized);
}
