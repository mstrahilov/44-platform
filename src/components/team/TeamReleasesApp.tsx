'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { EmptyMessage, HubHero, PageShell } from '@/components/Ui';
import { Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
import { TeamAccessBoundary, TeamSectionNav } from '@/components/team/TeamPrimitives';
import { listTeamReleases, type TeamRelease } from '@/lib/domain/team';

function dateLabel(value: string | null) {
  if (!value) return 'Release date not recorded';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function ReleaseDirectory() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'added_desc' | 'release_date_desc' | 'title'>('added_desc');
  const [rows, setRows] = useState<TeamRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => { if (alive) { setLoading(true); setError(''); } });
    void listTeamReleases({ query: submittedQuery, category, sort }).then(data => {
      if (alive) { setRows(data); setLoading(false); }
    }).catch(loadError => {
      if (alive) { setError(loadError instanceof Error ? loadError.message : 'Releases could not be loaded.'); setLoading(false); }
    });
    return () => { alive = false; };
  }, [category, sort, submittedQuery]);

  function submit(event: FormEvent) { event.preventDefault(); setSubmittedQuery(query.trim()); }

  return <PageShell><main className="team-page">
    <TeamSectionNav /><HubHero title="Releases" copy="Published catalog facts and artwork for editorial planning. This directory is read-only." />
    <form className="team-filter-bar ui44-panel" onSubmit={submit}>
      <label><span>Search</span><Ui44TextInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Release or Creator" /></label>
      <label><span>Category</span><Ui44SelectInput value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option><option value="music">Music</option><option value="book">Books</option><option value="asset">Sample packs</option><option value="merch">Merch</option><option value="game">Games</option></Ui44SelectInput></label>
      <label><span>Sort</span><Ui44SelectInput value={sort} onChange={event => setSort(event.target.value as typeof sort)}><option value="added_desc">Recently added</option><option value="release_date_desc">Release date</option><option value="title">Title</option></Ui44SelectInput></label>
      <button className="os-button os-button-secondary" type="submit">Search</button>
    </form>
    {error ? <div className="ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {loading ? <div className="ui44-loading-shell" role="status" aria-label="Loading releases" /> : rows.length === 0 ? <EmptyMessage>No published releases match this view.</EmptyMessage> : <div className="team-release-grid">
      {rows.map(release => <Link key={release.item_id} href={release.item_url} className="team-release-card">
        {release.artwork_url ? <Image src={release.artwork_url} alt="" width={420} height={420} unoptimized /> : <span className="team-release-art-empty" aria-hidden="true">44</span>}
        <h2>{release.title}</h2><p>{release.creator_name}</p><small>{release.item_type} · {dateLabel(release.release_date)}</small>
      </Link>)}
    </div>}
  </main></PageShell>;
}

export default function TeamReleasesApp() { return <TeamAccessBoundary><ReleaseDirectory /></TeamAccessBoundary>; }
