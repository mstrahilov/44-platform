'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell, ProductCard, ProductGrid, EmptyMessage, HubSection, HubHero } from '@/components/Ui';
import { SocialAvatar, SocialPostRow } from '@/components/Social';
import type { Product } from '@/lib/products';
import type { Profile } from '@/lib/platform';
import { creatorHref } from '@/lib/platform';
import { supabase } from '@/lib/supabase';
import { matchesQuery } from '@/lib/taxonomy';
import type { SocialPost } from '@/lib/social';

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
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSearchIndex() {
      setLoading(true);
      const [productResult, postResult, profileResult] = await Promise.all([
        supabase
          .from('products')
          .select('*, creators:profiles!author_id(*)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(120),
        supabase
          .from('posts')
          .select('*, creators:profiles!author_id(id, slug, username, display_name, name:display_name, avatar_url, role, creator_type)')
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
      setPosts((postResult.data as SocialPost[] | null) ?? []);
      setProfiles((profileResult.data as SearchProfile[] | null) ?? []);
      setLoading(false);
    }

    loadSearchIndex();
  }, []);

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
      <main className="app-page">
        <HubHero
          title="Search"
          copy={query ? `Results for "${query}".` : 'Find items, creators, posts, questions, and collaborations.'}
        />

        <form className="search-page-form" onSubmit={submitSearch} role="search">
          <div className="search-page-input-wrap">
            <input
              className="search-page-input"
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder="Search items, creators, and posts"
              aria-label="Search"
            />
            <button className="search-page-submit" type="submit" aria-label="Search">
              <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
            </button>
          </div>
        </form>

        {loading ? (
          <EmptyMessage>Searching...</EmptyMessage>
        ) : !query ? (
          <EmptyMessage>Enter a search term to look across items, creators, and posts.</EmptyMessage>
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
                        <span className="social-note os-type-body-small">{profile.bio || profile.creator_type || '44 Creator'}</span>
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
