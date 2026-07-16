'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { HubHero, PageShell } from '@/components/Ui';
import { formatEventDate } from '@/lib/eventTime';
import { loadCalendarFeed, type CalendarEntry } from '@/lib/domain/events';

function monthBounds(date: Date) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
  };
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function CalendarPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const bounds = useMemo(() => monthBounds(month), [month]);

  useEffect(() => {
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setError('');
        return loadCalendarFeed(bounds.start.toISOString(), bounds.end.toISOString());
      })
      .then(setEntries)
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load Calendar.'))
      .finally(() => setLoading(false));
  }, [bounds]);

  const days = useMemo(() => {
    const first = bounds.start.getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [bounds, month]);

  return (
    <PageShell>
      <main className="app-page calendar-page ui44-calendar">
        <HubHero title="Calendar" />
        <div className="calendar-divider" />
        <section
          className="calendar-surface ui44-calendar-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip"
          aria-label="Community Calendar"
        >
          <header className="calendar-toolbar ui44-calendar-toolbar">
            <button
              type="button"
              className="os-button os-button-secondary os-button-compact"
              aria-label="Previous month"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            >
              Previous
            </button>
            <h2 className="ui44-type ui44-type-subsection-title" aria-live="polite">{monthLabel(month)}</h2>
            <button
              type="button"
              className="os-button os-button-secondary os-button-compact"
              aria-label="Next month"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
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
                  {days.map((day, index) => (
                    <div
                      role="gridcell"
                      className={`calendar-day ui44-calendar-day ${day ? '' : 'calendar-day-empty'}`}
                      key={day ?? `blank-${index}`}
                      aria-label={day ? `${month.toLocaleDateString(undefined, { month: 'long' })} ${day}` : undefined}
                    >
                      {day ? (
                        <>
                          <span className="calendar-day-number">{day}</span>
                          {entries
                            .filter(entry => new Date(entry.starts_at).getDate() === day)
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
            <time dateTime={entry.starts_at}>{formatEventDate(entry.starts_at, entry.timezone)}</time>
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
