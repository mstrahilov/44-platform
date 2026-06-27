'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref, formatProductPrice, productMeta } from '@/lib/products';
import type { SavedResource, ServiceRequest } from '@/lib/platform';

type VaultTab = 'products' | 'resources' | 'services';

interface LibraryItem {
  id: string;
  product_id: string;
  acquisition_type: string;
  acquired_at: string;
  products: Product | null;
}

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeVault, setActiveVault] = useState<VaultTab>('products');
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [savedResources, setSavedResources] = useState<SavedResource[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      Promise.resolve().then(() => {
        setLibraryItems([]);
        setSavedResources([]);
        setServiceRequests([]);
        setLoading(false);
        setError(null);
      });
      return;
    }

    async function fetchVault(userId: string) {
      setLoading(true);
      setError(null);

      const [{ data: products, error: productsError }, { data: resources }, { data: requests }] = await Promise.all([
        supabase
          .from('library_items')
          .select('id,product_id,acquisition_type,acquired_at,products(*)')
          .eq('user_id', userId)
          .order('acquired_at', { ascending: false }),
        supabase
          .from('saved_resources')
          .select('id,resource_id,saved_at,resources(*, creators(id, slug, name, avatar_url), categories(id, slug, name))')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false }),
        supabase
          .from('service_requests')
          .select('id,service_id,message,status,created_at,services(*, creators(id, slug, name, avatar_url), categories(id, slug, name))')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (productsError) {
        setError(`${productsError.message}. Run the clean Supabase reset SQL, then refresh.`);
      }

      setLibraryItems((products as LibraryItem[] | null) ?? []);
      setSavedResources((resources as SavedResource[] | null) ?? []);
      setServiceRequests((requests as ServiceRequest[] | null) ?? []);
      setLoading(false);
    }

    fetchVault(user.id);
  }, [authLoading, user]);

  if (authLoading || loading) {
    return <CenteredMessage>Loading...</CenteredMessage>;
  }

  if (!user) {
    return <CenteredMessage>Sign in to view your library</CenteredMessage>;
  }

  if (error) {
    return <CenteredMessage>{error}</CenteredMessage>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: 14, padding: '0 28px 56px', width: '100%', maxWidth: 1440, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(24px)', borderRadius: 9999, padding: 5 }}>
          <VaultButton active={activeVault === 'products'} onClick={() => setActiveVault('products')}>Products</VaultButton>
          <VaultButton active={activeVault === 'resources'} onClick={() => setActiveVault('resources')}>Resources</VaultButton>
          <VaultButton active={activeVault === 'services'} onClick={() => setActiveVault('services')}>Services</VaultButton>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)' }}>Personal Vault</div>
      </div>

      {activeVault === 'products' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', alignContent: 'start', gap: 14 }}>
          {libraryItems.length === 0 ? (
            <EmptyPanel title="Your product library is empty" body="Add a free product from the Store or Browse page to test ownership." href="/browse" action="Browse Store" />
          ) : (
            libraryItems.map(item => item.products && (
              <ProductVaultCard key={item.id} product={item.products} acquiredAt={item.acquired_at} />
            ))
          )}
        </div>
      )}

      {activeVault === 'resources' && (
        <VaultGrid
          empty={<EmptyPanel title="No saved resources yet" body="Save guides, templates, lessons, or checklists from Community Resources." href="/resources" action="Browse Resources" />}
          items={savedResources.map(item => ({
            id: item.id,
            title: item.resources?.title ?? 'Saved resource',
            eyebrow: item.resources?.categories?.name ?? item.resources?.resource_type ?? 'Resource',
            body: item.resources?.summary ?? item.resources?.body ?? 'No description yet.',
            meta: item.saved_at ? `Saved ${new Date(item.saved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Saved',
          }))}
        />
      )}

      {activeVault === 'services' && (
        <VaultGrid
          empty={<EmptyPanel title="No service requests yet" body="When you contact a creator for a service, the request will appear here." href="/services/browse" action="Browse Services" />}
          items={serviceRequests.map(item => ({
            id: item.id,
            title: item.services?.title ?? 'Service request',
            eyebrow: item.status,
            body: item.message || item.services?.description || 'No message added.',
            meta: item.created_at ? `Requested ${new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Requested',
          }))}
        />
      )}
    </div>
  );
}

function ProductVaultCard({ product, acquiredAt }: { product: Product; acquiredAt: string }) {
  return (
    <article style={{ minHeight: 250, borderRadius: 22, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.045)', backdropFilter: 'blur(24px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 120, background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {product.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </div>
      <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>{productMeta(product)}</div>
        <div style={{ fontSize: 22, fontWeight: 760, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6 }}>{product.title}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>by {product.creator}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {(product.tags ?? []).slice(0, 4).map(tag => (
            <Link key={tag} href={browseHref({ tag })} className="chip">{tag}</Link>
          ))}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 650, color: 'rgba(255,255,255,0.32)' }}>Added {new Date(acquiredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: product.is_free ? '#93FF00' : '#fff' }}>{formatProductPrice(product)}</div>
        </div>
      </div>
    </article>
  );
}

function VaultGrid({ items, empty }: { items: { id: string; title: string; eyebrow: string; body: string; meta: string }[]; empty: React.ReactNode }) {
  if (items.length === 0) return <>{empty}</>;

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignContent: 'start', gap: 14 }}>
      {items.map(item => (
        <article key={item.id} style={{ minHeight: 190, borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.045)', backdropFilter: 'blur(24px)', padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div className="chip" style={{ alignSelf: 'flex-start', marginBottom: 14 }}>{item.eyebrow}</div>
          <div style={{ fontSize: 22, fontWeight: 760, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 10 }}>{item.title}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.50)', lineHeight: 1.65, flex: 1 }}>{item.body}</div>
          <div style={{ fontSize: 11, fontWeight: 650, color: 'rgba(255,255,255,0.32)', marginTop: 18 }}>{item.meta}</div>
        </article>
      ))}
    </div>
  );
}

function EmptyPanel({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <div style={{ gridColumn: '1 / -1', minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 24, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', textAlign: 'center', padding: 28 }}>
      <div>
        <div style={{ fontSize: 28, fontWeight: 760, color: '#fff', letterSpacing: '-0.03em', marginBottom: 10 }}>{title}</div>
        <div style={{ maxWidth: 420, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.46)', lineHeight: 1.65, marginBottom: 18 }}>{body}</div>
        <Link className="btn-primary" href={href}>{action}</Link>
      </div>
    </div>
  );
}

function VaultButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ border: `1px solid ${active ? 'rgba(255,255,255,0.18)' : 'transparent'}`, background: active ? 'rgba(255,255,255,0.13)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.38)', borderRadius: 9999, padding: '9px 18px', fontFamily: 'inherit', fontSize: 11, fontWeight: 750, letterSpacing: '0.10em', textTransform: 'uppercase', cursor: 'pointer' }}
    >
      {children}
    </button>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.30)', fontSize: 13, fontWeight: 500, textAlign: 'center', padding: 24 }}>
      {children}
    </div>
  );
}
