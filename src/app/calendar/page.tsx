'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HubHero, PageShell } from '@/components/Ui';
import { useTopbarMobileTrailingAction } from '@/components/TopbarContext';
import { browserTimeZone, formatEventDate } from '@/lib/eventTime';
import { loadCalendarFeed, loadCalendarReleaseEntries, type CalendarEntry } from '@/lib/domain/events';

const mobileListPageSize = 20;

function monthBounds(date: Date) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
  };
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function localDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function entryDayKey(entry: CalendarEntry) {
  return localDayKey(new Date(entry.starts_at));
}

function entriesByDay(entries: CalendarEntry[]) {
  return entries.reduce<Record<string, CalendarEntry[]>>((groups, entry) => {
    const key = entryDayKey(entry);
    (groups[key] ??= []).push(entry);
    return groups;
  }, {});
}

function sortEntries(entries: CalendarEntry[]) {
  return [...entries].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

function calendarToggleIcon(isListView: boolean) {
  return isListView ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" />
      <path d="M10 6h10M10 12h10M10 18h10" />
    </svg>
  );
}

export default function CalendarPage() {
  const now = new Date();
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(() => localDayKey(now));
  const [isListView, setIsListView] = useState(false);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [mobileEntries, setMobileEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileLoading, setMobileLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [listEntries, setListEntries] = useState<CalendarEntry[]>([]);
  const [listState, setListState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [listRetry, setListRetry] = useState(0);
  const [visibleListDayCount, setVisibleListDayCount] = useState(mobileListPageSize);
  const listSentinelRef = useRef<HTMLDivElement | null>(null);
  const bounds = useMemo(() => monthBounds(month), [month]);
  const monthGroups = useMemo(() => entriesByDay(mobileEntries), [mobileEntries]);
  const listGroups = useMemo(() => entriesByDay(listEntries), [listEntries]);
  const listDays = useMemo(() => Object.keys(listGroups).sort((a, b) => b.localeCompare(a)), [listGroups]);
  const visibleListDays = useMemo(() => listDays.slice(0, visibleListDayCount), [listDays, visibleListDayCount]);

  function changeMonth(offset: number) {
    setMobileLoading(true);
    setMobileError('');
    setMonth(value => new Date(value.getFullYear(), value.getMonth() + offset, 1));
  }

  const mobileTrailingAction = useMemo(() => (
    <button
      type="button"
      className="ui44-symbol-button"
      aria-label={isListView ? 'Switch to Calendar View' : 'Switch to List View'}
      title={isListView ? 'Switch to Calendar View' : 'Switch to List View'}
      onClick={() => setIsListView(value => !value)}
    >
      {calendarToggleIcon(isListView)}
    </button>
  ), [isListView]);
  useTopbarMobileTrailingAction(mobileTrailingAction);

  // Keep the current desktop calendar feed and markup unchanged.
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setError('');
        return loadCalendarFeed(bounds.start.toISOString(), bounds.end.toISOString());
      })
      .then(setEntries)
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load Calendar.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bounds]);

  // Mobile month view follows iOS: visible events plus published music/book
  // release_date values, grouped by the user's local calendar day.
  useEffect(() => {
    let active = true;
    Promise.all([
      loadCalendarFeed(bounds.start.toISOString(), bounds.end.toISOString()),
      loadCalendarReleaseEntries(localDayKey(bounds.start), localDayKey(bounds.end)),
    ])
      .then(([feed, releases]) => {
        if (!active) return;
        setMobileEntries(sortEntries([...feed.filter(entry => entry.source_type === 'event'), ...releases]));
      })
      .catch(reason => {
        if (active) setMobileError(reason instanceof Error ? reason.message : 'Could not load Calendar.');
      })
      .finally(() => { if (active) setMobileLoading(false); });
    return () => { active = false; };
  }, [bounds]);

  // iOS list mode loads the entire visible event and release history once,
  // then progressively renders 20 date groups at a time.
  useEffect(() => {
    if (!isListView || listState !== 'idle') return;
    let active = true;
    Promise.all([
      loadCalendarFeed('0001-01-01T00:00:00.000Z', '9999-01-01T00:00:00.000Z'),
      loadCalendarReleaseEntries(),
    ])
      .then(([feed, releases]) => {
        if (!active) return;
        setListEntries(sortEntries([...feed.filter(entry => entry.source_type === 'event'), ...releases]));
        setListState('loaded');
        setVisibleListDayCount(mobileListPageSize);
      })
      .catch(() => { if (active) setListState('error'); });
    return () => { active = false; };
  }, [isListView, listState, listRetry]);

  useEffect(() => {
    if (!isListView || visibleListDayCount >= listDays.length) return;
    const sentinel = listSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleListDayCount(count => count + mobileListPageSize);
    }, { rootMargin: '240px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isListView, listDays.length, visibleListDayCount]);

  const monthDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const leadingBlanks = first.getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array<Date | null>(leadingBlanks).fill(null),
      ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)),
    ];
  }, [month]);

  return (
    <PageShell>
      <main className="app-page calendar-page ui44-calendar">
        <HubHero title="Calendar" />
        <div className="calendar-divider" />

        <div className="calendar-mobile-view" aria-label="Community Calendar">
          {isListView ? (
            <div className="calendar-mobile-list" aria-label="Calendar agenda">
              {listState === 'idle' || listState === 'loading' ? (
                <div className="calendar-state" role="status" aria-live="polite">Loading Calendar...</div>
              ) : listState === 'error' ? (
                <div className="calendar-state" role="alert">
                  <p>Could not load Calendar.</p>
                  <button type="button" className="os-button os-button-secondary" onClick={() => { setListState('idle'); setListRetry(value => value + 1); }}>Try again</button>
                </div>
              ) : listDays.length === 0 ? (
                <div className="calendar-state">Nothing scheduled. Events and releases will appear here.</div>
              ) : (
                <>
                  {visibleListDays.map(day => (
                    <section className="calendar-mobile-date-group" key={day}>
                      <h2>{formatDayLabel(day)}</h2>
                      <div className="calendar-mobile-rows">
                        {listGroups[day].map(entry => <MobileCalendarRow key={`${entry.source_type}-${entry.source_id}`} entry={entry} />)}
                      </div>
                    </section>
                  ))}
                  {visibleListDays.length < listDays.length ? <div ref={listSentinelRef} className="calendar-mobile-list-sentinel" aria-hidden="true" /> : null}
                </>
              )}
            </div>
          ) : (
            <>
              <div className="calendar-mobile-month-heading">
                <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>
                  <span aria-hidden="true">‹</span>
                </button>
                <h2 aria-live="polite">{monthLabel(month)}</h2>
                <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>
                  <span aria-hidden="true">›</span>
                </button>
              </div>
              {mobileError ? (
                <div className="calendar-state" role="alert">Could not load Calendar.</div>
              ) : mobileLoading ? (
                <div className="calendar-state" role="status" aria-live="polite">Loading Calendar...</div>
              ) : (
                <>
                  <div className="calendar-mobile-grid" role="grid" aria-label={`${monthLabel(month)} calendar`}>
                    <div className="calendar-mobile-weekdays" role="row">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <span role="columnheader" aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]} key={`${day}-${index}`}>{day}</span>
                      ))}
                    </div>
                    <div className="calendar-mobile-days">
                      {monthDays.map((day, index) => {
                        if (!day) return <span className="calendar-mobile-day-blank" aria-hidden="true" key={`blank-${index}`} />;
                        const dayKey = localDayKey(day);
                        const hasEntries = Boolean(monthGroups[dayKey]?.length);
                        const isSelected = selectedDay === dayKey;
                        return (
                          <button
                            type="button"
                            role="gridcell"
                            key={dayKey}
                            className={`calendar-mobile-day${isSelected ? ' is-selected' : ''}`}
                            aria-label={day.toLocaleDateString(undefined, { dateStyle: 'full' })}
                            aria-selected={isSelected}
                            onClick={() => setSelectedDay(dayKey)}
                          >
                            <span>{day.getDate()}</span>
                            <i className={hasEntries ? 'has-entry' : ''} aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <section className="calendar-mobile-selected-day" aria-label="Selected day events">
                    <h2>{formatDayLabel(selectedDay)}</h2>
                    {mobileLoading ? (
                      <div className="calendar-state" role="status">Loading Calendar...</div>
                    ) : (monthGroups[selectedDay] ?? []).length === 0 ? (
                      <div className="calendar-state calendar-mobile-day-empty">Nothing on this day.</div>
                    ) : (
                      <div className="calendar-mobile-rows">
                        {(monthGroups[selectedDay] ?? []).map(entry => <MobileCalendarRow key={`${entry.source_type}-${entry.source_id}`} entry={entry} />)}
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>

        <section
          className="calendar-surface ui44-calendar-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip"
          aria-label="Community Calendar"
        >
          <header className="calendar-toolbar ui44-calendar-toolbar">
            <button
              type="button"
              className="os-button os-button-secondary os-button-compact"
              aria-label="Previous month"
              onClick={() => changeMonth(-1)}
            >
              Previous
            </button>
            <h2 className="ui44-type ui44-type-subsection-title" aria-live="polite">{monthLabel(month)}</h2>
            <button
              type="button"
              className="os-button os-button-secondary os-button-compact"
              aria-label="Next month"
              onClick={() => changeMonth(1)}
            >
              Next
            </button>
          </header>

          {error ? (
            <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div>
          ) : loading ? (
            <div className="calendar-state ui44-state ui44-state-loading" role="status" aria-live="polite">Loading Calendar...</div>
          ) : (
            <>
              <div className="calendar-month ui44-calendar-month" role="grid" aria-label={`${monthLabel(month)} calendar`}>
                <div className="calendar-weekdays ui44-calendar-weekdays" role="row">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <span role="columnheader" key={day}>{day}</span>
                  ))}
                </div>
                <div className="calendar-days ui44-calendar-days">
                  {monthDays.map((day, index) => (
                    <div
                      role="gridcell"
                      className={`calendar-day ui44-calendar-day ${day ? '' : 'calendar-day-empty'}`}
                      key={day ? localDayKey(day) : `blank-${index}`}
                      aria-label={day ? `${month.toLocaleDateString(undefined, { month: 'long' })} ${day.getDate()}` : undefined}
                    >
                      {day ? (
                        <>
                          <span className="calendar-day-number">{day.getDate()}</span>
                          {entries
                            .filter(entry => new Date(entry.starts_at).getDate() === day.getDate())
                            .map(entry => (
                              <CalendarEntryLink key={`${entry.source_type}-${entry.source_id}`} entry={entry} compact />
                            ))}
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              <div className="calendar-agenda ui44-calendar-agenda" aria-label="Calendar agenda">
                {entries.length === 0 ? (
                  <div className="calendar-state ui44-state ui44-state-empty">Nothing scheduled this month.</div>
                ) : entries.map(entry => (
                  <CalendarEntryLink key={`${entry.source_type}-${entry.source_id}`} entry={entry} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </PageShell>
  );
}

function formatDayLabel(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { dateStyle: 'full' });
}

function MobileCalendarRow({ entry }: { entry: CalendarEntry }) {
  const href = entry.source_type === 'release'
    ? `/store/item/${entry.item_slug || entry.source_id}`
    : `/events/${entry.source_id}`;
  const creator = entry.profile_display_name || entry.profile_username || '';

  return (
    <Link href={href} className="calendar-mobile-row ui44-panel ui44-panel-glass">
      {entry.item_cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="calendar-mobile-row-art" src={entry.item_cover_url} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="calendar-mobile-row-art calendar-mobile-row-placeholder" aria-hidden="true" />
      )}
      <span className="calendar-mobile-row-copy">
        <strong>{entry.title}</strong>
        {creator ? <span>{creator}</span> : null}
      </span>
    </Link>
  );
}

function CalendarEntryLink({ entry, compact = false }: { entry: CalendarEntry; compact?: boolean }) {
  const href = entry.source_type === 'release'
    ? `/store/item/${entry.item_slug || entry.source_id}`
    : `/profile/${entry.profile_slug || entry.profile_username || entry.creator_id}?tab=events`;
  const source = entry.source_type === 'release'
    ? 'Upcoming Release'
    : entry.format?.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');

  return (
    <article className={`calendar-entry ui44-calendar-entry ${entry.state === 'cancelled' ? 'calendar-entry-cancelled' : ''}`}>
      <Link href={href}>
        <span className="calendar-entry-source">{source}</span>
        <strong>{entry.title}</strong>
        {!compact ? (
          <>
            <time dateTime={entry.starts_at}>{formatEventDate(entry.starts_at, entry.timezone || browserTimeZone())}</time>
            {entry.venue_name ? <span>{[entry.venue_name, entry.locality, entry.region].filter(Boolean).join(' · ')}</span> : null}
            {entry.state === 'cancelled' ? <span>Cancelled</span> : null}
          </>
        ) : null}
      </Link>
      {!compact ? (
        <div className="calendar-entry-actions">
          {entry.online_url ? <a className="ui44-external-link" href={entry.online_url} target="_blank" rel="noopener noreferrer">Online Destination</a> : null}
          {entry.info_url ? <a className="ui44-external-link" href={entry.info_url} target="_blank" rel="noopener noreferrer">Tickets / Information</a> : null}
        </div>
      ) : null}
    </article>
  );
}
