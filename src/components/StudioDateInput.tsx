'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Ui44TextInput } from '@/components/ui44/Inputs';

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date) : '';
}

function parseDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return null;
  return { date, hour, minute };
}

function formatDateTime(value: string) {
  const parsed = parseDateTime(value);
  return parsed
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(parsed.date.getFullYear(), parsed.date.getMonth(), parsed.date.getDate(), Number(parsed.hour), Number(parsed.minute)),
    )
    : '';
}

function localTimeParts(date = new Date()) {
  return {
    hour: String(date.getHours()).padStart(2, '0'),
    minute: String(date.getMinutes()).padStart(2, '0'),
  };
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function CalendarIcon({ dateTime = false }: { dateTime?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M7 3.5v3M17 3.5v3M3.5 9h17" />
    {dateTime ? <path d="M8 13h.01M12 13h.01M16 13h.01M8 16h.01M12 16h.01" /> : null}
  </svg>;
}

/** Shared catalog date control with a predictable, in-flow calendar popover. */
export function StudioDateInput({
  value,
  onChange,
  required = false,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  id?: string;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = parseDate(value);
    const now = selected ?? new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const selected = parseDate(value);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  const days = useMemo(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const start = new Date(firstDay);
    start.setDate(1 - firstDay.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [visibleMonth]);

  const choose = (date: Date) => {
    onChange(dateKey(date));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setOpen(false);
  };

  return <span ref={rootRef} className="studio-date-input-control">
    <Ui44TextInput
      id={id}
      type="text"
      value={formatDate(value)}
      readOnly
      required={required}
      aria-label="Release Date"
      aria-haspopup="dialog"
      aria-expanded={open}
      className="os-input-field studio-date-input"
      placeholder="Select release date"
      onClick={() => {
        const nextDate = parseDate(value);
        if (nextDate) setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
        setOpen(current => !current);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setOpen(current => !current);
        }
        if (event.key === 'Escape') setOpen(false);
      }}
    />
    <span className="studio-date-input-calendar" aria-hidden="true"><CalendarIcon /></span>
    {open ? <div className="studio-date-popover" role="dialog" aria-label="Select release date">
      <div className="studio-date-popover-header">
        <button type="button" onClick={() => setVisibleMonth(current => shiftMonth(current, -1))} aria-label="Previous month">‹</button>
        <strong>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth)}</strong>
        <button type="button" onClick={() => setVisibleMonth(current => shiftMonth(current, 1))} aria-label="Next month">›</button>
      </div>
      <div className="studio-date-popover-weekdays" aria-hidden="true">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="studio-date-popover-grid">
        {days.map(day => {
          const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
          const isSelected = selected ? dateKey(day) === dateKey(selected) : false;
          return <button
            type="button"
            key={dateKey(day)}
            className={`${isCurrentMonth ? '' : 'is-outside-month'} ${isSelected ? 'is-selected' : ''}`}
            onClick={() => choose(day)}
            aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(day)}
            aria-pressed={isSelected}
          >{day.getDate()}</button>;
        })}
      </div>
      <div className="studio-date-popover-footer">
        <button type="button" onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
        <button type="button" onClick={() => choose(new Date())}>Today</button>
      </div>
    </div> : null}
  </span>;
}

export function StudioDateTimeInput({
  value,
  onChange,
  placeholder,
  required = false,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  id?: string;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const parsed = parseDateTime(value);
  const selected = parsed?.date ?? null;
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = parsed?.date ?? new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  const days = useMemo(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const start = new Date(firstDay);
    start.setDate(1 - firstDay.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [visibleMonth]);

  const timeParts = parsed ? { hour: parsed.hour, minute: parsed.minute } : localTimeParts();
  const updateValue = (date: Date, hour: string, minute: string) => {
    onChange(`${dateKey(date)}T${hour}:${minute}`);
  };

  const chooseDate = (date: Date) => {
    updateValue(date, timeParts.hour, timeParts.minute);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const chooseTime = (part: 'hour' | 'minute', nextValue: string) => {
    const date = selected ?? new Date();
    updateValue(date, part === 'hour' ? nextValue : timeParts.hour, part === 'minute' ? nextValue : timeParts.minute);
  };

  return <span ref={rootRef} className={`studio-date-input-control${open ? ' is-open' : ''}`}>
    <Ui44TextInput
      id={id}
      type="text"
      value={formatDateTime(value)}
      readOnly
      required={required}
      aria-label={placeholder}
      aria-haspopup="dialog"
      aria-expanded={open}
      className="os-input-field studio-date-input"
      placeholder={placeholder}
      onClick={() => {
        const next = parseDateTime(value)?.date ?? new Date();
        setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
        setOpen(current => !current);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setOpen(current => !current);
        }
        if (event.key === 'Escape') setOpen(false);
      }}
    />
    {!value ? <span className="studio-date-input-placeholder" aria-hidden="true">{placeholder}</span> : null}
    <span className="studio-date-input-calendar" aria-hidden="true"><CalendarIcon dateTime /></span>
    {open ? <div className="studio-date-popover studio-date-time-popover" role="dialog" aria-label={placeholder}>
      <div className="studio-date-popover-header">
        <button type="button" onClick={() => setVisibleMonth(current => shiftMonth(current, -1))} aria-label="Previous month">‹</button>
        <strong>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth)}</strong>
        <button type="button" onClick={() => setVisibleMonth(current => shiftMonth(current, 1))} aria-label="Next month">›</button>
      </div>
      <div className="studio-date-popover-weekdays" aria-hidden="true">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="studio-date-popover-grid">
        {days.map(day => {
          const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
          const isSelected = selected ? dateKey(day) === dateKey(selected) : false;
          return <button
            type="button"
            key={dateKey(day)}
            className={`${isCurrentMonth ? '' : 'is-outside-month'} ${isSelected ? 'is-selected' : ''}`}
            onClick={() => chooseDate(day)}
            aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(day)}
            aria-pressed={isSelected}
          >{day.getDate()}</button>;
        })}
      </div>
      <div className="studio-date-time-controls">
        <div className="studio-date-time-selects">
          <select className="studio-date-time-select" aria-label="Hour" value={timeParts.hour} onChange={event => chooseTime('hour', event.target.value)}>
            {Array.from({ length: 24 }, (_, hour) => { const value = String(hour).padStart(2, '0'); return <option key={value} value={value}>{value}</option>; })}
          </select>
          <span aria-hidden="true">:</span>
          <select className="studio-date-time-select" aria-label="Minute" value={timeParts.minute} onChange={event => chooseTime('minute', event.target.value)}>
            {Array.from({ length: 60 }, (_, minute) => { const value = String(minute).padStart(2, '0'); return <option key={value} value={value}>{value}</option>; })}
          </select>
        </div>
      </div>
      <div className="studio-date-popover-footer">
        <button type="button" onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
        <button type="button" onClick={() => setOpen(false)}>Done</button>
      </div>
    </div> : null}
  </span>;
}
