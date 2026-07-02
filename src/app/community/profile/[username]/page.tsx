'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Profile, Resource, Service, CommunityPost } from '@/lib/platform';
import type { Product } from '@/lib/products';
import { PageShell, CenteredMessage } from '@/components/Ui';
import { getOwnershipKeys } from '@/lib/studioProfiles';
import { useTopbarBack } from '@/components/TopbarContext';

type ProfileTab = 'feed' | 'products' | 'services' | 'resources';

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  useTopbarBack({ href: '/community', label: 'Community' });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [tab, setTab] = useState<ProfileTab>('feed');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfilePage() {
      setLoading(true);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.eq.${username},slug.eq.${username}`)
        .maybeSingle();

      const resolvedProfile = (profileData as Profile | null) ?? null;
      setProfile(resolvedProfile);

      if (!resolvedProfile) {
        setProducts([]);
        setServices([]);
        setResources([]);
        setPosts([]);
        setLoading(false);
        return;
      }

      const profileId = resolvedProfile.id;
      const ownershipProfile = {
        id: resolvedProfile.id,
        display_name: resolvedProfile.display_name ?? null,
        username: resolvedProfile.username ?? null,
        role: resolvedProfile.role ?? null,
        slug: resolvedProfile.slug ?? null,
        avatar_url: resolvedProfile.avatar_url ?? null,
        bio: resolvedProfile.bio ?? null,
        creator_type: resolvedProfile.creator_type ?? null,
      };
      const { ids } = getOwnershipKeys(ownershipProfile, profileId);

      const [productResult, serviceResult, resourceResult, postResult] = await Promise.all([
        supabase
          .from('products')
          .select('*, creators:profiles!author_id(id, slug, username, display_name, avatar_url)')
          .eq('author_id', profileId)
          .order('created_at', { ascending: false }),
        supabase
          .from('services')
          .select('*, creators:profiles!author_id(id, slug, username, name:display_name, avatar_url)')
          .eq('author_id', profileId)
          .order('created_at', { ascending: false }),
        supabase
          .from('resources')
          .select('*, creators:profiles!author_id(id, slug, username, name:display_name, avatar_url)')
          .eq('author_id', profileId)
          .order('created_at', { ascending: false }),
        supabase
          .from('posts')
          .select('*, creators:profiles!author_id(id, slug, username, name:display_name, avatar_url), categories(id, slug, name)')
          .in('author_id', ids)
          .order('created_at', { ascending: false }),
      ]);

      setProducts(((productResult.data as Product[] | null) ?? []).filter(Boolean));
      setServices(((serviceResult.data as Service[] | null) ?? []).filter(Boolean));
      setResources(((resourceResult.data as Resource[] | null) ?? []).filter(Boolean));
      setPosts(((postResult.data as CommunityPost[] | null) ?? []).filter(Boolean));
      setLoading(false);
    }

    loadProfilePage();
  }, [username]);

  const isOwn = user?.id === profile?.id;
  const tabs = useMemo(
    () => [
      { id: 'feed' as const, label: 'Feed' },
      { id: 'products' as const, label: 'Releases' },
      { id: 'services' as const, label: 'Services' },
      { id: 'resources' as const, label: 'Resources' },
    ],
    [],
  );

  if (loading) {
    return <PageShell><CenteredMessage>Loading…</CenteredMessage></PageShell>;
  }

  if (!profile) {
    return <PageShell><CenteredMessage>Profile not found</CenteredMessage></PageShell>;
  }

  const displayName = profile.display_name ?? profile.username ?? 'Member';

  return (
    <PageShell>
      <section
        className="profile-hero"
        style={{
          backgroundImage: profile.hero_url ? `url(${profile.hero_url})` : undefined,
        }}
      >
        {profile.hero_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.hero_url} alt="" />
        )}
      </section>

      <section className="app-panel profile-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div className="app-inspector-art app-inspector-art-circle" style={{ width: 96, height: 96, flex: '0 0 auto' }}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={displayName} />
              ) : (
                <span style={{ fontSize: 34, fontWeight: 700 }}>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="app-detail-eyebrow os-type-eyebrow">
                {profile.creator_type ?? (profile.role === 'creator' ? 'Creator' : 'Member')}
              </div>
              <h1 className="app-detail-title os-type-page-title" style={{ marginTop: 6 }}>
                {displayName}
              </h1>
              <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 8 }}>
                {profile.bio || 'This member has not added a bio yet.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {isOwn ? (
              <Link href="/settings" className="os-button os-button-primary">Edit Profile</Link>
            ) : (
              <>
                <button type="button" className="os-button os-button-primary">Follow</button>
                <Link href="/inbox" className="os-button os-button-secondary">Message</Link>
              </>
            )}
          </div>
        </div>

        <div className="app-tag-row">
          {tabs.map(item => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'os-button os-button-primary os-button-compact' : 'os-button os-button-ghost os-button-compact'}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {tab === 'feed' && (
        <StackList
          title="Feed"
          empty="No updates yet."
          items={posts.map(post => ({
            id: post.id,
            title: post.title,
            body: post.body || 'Community update',
            meta: formatDate(post.created_at),
            href: post.id ? `/community/thread/${post.slug || post.id}` : undefined,
          }))}
        />
      )}

      {tab === 'products' && (
        <StackList
          title="Releases"
          empty="No releases published yet."
          items={products.map(product => ({
            id: product.id,
            title: product.title,
            body: product.short_description || product.long_description || 'Release',
            meta: product.product_type || product.category || 'Product',
            href: `/product/${product.slug || product.id}`,
          }))}
        />
      )}

      {tab === 'services' && (
        <StackList
          title="Services"
          empty="No services published yet."
          items={services.map(service => ({
            id: service.id,
            title: service.title,
            body: service.short_description || service.long_description || 'Service',
            meta: service.service_type || 'Service',
            href: `/service/${service.slug || service.id}`,
          }))}
        />
      )}

      {tab === 'resources' && (
        <StackList
          title="Resources"
          empty="No resources published yet."
          items={resources.map(resource => ({
            id: resource.id,
            title: resource.title,
            body: resource.short_description || resource.long_description || 'Resource',
            meta: resource.resource_type || 'Resource',
            href: `/resources/${resource.slug || resource.id}`,
          }))}
        />
      )}
    </PageShell>
  );
}

function StackList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; body: string; meta: string; href?: string }>;
}) {
  return (
    <section className="app-panel" style={{ display: 'grid', gap: 'var(--os-space-4)' }}>
      <div className="app-panel-title os-type-eyebrow">{title}</div>
      {items.length ? (
        items.map(item => {
          const content = (
            <div key={item.id} className="app-panel" style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <div className="os-type-section-title">{item.title}</div>
                <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)', flexShrink: 0 }}>{item.meta}</div>
              </div>
              <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>{item.body}</p>
            </div>
          );

          return item.href ? (
            <Link key={item.id} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              {content}
            </Link>
          ) : content;
        })
      ) : (
        <div className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>{empty}</div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
