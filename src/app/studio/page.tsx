'use client';

import Link from 'next/link';
import { PublicArtwork } from '@/components/PublicArtwork';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PageShell, HubHero, EmptyMessage, SectionHeader } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { useAuth } from '@/lib/useAuth';
import { comparePublicCatalogItems, type Product } from '@/lib/products';
import { getProductExperience } from '@/lib/experience';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { STUDIO_CATALOG_SECTIONS } from '@/lib/studioCatalog';
import { getCreatorCatalogOverview, listCreatorSubmissionStatuses, type StudioCatalogHealth, type StudioLibraryMetric, type StudioSubmissionStatus } from '@/lib/domain/studio';
import { beatReviewSurfacesEnabled } from '@/lib/domain/beats';
import { listCreatorEvents, type CreatorEvent } from '@/lib/domain/events';
import { listCreatorUpdates, type CreatorUpdate } from '@/lib/domain/itemCommunity';
import { useTopbarOverflow } from '@/components/TopbarContext';
import { OS44Button } from '@/components/OS44Button';
import { listCreatorVideos, type CreatorVideoPage } from '@/lib/domain/releaseFeatures';

type LibraryMetricRow = StudioLibraryMetric;
type StudioRowIconName = 'calendar' | 'play' | 'music' | 'book' | 'game' | 'waveform';

type OverviewState = {
  products: Product[];
  libraryItems: LibraryMetricRow[];
  totalPlays: number;
  catalogHealth: StudioCatalogHealth[];
  events: CreatorEvent[];
  submissions: StudioSubmissionStatus[];
  updates: CreatorUpdate[];
  videos: CreatorVideoPage[];
  metricsError: string;
};

export default function StudioPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const userId = user?.id;
  const [studioStatus, setStudioStatus] = useState<string | null>(() => (
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('studioStatus')
  ));
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const studioToolbarActions = useMemo(() => STUDIO_CREATE_ACTIONS.map(action => ({
    id: action.href,
    label: action.label,
    onSelect: () => router.push(action.href),
  })), [router]);
  useTopbarOverflow(user && profile && isCreatorProfile(profile) ? studioToolbarActions : undefined);

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
    videos: [],
    metricsError: '',
  });

  useEffect(() => {
    if (!userId) return;
    let active = true;

    async function fetchOverview(activeUserId: string) {
      const profileResult = await loadStudioProfile(activeUserId);
      if (!active) return;
      setProfile(profileResult.profile);
      if (profileResult.profile && !isCreatorProfile(profileResult.profile)) return;
      const profileId = profileResult.profile?.id ?? activeUserId;
      const results = await Promise.allSettled([
        getCreatorCatalogOverview(profileId),
        listCreatorEvents(activeUserId),
        listCreatorSubmissionStatuses(profileId),
        listCreatorUpdates([profileId, activeUserId]),
        listCreatorVideos(200, profileId),
      ] as const);
      if (!active) return;

      const [catalog, events, submissions, updates, videos] = results;
      const catalogValue = catalog.status === 'fulfilled' ? catalog.value : null;
      const errorMessages = [
        'Could not load Studio metrics.',
        'Could not load Studio events.',
        'Could not load submission statuses.',
        'Could not load creator updates.',
        'Could not load creator videos.',
      ];
      setOverview({
        products: catalogValue?.items ?? [],
        libraryItems: catalogValue?.libraryItems ?? [],
        totalPlays: catalogValue?.totalPlays ?? 0,
        catalogHealth: catalogValue?.catalogHealth ?? [],
        events: events.status === 'fulfilled' ? events.value.filter(event => event.lifecycle_state !== 'removed') : [],
        submissions: submissions.status === 'fulfilled' ? submissions.value : [],
        updates: updates.status === 'fulfilled' ? updates.value : [],
        videos: videos.status === 'fulfilled' ? videos.value : [],
        metricsError: results.map((result, index) => result.status === 'rejected'
          ? result.reason instanceof Error ? result.reason.message : errorMessages[index]
          : '').filter(Boolean).join(' '),
      });
    }

    void fetchOverview(userId);
    return () => { active = false; };
  }, [userId]);

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
            <OS44Button href="/login" className="os-button os-button-primary">Log In</OS44Button>
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
              <OS44Button href="/profile" className="os-button os-button-primary">Open Public Profile</OS44Button>
              <OS44Button href="/" className="os-button os-button-ghost">Back to Home</OS44Button>
            </div>
          </Ui44Panel>
        </main>
      </PageShell>
    );
  }

  const librarySaves = overview.libraryItems.length;
  const totalPlays = overview.totalPlays;
  const healthByItemId = new Map(overview.catalogHealth.map(health => [health.item_id, health]));
  const pendingSubmissionByItemId = new Map(
    overview.submissions
      .filter(submission => submission.status === 'pending')
      .map(submission => [submission.item_id, submission]),
  );
  const productSections = [
    ...(beatReviewSurfacesEnabled ? [{ id: 'beats', label: 'Beats', itemLabel: 'Beat', href: '/studio#assets', typeOptions: ['Beat'] }] : []),
    ...STUDIO_CATALOG_SECTIONS.filter(section => section.id !== 'merch' || profile?.role === 'admin'),
  ].map(section => ({
    ...section,
    items: overview.products.filter(item => {
      const experience = getProductExperience(item);
      if (section.id === 'beats') return item.browse_type?.slug === 'beat' || item.browse_type?.slug === 'vocal-acapella';
      if (section.id === 'music') return experience === 'music' && item.browse_type?.slug !== 'beat' && item.browse_type?.slug !== 'vocal-acapella';
      if (section.id === 'books') return experience === 'book';
      if (section.id === 'games') return experience === 'interactive';
      if (section.id === 'assets') return experience === 'asset';
      return experience === 'physical';
    }).sort((a, b) => comparePublicCatalogItems(a, b)),
  }));

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero
          title="Studio"
          actions={<StudioCreateMenu />}
          className="studio-page-header"
        />

        <div className="dashboard-overview-grid">
          <OverviewStatCard label="Library Saves" value={librarySaves} />
          <OverviewStatCard label="Total Plays" value={totalPlays} />
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
        {studioStatus === 'game-submitted' && (
          <div className="dashboard-status dashboard-status-warning ui44-status ui44-status-warning studio-submission-banner" role="status">
            Game package saved for review. 44OS will inspect and host the WebGL build before it can go live.
          </div>
        )}
        {studioStatus === 'update-published' && (
          <div className="dashboard-status dashboard-status-success ui44-status ui44-status-success studio-submission-banner" role="status">
            Update published successfully.
          </div>
        )}

        {overview.metricsError && (
          <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">
            Some Studio data could not be loaded: {overview.metricsError}
          </div>
        )}

        <div className="studio-catalog-sections">
          {productSections.filter(section => section.id === 'music' && section.items.length > 0).map(section => (
            <StudioProductSection key={section.id} id={section.id} title={section.label} itemLabel={section.itemLabel} items={section.items} healthByItemId={healthByItemId} pendingSubmissionByItemId={pendingSubmissionByItemId} />
          ))}
          <StudioVideosSection videos={overview.videos} />
          {productSections.filter(section => section.id === 'books' && section.items.length > 0).map(section => (
            <StudioProductSection key={section.id} id={section.id} title={section.label} itemLabel={section.itemLabel} items={section.items} healthByItemId={healthByItemId} pendingSubmissionByItemId={pendingSubmissionByItemId} />
          ))}
          {productSections.filter(section => section.id === 'assets' || section.id === 'beats').some(section => section.items.length > 0) && <StudioProductSection
            id="assets"
            title="Assets"
            itemLabel="asset"
            items={productSections.filter(section => section.id === 'assets' || section.id === 'beats').flatMap(section => section.items)}
            healthByItemId={healthByItemId}
            pendingSubmissionByItemId={pendingSubmissionByItemId}
          />}
          {productSections.filter(section => section.id === 'games' && section.items.length > 0).map(section => (
            <StudioProductSection key={section.id} id={section.id} title={section.label} itemLabel={section.itemLabel} items={section.items} healthByItemId={healthByItemId} pendingSubmissionByItemId={pendingSubmissionByItemId} />
          ))}
          {overview.events.length > 0 && <section className="dashboard-section" id="events">
            <SectionHeader title="Events" />
            <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
              {overview.events.map(event => (
                <StudioOverviewRow key={event.id} href={`/studio/events/${event.id}`} title={event.title} subtitle={formatStudioEventDateTime(event.starts_at, event.timezone, eventYearIsCurrent(event.starts_at, event.timezone))} imageUrl={event.cover_url} icon="calendar" status={event.lifecycle_state === 'cancelled' ? 'Cancelled' : undefined} />
              ))}
            </div>
          </section>}
          {productSections.filter(section => section.id === 'merch' && section.items.length > 0).map(section => (
            <StudioProductSection key={section.id} id={section.id} title={section.label} itemLabel={section.itemLabel} items={section.items} healthByItemId={healthByItemId} pendingSubmissionByItemId={pendingSubmissionByItemId} />
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
        <div className="os-type-meta studio-metric-label">{label}</div>
        <div className="os-type-page-title">{value}</div>
      </div>
    </Ui44Panel>
  );
}

function StudioVideosSection({ videos }: { videos: CreatorVideoPage[] }) {
  return <section className="dashboard-section" id="videos">
    <SectionHeader title="Videos" />
    <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
      {videos.length === 0 ? <div className="dashboard-empty">No videos yet.</div> : videos.map(video => (
        <StudioOverviewRow
          key={video.id}
          href={`/studio/videos/${video.id}`}
          title={video.title}
          subtitle="YouTube"
          imageUrl={`https://img.youtube.com/vi/${encodeURIComponent(video.youtube_video_id)}/mqdefault.jpg`}
          icon="play"
        />
      ))}
    </div>
  </section>;
}

function StudioOverviewRow({
  href,
  title,
  subtitle,
  secondary,
  imageUrl,
  icon,
  status,
  external = false,
}: {
  href: string;
  title: string;
  subtitle: string;
  secondary?: string;
  imageUrl?: string | null;
  icon: StudioRowIconName;
  status?: string;
  external?: boolean;
}) {
  const content = <>
    <span className="studio-overview-artwork" aria-hidden="true">
      {imageUrl ? <PublicArtwork className="studio-overview-artwork-image" src={imageUrl} alt="" width={56} height={56} sizes="56px" /> : <StudioRowIcon name={icon} />}
    </span>
    <span className="studio-overview-copy">
      <span className="studio-overview-title">{title}</span>
      <span className="studio-overview-subtitle">{subtitle}</span>
      {secondary ? <span className="studio-overview-secondary">{secondary}</span> : null}
    </span>
    <span className="studio-overview-trailing">
      {status ? <span className="dashboard-status-pill studio-status-pill-draft ui44-badge">{status}</span> : null}
      <span className="studio-overview-chevron" aria-hidden="true">›</span>
    </span>
  </>;
  const className = "dashboard-list-row studio-overview-row ui44-list-row ui44-list-row-dashboard ui44-list-row-interactive";
  return external
    ? <a href={href} className={className} target="_blank" rel="noreferrer">{content}</a>
    : <Link href={href} className={className}>{content}</Link>;
}

function StudioRowIcon({ name }: { name: StudioRowIconName }) {
  const paths: Record<StudioRowIconName, ReactNode> = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    play: <><path d="m8 5 12 7-12 7z" /></>,
    music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z" /><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20" /></>,
    game: <><path d="M6 8h12a4 4 0 0 1 3.8 5.3l-1 3A2.5 2.5 0 0 1 17 18l-2.5-2h-3L9 18a2.5 2.5 0 0 1-3.8-1.7l-1-3A4 4 0 0 1 8 8" /><path d="M8 11v4M6 13h4M16 12h.01M18 14h.01" /></>,
    waveform: <><path d="M3 10v4M7 6v12M11 3v18M15 7v10M19 10v4M22 11v2" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function formatStudioEventDateTime(value: string, timezone: string, includeYear: boolean) {
  const date = new Date(value);
  const datePart = new Intl.DateTimeFormat(undefined, {
    month: 'long', day: 'numeric', ...(includeYear ? { year: 'numeric' as const } : {}), timeZone: timezone,
  }).format(date);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: timezone,
  }).format(date);
  return `${datePart} at ${timePart}`;
}

function eventYearIsCurrent(value: string, timezone: string) {
  const eventYear = new Intl.DateTimeFormat(undefined, { year: 'numeric', timeZone: timezone }).format(new Date(value));
  const currentYear = new Intl.DateTimeFormat(undefined, { year: 'numeric', timeZone: timezone }).format(new Date());
  return eventYear !== currentYear;
}


const STUDIO_CREATE_ACTIONS = [
  { label: 'Add Music', href: '/studio/products/new?section=music' },
  { label: 'Add Video', href: '/studio/videos/new' },
  { label: 'Add Book', href: '/studio/products/new?section=books' },
  { label: 'Add Asset', href: '/studio/assets/new' },
  { label: 'Add Game', href: '/studio/products/new?section=games' },
  { label: 'Add Event', href: '/studio/events/new' },
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
            const icon: StudioRowIconName = id === 'music' ? 'music' : id === 'books' ? 'book' : id === 'games' ? 'game' : id === 'beats' ? 'waveform' : 'play';
            const pendingSubmission = pendingSubmissionByItemId.get(product.id);
            const status = issueCount > 0
              ? `${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}`
              : pendingSubmission ? 'Under Review' : undefined;
            return <StudioOverviewRow
              key={product.id}
              href={id === 'beats' || id === 'assets' ? `/studio/assets/${product.id}` : `/studio/products/${product.id}`}
              title={product.title}
              subtitle={product.browse_type?.label || product.item_type || itemLabel}
              imageUrl={product.cover_url || product.hero_url}
              icon={icon}
              status={status}
            />;
          })
        )}
      </div>
    </section>
  );
}
