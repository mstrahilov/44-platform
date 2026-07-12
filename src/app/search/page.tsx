'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell, ProductCard, ProductGrid, EmptyMessage, HubSection, HubHero } from '@/components/Ui';
import { SocialAvatar, SocialPostRow } from '@/components/Social';
import type { Product } from '@/lib/products';
import { creatorHref } from '@/lib/platform';
import { matchesQuery } from '@/lib/taxonomy';
import type { SocialPost } from '@/lib/social';
import { loadPlatformSearchIndex, type SearchProfile } from '@/lib/domain/search';

type SearchIndex = {
  products: Product[];
  posts: SocialPost[];
  profiles: SearchProfile[];
};

let searchIndexCache: SearchIndex | null = null;
let searchIndexRequest: Promise<SearchIndex> | null = null;

function loadSearchIndex() {
  if (searchIndexCache) return Promise.resolve(searchIndexCache);
  if (searchIndexRequest) return searchIndexRequest;

  searchIndexRequest = loadPlatformSearchIndex().then(index => {
    searchIndexCache = index;
    return index;
  }).finally(() => {
    searchIndexRequest = null;
  });

  return searchIndexRequest;
}

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
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [loading, setLoading] = useState(Boolean(query));

  useEffect(() => {
    let alive = true;
    if (!query) {
      Promise.resolve().then(() => {
        if (alive) setLoading(false);
      });
      return () => { alive = false; };
    }

    void Promise.resolve().then(async () => {
      if (!alive) return;
      setLoading(true);
      const index = await loadSearchIndex();
      if (!alive) return;
      setProducts(index.products);
      setPosts(index.posts);
      setProfiles(index.profiles);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [query]);

  useEffect(() => {
    Promise.resolve().then(() => setDraft(query));
  }, [query]);

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
      <main className="app-page search-page">
        <HubHero
          title="Search"
          copy={query ? `Results for "${query}".` : 'Find items, creators, posts, questions, and collaborations.'}
        />

        <form className="page-search-control search-page-form" onSubmit={submitSearch} role="search">
          <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
          <input
            value={draft}
            onChange={event => setDraft(event.target.value)}
            placeholder=""
            aria-label="Search"
          />
        </form>

        {loading ? (
          <EmptyMessage>Searching...</EmptyMessage>
        ) : !query ? (
          <EmptyMessage>Enter any term to start a search.</EmptyMessage>
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
                <div className="search-profile-list">
                  {profileMatches.map(profile => (
                    <Link
                      key={profile.id}
                      href={creatorHref(profile)}
                      className="search-profile-row"
                    >
                      <SocialAvatar profile={profile} />
                      <span className="search-profile-copy">
                        <span className="social-author-name">{profile.display_name || profile.username || '44 Creator'}</span>
                        {profile.username && <span className="social-handle">@{profile.username}</span>}
                      </span>
                    </Link>
                  ))}
                </div>
              </HubSection>
            )}

            {postMatches.length > 0 && (
              <HubSection title="Posts">
                <div className="social-feed">
                  {postMatches.map(post => (
                    <SocialPostRow key={post.id} post={post} showTitle handleOnly={false} />
                  ))}
                </div>
              </HubSection>
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
