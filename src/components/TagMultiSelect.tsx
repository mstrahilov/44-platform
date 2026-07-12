'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type TagOption = { id: string; label: string };

export function TagMultiSelect({ options, value, onChange }: { options: TagOption[]; value: string[]; onChange: (value: string[]) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = useMemo(() => options.filter(option => value.includes(option.id)), [options, value]);
  const available = useMemo(() => options.filter(option => !value.includes(option.id) && option.label.toLowerCase().includes(query.trim().toLowerCase())), [options, query, value]);

  useEffect(() => {
    function close(event: PointerEvent) { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  return <div className="tag-select" ref={rootRef}>
    <div className="tag-select-control" onClick={() => setOpen(true)}>
      {selected.map(tag => <span className="tag-select-pill" key={tag.id}>{tag.label}<button type="button" aria-label={`Remove ${tag.label}`} onClick={event => { event.stopPropagation(); onChange(value.filter(id => id !== tag.id)); }}>×</button></span>)}
      <input role="combobox" value={query} onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={selected.length ? 'Add another tag' : 'Search approved tags'} aria-label="Search approved tags" aria-expanded={open} aria-controls="item-tag-options" />
    </div>
    {open && <div id="item-tag-options" className="tag-select-menu" role="listbox" aria-label="Available tags">
      {available.length ? available.map(tag => <button key={tag.id} type="button" role="option" aria-selected="false" onClick={() => { onChange([...value, tag.id]); setQuery(''); }}>{tag.label}</button>) : <span className="tag-select-empty">No remaining tags</span>}
    </div>}
  </div>;
}
