'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { EmptyMessage, HubHero, PageShell } from '@/components/Ui';
import { Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
import { TeamAccessBoundary, TeamSectionNav } from '@/components/team/TeamPrimitives';
import { listTeamCreators, type TeamCreator } from '@/lib/domain/team';

function CreatorDirectory() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [creatorType, setCreatorType] = useState('');
  const [sort, setSort] = useState<'joined_desc' | 'name' | 'releases_desc'>('joined_desc');
  const [rows, setRows] = useState<TeamCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => { if (alive) { setLoading(true); setError(''); } });
    void listTeamCreators({ query: submittedQuery, creatorType, sort }).then(data => {
      if (alive) { setRows(data); setLoading(false); }
    }).catch(loadError => {
      if (alive) { setError(loadError instanceof Error ? loadError.message : 'Creators could not be loaded.'); setLoading(false); }
    });
    return () => { alive = false; };
  }, [creatorType, sort, submittedQuery]);

  function submit(event: FormEvent) { event.preventDefault(); setSubmittedQuery(query.trim()); }

  return <PageShell><main className="team-page">
    <TeamSectionNav /><HubHero title="Creators" copy="Published public Creator information for editorial planning. This directory is read-only." />
    <form className="team-filter-bar ui44-panel" onSubmit={submit}>
      <label><span>Search</span><Ui44TextInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, username, or bio" /></label>
      <label><span>Creator type</span><Ui44TextInput value={creatorType} onChange={event => setCreatorType(event.target.value)} placeholder="All types" /></label>
      <label><span>Sort</span><Ui44SelectInput value={sort} onChange={event => setSort(event.target.value as typeof sort)}><option value="joined_desc">Newest joined</option><option value="name">Name</option><option value="releases_desc">Most releases</option></Ui44SelectInput></label>
      <button className="os-button os-button-secondary" type="submit">Search</button>
    </form>
    {error ? <div className="ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {loading ? <div className="ui44-loading-shell" role="status" aria-label="Loading Creators" /> : rows.length === 0 ? <EmptyMessage>No published Creators match this view.</EmptyMessage> : <div className="team-directory-grid">
      {rows.map(creator => <Link key={creator.profile_id} href={creator.profile_url} className="team-creator-card ui44-panel">
        {creator.avatar_url ? <Image src={creator.avatar_url} alt="" width={88} height={88} unoptimized /> : <span className="team-directory-avatar" aria-hidden="true">{(creator.display_name || creator.username || '4').slice(0, 1)}</span>}
        <div><h2>{creator.display_name || creator.username || 'Unnamed Creator'}</h2><p>{creator.username ? `@${creator.username}` : 'No username'}{creator.creator_type ? ` · ${creator.creator_type}` : ''}</p>{creator.bio ? <small>{creator.bio}</small> : null}<strong>{creator.published_item_count} published Item{creator.published_item_count === 1 ? '' : 's'}</strong></div>
      </Link>)}
    </div>}
  </main></PageShell>;
}

export default function TeamCreatorsApp() { return <TeamAccessBoundary><CreatorDirectory /></TeamAccessBoundary>; }
