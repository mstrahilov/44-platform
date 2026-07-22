'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { AdminAccessBoundary, AdminActionDialog, formatAdminDate } from '@/components/admin/AdminPrimitives';
import { Ui44SelectInput } from '@/components/ui44/Inputs';
import {
  getAdminHomeFeaturedState,
  setAdminHomeFeaturedItems,
  type AdminHomeFeaturedState,
  type HomeFeaturedCandidate,
} from '@/lib/domain/homeDiscovery';

const FEATURED_SLOT_COUNT = 8;

export default function AdminHomeApp() {
  return <AdminAccessBoundary><AdminHomeShelfEditor /></AdminAccessBoundary>;
}

function AdminHomeShelfEditor() {
  const [state, setState] = useState<AdminHomeFeaturedState | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const applyState = useCallback((nextState: AdminHomeFeaturedState) => {
    setState(nextState);
    setSelectedIds([...nextState.entries]
      .sort((a, b) => a.position - b.position)
      .map(entry => entry.item_id));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      applyState(await getAdminHomeFeaturedState());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the Featured shelf.');
    } finally {
      setLoading(false);
    }
  }, [applyState]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const savedIds = useMemo(() => state
    ? [...state.entries].sort((a, b) => a.position - b.position).map(entry => entry.item_id)
    : [], [state]);
  const dirty = selectedIds.join('|') !== savedIds.join('|');
  const candidatesById = useMemo(() => new Map((state?.candidates ?? []).map(item => [item.item_id, item])), [state]);
  const entriesById = useMemo(() => new Map((state?.entries ?? []).map(item => [item.item_id, item])), [state]);

  function updateSlot(index: number, itemId: string) {
    setSuccess('');
    setSelectedIds(current => {
      if (!itemId) return current.slice(0, index);
      const next = current.slice(0, Math.max(current.length, index + 1));
      next[index] = itemId;
      return next.filter(Boolean).slice(0, FEATURED_SLOT_COUNT);
    });
  }

  async function save(reason: string) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const nextState = await setAdminHomeFeaturedItems(selectedIds, reason);
      applyState(nextState);
      setDialogOpen(false);
      setSuccess('New Releases was updated on Discover.');
      await load();
    } catch (saveError) {
      throw saveError instanceof Error ? saveError : new Error('Could not update Featured.');
    } finally {
      setSaving(false);
    }
  }

  return <PageShell><main className="admin-page admin-home-page">
    <HubHero
      title="Home"
      copy="Choose and order the eight Music releases shown in New Releases on Discover."
      actions={<Link href="/" className="os-button os-button-ghost">View Discover</Link>}
    />

    {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}
    {success ? <div className="dashboard-status dashboard-status-success ui44-status ui44-status-success" role="status">{success}</div> : null}

    {loading ? <div className="ui44-loading-shell" role="status" aria-label="Loading Home settings" /> : !state ? (
      <EmptyMessage>Featured settings are unavailable.</EmptyMessage>
    ) : <>
      {!state.mutation_ready ? <div className="dashboard-status ui44-status" role="status">Preview only: promote the Featured shelf migration before saving these slots.</div> : null}
      <section className="dashboard-section">
        <SectionHeader
          title="New Releases"
          description="Slot 1 appears at the left. Only published Music releases are available; empty slots are allowed."
        />
        <div className="admin-featured-slots ui44-panel">
          {Array.from({ length: FEATURED_SLOT_COUNT }, (_, index) => {
            const itemId = selectedIds[index] ?? '';
            const selected = itemId ? candidatesById.get(itemId) ?? entriesById.get(itemId) : undefined;
            const disabled = index > 0 && !selectedIds[index - 1];
            return <FeaturedSlot
              key={index}
              index={index}
              itemId={itemId}
              item={selected}
              candidates={state.candidates}
              selectedIds={selectedIds}
              disabled={disabled}
              onChange={nextItemId => updateSlot(index, nextItemId)}
            />;
          })}
        </div>
        <div className="admin-featured-actions">
          <button
            className="os-button os-button-ghost"
            type="button"
            disabled={!dirty || saving}
            onClick={() => setSelectedIds(savedIds)}
          >Reset</button>
          <button
            className="os-button os-button-primary"
            type="button"
            disabled={!dirty || saving || !state.mutation_ready}
            onClick={() => setDialogOpen(true)}
          >Save New Releases</button>
        </div>
      </section>

      <section className="dashboard-section">
        <SectionHeader title="History" description="The latest audited New Releases shelf changes." />
        {state.history.length === 0 ? <EmptyMessage>No New Releases changes have been recorded yet.</EmptyMessage> : (
          <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-overflow-clip">
            {state.history.map(event => <div className="ui44-list-row ui44-list-row-event" key={event.id}>
              <span className="ui44-list-row-copy">
                <strong className="ui44-list-row-title">{snapshotLabel(event.new_items)}</strong>
                <span className="ui44-list-row-body">{event.reason}</span>
                <small className="ui44-list-row-secondary">{event.changed_by} · {formatAdminDate(event.created_at, true)}</small>
              </span>
            </div>)}
          </div>
        )}
      </section>
    </>}

    <AdminActionDialog
      open={dialogOpen}
      title="Save New Releases shelf?"
      description="This immediately changes the eight ordered New Releases cards on Discover."
      confirmLabel="Save New Releases"
      saving={saving}
      onClose={() => setDialogOpen(false)}
      onConfirm={save}
    />
  </main></PageShell>;
}

function FeaturedSlot({
  index,
  itemId,
  item,
  candidates,
  selectedIds,
  disabled,
  onChange,
}: {
  index: number;
  itemId: string;
  item?: HomeFeaturedCandidate;
  candidates: HomeFeaturedCandidate[];
  selectedIds: string[];
  disabled: boolean;
  onChange: (itemId: string) => void;
}) {
  const available = !itemId || candidates.some(candidate => candidate.item_id === itemId);
  return <div className="admin-featured-slot">
    <span className={`admin-featured-art${item?.cover_url ? '' : ' admin-featured-art-empty'}`} style={item?.cover_url ? { backgroundImage: `url(${item.cover_url})` } : undefined} aria-hidden="true" />
    <label className="admin-featured-field">
      <span>Slot {index + 1}</span>
      <Ui44SelectInput value={itemId} disabled={disabled} onChange={event => onChange(event.target.value)}>
        <option value="">{disabled ? 'Choose the previous slot first' : 'Empty slot'}</option>
        {item && !available ? <option value={item.item_id}>{item.title} — {item.creator_name} (unavailable)</option> : null}
        {candidates.map(candidate => <option
          key={candidate.item_id}
          value={candidate.item_id}
          disabled={candidate.item_id !== itemId && selectedIds.includes(candidate.item_id)}
        >{candidate.title} — {candidate.creator_name}</option>)}
      </Ui44SelectInput>
      {item ? <small>{available ? `Released ${formatAdminDate(item.release_date)} · added ${formatAdminDate(item.created_at)}` : 'Unavailable on Discover; replace this release before saving.'}</small> : <small>No release selected.</small>}
    </label>
  </div>;
}

function snapshotLabel(items: Array<{ title: string; creator_name: string; position: number }>) {
  if (items.length === 0) return 'Featured cleared';
  return items
    .sort((a, b) => a.position - b.position)
    .map(item => `${item.title} — ${item.creator_name}`)
    .join(' · ');
}
