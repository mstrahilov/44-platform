'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { PageShell, HubHero, EmptyMessage, SectionHeader } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { useAuth } from '@/lib/useAuth';
import { comparePublicCatalogItems, type Product } from '@/lib/products';
import { getProductExperience } from '@/lib/experience';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { STUDIO_CATALOG_SECTIONS } from '@/lib/studioCatalog';
import { getCreatorCatalogOverview, listCreatorSubmissionStatuses, type StudioCatalogHealth, type StudioLibraryMetric, type StudioSubmissionStatus } from '@/lib/domain/studio';
import { formatEventDate } from '@/lib/eventTime';
import { beatReviewSurfacesEnabled } from '@/lib/domain/beats';
import { listCreatorEvents, type CreatorEvent } from '@/lib/domain/events';
import { listCreatorUpdates, type CreatorUpdate } from '@/lib/domain/itemCommunity';

type LibraryMetricRow = StudioLibraryMetric;

type OverviewState = {
  products: Product[];
  libraryItems: LibraryMetricRow[];
  totalPlays: number;
  catalogHealth: StudioCatalogHealth[];
  events: CreatorEvent[];
  submissions: StudioSubmissionStatus[];
  updates: CreatorUpdate[];
  metricsError: string;
};

export default function StudioPage() {
  const { user, loading } = useAuth();
  const [studioStatus, setStudioStatus] = useState<string | null>(() => (
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('studioStatus')
  ));
  const [profile, setProfile] = useState<StudioProfile | null>(null);

  useEffect(() => {
    if (!studioStatus) return;
    const timeout = window.setTimeout(() => setStudioStatus(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [studioStatus]);
  const [overview, setOverview] = useState<OverviewState>({
    products: [],
    libraryItems: [],
    totalPlays: 0,
    catalogHealth: [],
    events: [],
    submissions: [],
    updates: [],
    metricsError: '',
  });

  useEffect(() => {
    async function fetchOverview() {
      if (!user) return;

      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      let productRows: Product[] = [];
      let libraryItems: LibraryMetricRow[] = [];
      let totalPlays = 0;
      let catalogHealth: StudioCatalogHealth[] = [];
      let events: CreatorEvent[] = [];
      let submissions: StudioSubmissionStatus[] = [];
      let updates: CreatorUpdate[] = [];
      let metricsError = '';
      try {
        const result = await getCreatorCatalogOverview(profileId);
        productRows = result.items;
        libraryItems = result.libraryItems;
        totalPlays = result.totalPlays;
        catalogHealth = result.catalogHealth;
      } catch (overviewError) {
        metricsError = overviewError instanceof Error ? overviewError.message : 'Could not load Studio metrics.';
      }
      try {
        events = (await listCreatorEvents(user.id)).filter(event => event.lifecycle_state !== 'removed');
      } catch (eventsError) {
        const eventMessage = eventsError instanceof Error ? eventsError.message : 'Could not load Studio events.';
        metricsError = metricsError ? `${metricsError} ${eventMessage}` : eventMessage;
      }
      try {
        submissions = await listCreatorSubmissionStatuses(profileId);
      } catch (submissionError) {
        const submissionMessage = submissionError instanceof Error ? submissionError.message : 'Could not load submission statuses.';
        metricsError = metricsError ? `${metricsError} ${submissionMessage}` : submissionMessage;
      }
      try {
        updates = await listCreatorUpdates([profileId, user.id]);
      } catch (updatesError) {
        const updatesMessage = updatesError instanceof Error ? updatesError.message : 'Could not load creator updates.';
        metricsError = metricsError ? `${metricsError} ${updatesMessage}` : updatesMessage;
      }

      setOverview({
        products: productRows,
        libraryItems,
        totalPlays,
        catalogHealth,
        events,
        submissions,
        updates,
        metricsError,
      });
    }

    fetchOverview();
  }, [user]);

  if (loading) {
    return <PageShell><main className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero
            title="Studio"
            copy="Creator tools, catalog health, and earnings live here once you sign in."
          />
          <EmptyMessage>Log in to use your creator Studio.</EmptyMessage>
          <div className="ui44-centered-action">
            <Link href="/login" className="os-button os-button-primary">Log In</Link>
          </div>
        </main>
      </PageShell>
    );
  }

  if (profile && !isCreatorProfile(profile)) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <Ui44Panel overflow="visible" className="ui44-creator-gate">
            <h1 className="os-type-panel-title ui44-creator-gate-title">Creator Access Required</h1>
            <p className="os-type-body ui44-creator-gate-copy">
              Studio publishing is available to approved creator accounts. Your fan account, Library, and Community access remain available while approval is pending.
            </p>
            <div className="ui44-creator-gate-actions">
              <Link href="/profile" className="os-button os-button-primary">Open Public Profile</Link>
              <Link href="/" className="os-button os-button-ghost">Back to Home</Link>
            </div>
          </Ui44Panel>
        </main>
      </PageShell>
    );
  }

  const productById = new Map(overview.products.map(product => [product.id, product]));

  const librarySaves = overview.libraryItems.length;
  const purchasedItems = overview.libraryItems.filter(item => item.acquisition_type === 'purchase');
  const soldItems = purchasedItems.length;
  const revenueCents = purchasedItems.reduce((total, item) => {
    const product = item.item_id ? productById.get(item.item_id) : null;
    return total + (product?.price_cents ?? 0);
  }, 0);
  const totalPlays = overview.totalPlays;
  const healthByItemId = new Map(overview.catalogHealth.map(health => [health.item_id, health]));
  const pendingSubmissionByItemId = new Map(
    overview.submissions
      .filter(submission => submission.status === 'pending')
      .map(submission => [submission.item_id, submission]),
  );
  const productSections = [
    ...(beatReviewSurfacesEnabled ? [{ id: 'beats', label: 'Beats', itemLabel: 'Beat', href: '/studio#beats', typeOptions: ['Beat'] }] : []),
    ...STUDIO_CATALOG_SECTIONS.filter(section => section.id !== 'merch' || profile?.role === 'admin'),
  ].map(section => ({
    ...section,
    items: overview.products.filter(item => {
      const experience = getProductExperience(item);
      if (section.id === 'beats') return item.browse_type?.slug === 'beat';
      if (section.id === 'music') return experience === 'music' && item.browse_type?.slug !== 'beat';
      if (section.id === 'books') return experience === 'book';
      if (section.id === 'assets') return experience === 'asset';
      return experience === 'physical';
    }).sort((a, b) => comparePublicCatalogItems(a, b)),
  }));

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero
          title="Studio"
          copy="Your creator workspace for catalog health, sales signals, and what should go live next."
          actions={<StudioCreateMenu />}
        />

        <div className="dashboard-overview-grid">
          <OverviewStatCard label="Saves" value={librarySaves} />
          <OverviewStatCard label="Plays" value={totalPlays} />
          <OverviewStatCard label="Sold" value={soldItems} />
          <OverviewStatCard label="Earned" value={formatCurrency(revenueCents)} />
        </div>

        {studioStatus === 'submitted' && (
          <div className="dashboard-status dashboard-status-warning ui44-status ui44-status-warning studio-submission-banner" role="status">
            Submitted for review. Your release will remain in its current published state until an administrator approves the update.
          </div>
        )}
        {studioStatus === 'published' && (
          <div className="dashboard-status dashboard-status-success ui44-status ui44-status-success studio-submission-banner" role="status">
            Published successfully. Your release is now live in the catalog.
          </div>
        )}
        {studioStatus === 'update-published' && (
          <div className="dashboard-status dashboard-status-success ui44-status ui44-status-success studio-submission-banner" role="status">
            Update published successfully.
          </div>
        )}

        {overview.metricsError && (
          <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">
            Some analytics could not be loaded: {overview.metricsError}
          </div>
        )}

        <div className="studio-catalog-sections">
          {overview.events.length > 0 && <section className="dashboard-section" id="events">
            <SectionHeader title="Events" />
            <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
              {overview.events.map(event => (
                <Link key={event.id} href={`/studio/events/${event.id}`} className="dashboard-list-row studio-event-overview-row ui44-list-row ui44-list-row-dashboard ui44-list-row-wide-actions ui44-list-row-interactive">
                  <div className="dashboard-row-copy">
                    <div className="dashboard-row-title">{event.title}</div>
                    <div className="dashboard-row-subtitle">{formatEventDate(event.starts_at, event.timezone)} · {formatEventFormat(event.format)}</div>
                  </div>
                  <div className="dashboard-row-actions">
                    {event.lifecycle_state === 'cancelled' && <span className="dashboard-status-pill studio-status-pill-draft ui44-badge">Cancelled</span>}
                  </div>
                </Link>
              ))}
            </div>
          </section>}
          {productSections.filter(section => section.items.length > 0).map(section => (
            <StudioProductSection
              key={section.id}
              id={section.id === 'assets' ? 'sample-packs' : section.id}
              title={section.label}
              itemLabel={section.itemLabel}
              items={section.items}
              healthByItemId={healthByItemId}
              pendingSubmissionByItemId={pendingSubmissionByItemId}
            />
          ))}
          {overview.updates.length > 0 && <StudioUpdatesSection updates={overview.updates} />}
        </div>

      </main>
    </PageShell>
  );
}

function StudioUpdatesSection({ updates }: { updates: CreatorUpdate[] }) {
  return <section className="dashboard-section" id="updates">
    <SectionHeader title="Updates" />
    <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
      {updates.map(update => <Link key={update.id} href={`/studio/updates/${update.id}`} className="dashboard-list-row studio-update-row ui44-list-row ui44-list-row-studio ui44-list-row-interactive">
        <div className="dashboard-row-copy">
          <div className="dashboard-row-title">{update.title}</div>
          <div className="dashboard-row-subtitle">{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(update.created_at))}</div>
          <div className={update.status === 'published' ? 'dashboard-status-pill dashboard-status-pill-success studio-publication-status' : 'dashboard-status-pill dashboard-status-pill-warning studio-publication-status'}>{update.status === 'published' ? 'Published' : 'Under Review'}</div>
        </div>
      </Link>)}
    </div>
  </section>;
}

function OverviewStatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Ui44Panel overflow="visible" className="dashboard-metric-card">
      <div className="dashboard-overview-card-inner">
        <div className="os-type-meta">{label}</div>
        <div className="os-type-page-title">{value}</div>
      </div>
    </Ui44Panel>
  );
}

const STUDIO_CREATE_ACTIONS = [
  { label: 'Add Music', href: '/studio/products/new?section=music' },
  { label: 'Add Book', href: '/studio/products/new?section=books' },
  { label: 'Add Pack', href: '/studio/products/new?section=sample-packs' },
  { label: 'Add Update', href: '/studio/updates/new' },
];

function StudioCreateMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const firstAction = rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstAction?.focus();
    function closeMenu(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>('.page-compose-button')?.focus();
    }
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="page-header-tools studio-create-tools">
      <div ref={rootRef} className={open ? 'page-filter-menu page-filter-menu-open' : 'page-filter-menu'}>
        <button
          type="button"
          className="ui44-symbol-button ui44-symbol-button-add page-filter-button studio-create-button"
          aria-label="Add Studio content"
          title="Add Studio content"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen(current => !current)}
        >
          <span className="ui44-symbol-plus" aria-hidden="true">+</span>
        </button>
        {open && <div className="ui44-paper-menu page-filter-popover studio-create-popover" role="menu" aria-label="Add Studio content">
          {STUDIO_CREATE_ACTIONS.map(action => (
            <Link key={action.href} href={action.href} className="ui44-paper-menu-item page-filter-option" role="menuitem" onClick={() => setOpen(false)}>
              {action.label}
            </Link>
          ))}
        </div>}
      </div>
    </div>
  );
}

function StudioProductSection({
  id,
  title,
  itemLabel,
  items,
  healthByItemId,
  pendingSubmissionByItemId,
}: {
  id: string;
  title: string;
  itemLabel: string;
  items: Product[];
  healthByItemId: Map<string, StudioCatalogHealth>;
  pendingSubmissionByItemId: Map<string, StudioSubmissionStatus>;
}) {
  return (
    <section className="dashboard-section" id={id}>
      <SectionHeader title={title} />
      <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
        {items.length === 0 ? (
          <div className="dashboard-empty">No {itemLabel}s yet.</div>
        ) : (
          items.map(product => {
            const health = healthByItemId.get(product.id);
            const issueCount = health?.issue_count ?? 0;
            const pendingSubmission = pendingSubmissionByItemId.get(product.id);
            const publicationLabel = pendingSubmission ? 'Under Review' : product.status === 'published' ? 'Published' : 'Draft';
            const publicationClass = pendingSubmission
              ? 'dashboard-status-pill dashboard-status-pill-warning studio-publication-status'
              : product.status === 'published'
                ? 'dashboard-status-pill dashboard-status-pill-success studio-publication-status'
                : 'dashboard-status-pill studio-status-pill-draft studio-publication-status';
            return (
            <Link key={product.id} href={id === 'beats' ? `/studio/beats/${product.id}` : `/studio/products/${product.id}`} className={`dashboard-list-row studio-item-row ${issueCount > 0 ? 'studio-item-row-with-actions' : 'studio-item-row-no-actions'} ui44-list-row ui44-list-row-studio ui44-list-row-interactive`}>
              {product.cover_url || product.hero_url ? <Image className="studio-item-artwork" src={product.cover_url || product.hero_url || ''} alt="" width={56} height={56} unoptimized /> : <div className="studio-item-artwork studio-item-artwork-empty" aria-hidden="true" />}
              <div className="dashboard-row-copy studio-item-copy">
                <div className="dashboard-row-title">{product.title}</div>
                <div className="dashboard-row-subtitle">
                  {product.browse_type?.label || product.item_type || itemLabel}
                </div>
                <div className={publicationClass}>{publicationLabel}</div>
              </div>
              {issueCount > 0 ? (
                <div className="dashboard-row-actions">
                  <span title={health?.issue_messages.join(' ')} className="dashboard-status-pill studio-status-pill-draft ui44-badge">
                    {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
                  </span>
                </div>
              ) : null}
            </Link>
            );
          })
        )}
      </div>
    </section>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatEventFormat(value: string) {
  return value.split('_').map(word => `${word[0].toUpperCase()}${word.slice(1)}`).join(' ');
}
