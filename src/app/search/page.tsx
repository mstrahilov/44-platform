'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell, ProductCard, ProductGrid, ResourceCard, PostCard, EmptyMessage, HubSection } from '@/components/Ui';
import { SocialProfileRow } from '@/components/Social';
import { productStoreHref } from '@/lib/experience';
import type { Product } from '@/lib/products';
import type { CommunityPost, Profile, Resource } from '@/lib/platform';
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
  const query = searchParams.get('q')?.trim() ?? '';
  const [products, setProducts] = useState<Product[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSearchIndex() {
      setLoading(true);
      const [productResult, resourceResult, postResult, profileResult] = await Promise.all([
        supabase
          .from('products')
          .select('*, creators:profiles!author_id(*)')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(120),
        supabase
          .from('resources')
          .select('*, creators:profiles!author_id(*, name:display_name), categories(id, slug, name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(80),
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
      setResources((resourceResult.data as Resource[] | null) ?? []);
      setPosts((postResult.data as CommunityPost[] | null) ?? []);
      setProfiles((profileResult.data as SearchProfile[] | null) ?? []);
      setLoading(false);
    }

    loadSearchIndex();
  }, []);

  const productMatches = useMemo(
    () => products.filter(product => matchesQuery(product, query)).slice(0, 12),
    [products, query],
  );
  const resourceMatches = useMemo(
    () => resources.filter(resource => matchesQuery(resource, query)).slice(0, 8),
    [resources, query],
  );
  const postMatches = useMemo(
    () => posts.filter(post => matchesQuery(post, query)).slice(0, 8),
    [posts, query],
  );
  const profileMatches = useMemo(
    () => profiles.filter(profile => profileMatchesQuery(profile, query)).slice(0, 8),
    [profiles, query],
  );
  const hasResults = productMatches.length + resourceMatches.length + postMatches.length + profileMatches.length > 0;

  return (
    <PageShell>
      <main className="app-page">
        <header className="dashboard-header">
          <div className="dashboard-header-copy">
            <h1 className="os-type-display">Search</h1>
            <p className="os-type-body">
              {query ? `Results for "${query}" across 44OS.` : 'Search releases, books, assets, merch, resources, community posts, and creators.'}
            </p>
          </div>
        </header>

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

            {resourceMatches.length > 0 && (
              <HubSection title="Resources">
                <ProductGrid>
                  {resourceMatches.map(resource => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </ProductGrid>
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
