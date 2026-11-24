'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { SectionHeader } from '@/components/Ui';
import { StudioReleasePicker } from '@/components/StudioReleasePicker';
import { listCreatorItems } from '@/lib/domain/studio';

export type StudioRelatedItem = {
  id: string;
  title: string;
  item_type: string | null;
  experience_type: string | null;
  cover_url: string | null;
};

type Props = {
  userId: string;
  itemId?: string;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  /** Optional catalog experience filter for curated companion pickers. */
  allowedExperienceType?: string;
  /** Use the release-only picker and standardized Related Release copy. */
  releaseOnly?: boolean;
};

/** Curated links to another item owned by the same creator. */
export function StudioRelatedItemsField({ userId, itemId, selectedIds, onSelectedIdsChange, enabled = true, onEnabledChange, allowedExperienceType, releaseOnly = false }: Props) {
  const [items, setItems] = useState<StudioRelatedItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (releaseOnly) {
        const releases = await listCreatorItems(userId);
        if (!cancelled) {
          setItems(releases
            .filter(item => item.id !== itemId && item.experience_type === 'music')
            .map(item => ({ id: item.id, title: item.title, cover_url: item.cover_url, item_type: item.browse_type?.label || item.item_type || null, experience_type: item.experience_type || null })));
        }
        return;
      }
      const result = await supabase
        .from('catalog_items')
        .select('id,title,item_type,experience_type,cover_url')
        .eq('author_id', userId)
        .eq('status', 'published')
        .order('title');
      if (!cancelled) {
        setItems(((result.data ?? []) as StudioRelatedItem[]).filter(item => item.id !== itemId && (releaseOnly ? item.experience_type === 'music' : (!allowedExperienceType || item.experience_type === allowedExperienceType))));
      }
    }
    if (userId) void load();
    return () => { cancelled = true; };
  }, [allowedExperienceType, itemId, releaseOnly, userId]);

  useEffect(() => {
    const selectedItemId = itemId ?? '';
    if (!selectedItemId) return;
    let cancelled = false;
    async function loadSelected() {
      const result = await supabase
        .from('item_related_items' as never)
        .select('related_item_id')
        .eq('item_id', selectedItemId);
      const rows = (result.data ?? []) as unknown as Array<{ related_item_id: string }>;
      if (!cancelled) {
        const relatedIds = rows.map(row => row.related_item_id);
        onSelectedIdsChange(releaseOnly ? relatedIds.slice(0, 1) : relatedIds);
      }
    }
    void loadSelected();
    return () => { cancelled = true; };
  }, [itemId, onSelectedIdsChange, releaseOnly]);

  const selectedItems = items.filter(item => selectedIds.includes(item.id));

  return (
    <section className="dashboard-form-section">
      <SectionHeader
        title={releaseOnly ? 'Related Release' : 'Related Items'}
        description="Attach this item to a related release."
        showDescription
        alignActionWithTitle
        action={<button type="button" role="switch" aria-label={releaseOnly ? 'Enable related release' : 'Enable related items'} aria-checked={enabled} className={enabled ? 'settings-toggle settings-toggle-on ui44-switch ui44-switch-on' : 'settings-toggle ui44-switch'} onClick={() => { const next = !enabled; if (!next) onSelectedIdsChange([]); onEnabledChange?.(next); }} />}
      />
      {enabled ? (
        releaseOnly ? (
          <div className="studio-video-release-picker-controls">
            {selectedItems[0] ? <div className="studio-video-release-row studio-video-release-row-selected">
              {selectedItems[0].cover_url ? <img className="studio-video-release-artwork" src={selectedItems[0].cover_url} alt="" /> : <span className="studio-video-release-placeholder" aria-hidden="true">44</span>}
              <span className="studio-video-release-title">{selectedItems[0].title}</span>
              <button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => setPickerOpen(true)}>Change</button>
            </div> : <button type="button" className="os-button os-button-secondary studio-video-select-release-button" onClick={() => setPickerOpen(true)}>Select Release</button>}
          </div>
        ) : (
          <div className="studio-related-items-controls">
            {selectedItems.length ? selectedItems.map(item => (
              <div key={item.id} className="studio-related-item-row">
                {item.cover_url ? <img src={item.cover_url} alt="" /> : <span className="studio-related-item-artwork" aria-hidden="true">44</span>}
                <span className="studio-related-item-copy"><strong>{item.title}</strong><small>{item.item_type || item.experience_type || 'Item'}</small></span>
                <button type="button" className="studio-visual-remove-button" aria-label={`Remove ${item.title}`} onClick={() => onSelectedIdsChange(selectedIds.filter(id => id !== item.id))}>×</button>
              </div>
            )) : null}
            <div className="studio-visual-video-actions">
              <button type="button" className="os-button os-button-secondary" onClick={() => setPickerOpen(true)}>Add Related Item</button>
            </div>
          </div>
        )
      ) : null}
      {releaseOnly && pickerOpen ? <StudioReleasePicker
        releases={items}
        selectedId={selectedIds[0] ?? ''}
        onSelect={item => {
          onSelectedIdsChange([item.id]);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      /> : null}
      {!releaseOnly && pickerOpen && typeof document !== 'undefined' ? createPortal(
        <div className="studio-video-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setPickerOpen(false); }}>
          <section className="studio-video-drawer" role="dialog" aria-modal="true" aria-label={releaseOnly ? 'Select Release' : 'Select Related Item'}>
            <header className="studio-video-drawer-header">
              <button type="button" className="studio-video-drawer-close" aria-label={`Close ${releaseOnly ? 'release' : 'related item'} picker`} onClick={() => setPickerOpen(false)}>×</button>
              <h2>{releaseOnly ? 'Select Release' : 'Select Related Item'}</h2>
              <button type="button" className="studio-video-drawer-save" onClick={() => setPickerOpen(false)}>Done</button>
            </header>
            {items.length ? <div className="studio-video-picker-list">
              {items.map(item => {
                const selected = selectedIds.includes(item.id);
                return <button type="button" className={`studio-video-picker-row${selected ? ' studio-related-item-picker-selected' : ''}`} key={item.id} onClick={() => onSelectedIdsChange(selected ? selectedIds.filter(id => id !== item.id) : [...selectedIds, item.id])}>
                  {item.cover_url ? <img src={item.cover_url} alt="" /> : <span className="studio-related-item-picker-artwork" aria-hidden="true">44</span>}
                  <span className="studio-related-item-picker-copy"><strong>{item.title}</strong><small>{item.item_type || item.experience_type || 'Item'}</small></span>
                  {selected ? <span aria-hidden="true">✓</span> : null}
                </button>;
              })}
            </div> : <p className="dashboard-form-note studio-video-picker-empty">{releaseOnly ? 'Publish a release first, then you can attach it here.' : 'Publish another item first, then you can link it here.'}</p>}
          </section>
        </div>, document.body
      ) : null}
    </section>
  );

}
