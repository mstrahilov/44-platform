'use client';

import { Ui44SelectInput } from '@/components/ui44/Inputs';
import { COMMUNITY_INTENT_LABELS, COMMUNITY_POST_TAG_OPTIONS, type CommunityCatalogItem, type CommunityIntent } from '@/lib/communityV11';
import { useId } from 'react';

export function CommunityPostTagSelect({
  value,
  canPostUpdate,
  onChange,
}: {
  value: CommunityIntent | '';
  canPostUpdate: boolean;
  onChange: (value: CommunityIntent | '') => void;
}) {
  const selectId = useId();
  return (
    <div className="community-post-tag-field dashboard-field">
      <label className="dashboard-field-label" htmlFor={selectId}>Post Tag</label>
      <Ui44SelectInput
        id={selectId}
        value={value}
        onChange={event => onChange(event.target.value as CommunityIntent | '')}
      >
        <option value="">Select a tag (Optional)</option>
        {COMMUNITY_POST_TAG_OPTIONS.map(option => (
          <option key={option} value={option} disabled={option === 'update' && !canPostUpdate}>
            {COMMUNITY_INTENT_LABELS[option]}
          </option>
        ))}
      </Ui44SelectInput>
      {value ? (
        <button type="button" className="community-post-tag-remove" onClick={() => onChange('')}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 4 12 12M16 4 4 16" /></svg>
          Remove Tag
        </button>
      ) : null}
    </div>
  );
}

export function CommunityMentionSelect({
  items,
  value,
  disabled = false,
  lockedLabel,
  onChange,
}: {
  items: CommunityCatalogItem[];
  value: string;
  disabled?: boolean;
  lockedLabel?: string;
  onChange: (itemId: string) => void;
}) {
  const selectId = useId();
  const hasValueOption = items.some(item => item.id === value);
  const selectValue = hasValueOption ? value : lockedLabel ? '__locked__' : value;
  return (
    <div className="community-mention-field dashboard-field">
      <label className="dashboard-field-label" htmlFor={selectId}>Mention Release</label>
      <Ui44SelectInput id={selectId} value={selectValue} disabled={disabled} onChange={event => onChange(event.target.value)}>
        <option value="">Select a release (Optional)</option>
        {lockedLabel && !hasValueOption ? <option value="__locked__">{lockedLabel}</option> : null}
        {items.map(item => (
          <option key={item.id} value={item.id}>
            {item.title}{item.creators?.display_name || item.creator ? ` · ${item.creators?.display_name || item.creator}` : ''}
          </option>
        ))}
      </Ui44SelectInput>
    </div>
  );
}
