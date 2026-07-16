'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Ui44TextInput } from '@/components/ui44/Inputs';

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

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      rootRef.current?.querySelector<HTMLInputElement>('[role="combobox"]')?.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const options = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    if (!options.length) return;
    event.preventDefault();
    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown'
      ? current < 0 || current === options.length - 1 ? 0 : current + 1
      : current <= 0 ? options.length - 1 : current - 1;
    options[next]?.focus();
  }

  return <div className="tag-select" ref={rootRef} onKeyDown={handleKeyDown}>
    <div className="tag-select-control ui44-composed-field" onClick={() => setOpen(true)}>
      {selected.map(tag => <span className="tag-select-pill" key={tag.id}>{tag.label}<button type="button" aria-label={`Remove ${tag.label}`} onClick={event => { event.stopPropagation(); onChange(value.filter(id => id !== tag.id)); }}>×</button></span>)}
      <Ui44TextInput surface="bare" role="combobox" value={query} onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={selected.length ? 'Add another tag' : 'Search tags'} aria-label="Search tags" aria-expanded={open} aria-controls="item-tag-options" />
    </div>
    {open && <div id="item-tag-options" className="ui44-paper-menu tag-select-menu" role="listbox" aria-label="Available tags">
      {available.length ? available.map(tag => <button className="ui44-paper-menu-item" key={tag.id} type="button" role="option" aria-selected="false" onClick={() => { onChange([...value, tag.id]); setQuery(''); }}>{tag.label}</button>) : <span className="tag-select-empty">No remaining tags</span>}
    </div>}
  </div>;
}
