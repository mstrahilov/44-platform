'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader } from '@/components/Ui';
import { Ui44CheckboxInput } from '@/components/ui44/Inputs';

export type StudioRelatedItem = {
  id: string;
  title: string;
  item_type: string | null;
  experience_type: string | null;
};

type Props = {
  userId: string;
  itemId?: string;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
};

/** Curated links to another item owned by the same creator. */
export function StudioRelatedItemsField({ userId, itemId, selectedIds, onSelectedIdsChange }: Props) {
  const [items, setItems] = useState<StudioRelatedItem[]>([]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await supabase
        .from('catalog_items')
        .select('id,title,item_type,experience_type')
        .eq('author_id', userId)
        .eq('status', 'published')
        .order('title');
      if (!cancelled) setItems(((result.data ?? []) as StudioRelatedItem[]).filter(item => item.id !== itemId));
    }
    if (userId) void load();
    return () => { cancelled = true; };
  }, [itemId, userId]);

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
      if (!cancelled) onSelectedIdsChange(rows.map(row => row.related_item_id));
    }
    void loadSelected();
    return () => { cancelled = true; };
  }, [itemId, onSelectedIdsChange]);

  return (
    <section className="dashboard-form-section">
      <SectionHeader
        title="Related Items"
        description="Link companion releases or items to this book."
        showDescription
        alignActionWithTitle
        action={<button type="button" role="switch" aria-label="Enable related items" aria-checked={enabled} className={enabled ? 'settings-toggle settings-toggle-on ui44-switch ui44-switch-on' : 'settings-toggle ui44-switch'} onClick={() => setEnabled(value => !value)} />}
      />
      {enabled ? (
        <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip studio-feature-panel">
          {items.length === 0 ? <p className="dashboard-form-note">Publish another item first, then you can link it here.</p> : items.map(item => (
            <label key={item.id} className="studio-achievement-setting-row">
              <Ui44CheckboxInput checked={selectedIds.includes(item.id)} onChange={() => onSelectedIdsChange(selectedIds.includes(item.id) ? selectedIds.filter(id => id !== item.id) : [...selectedIds, item.id])} />
              <span className="studio-achievement-setting-copy"><strong>{item.title}</strong><span>{item.item_type || item.experience_type || 'Item'}</span></span>
            </label>
          ))}
        </div>
      ) : null}
    </section>
  );
}
