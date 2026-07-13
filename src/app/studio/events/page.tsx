'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile } from '@/lib/studioProfiles';
import { formatEventDate } from '@/lib/eventTime';
import { listCreatorEvents, setCreatorEventState, type CreatorEvent } from '@/lib/domain/events';

export default function StudioEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<CreatorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    if (!user) return;
    try {
      const profile = await loadStudioProfile(user.id);
      if (!isCreatorProfile(profile.profile)) throw new Error('Creator access is required.');
      setEvents(await listCreatorEvents(user.id));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Could not load events.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (user) void Promise.resolve().then(refresh); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function changeState(event: CreatorEvent, state: 'scheduled'|'cancelled'|'removed') {
    const label = state === 'removed' ? 'remove' : state === 'cancelled' ? 'cancel' : 'restore';
    if (!window.confirm(`${label[0].toUpperCase()}${label.slice(1)} “${event.title}”?`)) return;
    try { setLoading(true); setError(''); await setCreatorEventState(event.id, state); await refresh(); }
    catch (mutationError) { setError(mutationError instanceof Error ? mutationError.message : 'Could not update this event.'); }
  }

  if (authLoading) return <PageShell><div className="dashboard-page" /></PageShell>;
  if (!user) return <PageShell><div className="dashboard-page"><HubHero title="Events" /><EmptyMessage>Log in to manage creator events.</EmptyMessage></div></PageShell>;
  return <PageShell><main className="dashboard-page">
    <HubHero title="Events" />
    <SectionHeader title="Your Events" action={<Link href="/studio/events/new" className="os-button os-button-primary os-button-compact">New Event</Link>} />
    <p className="os-type-body event-ticket-note">44OS lists events but does not sell or fulfill tickets.</p>
    {error && <div className="dashboard-status dashboard-status-error" role="alert">{error}</div>}
    {loading ? <div className="dashboard-empty">Loading events...</div> : events.length === 0 ? <div className="dashboard-list-surface"><div className="dashboard-empty studio-events-empty">No events yet.</div></div> :
      <div className="dashboard-list-surface">{events.map(event => <div className="dashboard-list-row event-studio-row" key={event.id}>
        <Link className="dashboard-row-copy" href={`/studio/events/${event.id}`}>
          <span className="dashboard-row-title">{event.title}</span>
          <span className="dashboard-row-subtitle">{formatEventDate(event.starts_at, event.timezone)} · {formatLabel(event.format)}</span>
        </Link>
        <div className="dashboard-row-actions">
          <span className={`dashboard-status-pill ${event.lifecycle_state === 'cancelled' ? 'studio-status-pill-draft' : ''}`}>{event.lifecycle_state}</span>
          <button className="os-button os-button-ghost os-button-compact" onClick={() => void changeState(event, event.lifecycle_state === 'cancelled' ? 'scheduled' : 'cancelled')}>{event.lifecycle_state === 'cancelled' ? 'Restore' : 'Cancel'}</button>
          <button className="os-button os-button-destructive os-button-compact" onClick={() => void changeState(event, 'removed')}>Remove</button>
        </div>
      </div>)}</div>}
  </main></PageShell>;
}

function formatLabel(value: string) { return value.split('_').map(word => word[0].toUpperCase()+word.slice(1)).join(' '); }
