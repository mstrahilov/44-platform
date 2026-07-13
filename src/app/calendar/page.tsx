'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { HubHero, PageShell } from '@/components/Ui';
import { formatEventDate } from '@/lib/eventTime';
import { loadCalendarFeed, type CalendarEntry } from '@/lib/domain/events';

function monthBounds(date: Date) { const start=new Date(date.getFullYear(),date.getMonth(),1); const end=new Date(date.getFullYear(),date.getMonth()+1,1); return {start,end}; }
export default function CalendarPage(){
  const [month,setMonth]=useState(()=>{const now=new Date();return new Date(now.getFullYear(),now.getMonth(),1);});
  const [entries,setEntries]=useState<CalendarEntry[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  const bounds=useMemo(()=>monthBounds(month),[month]);
  useEffect(()=>{Promise.resolve().then(()=>{setLoading(true);setError('');return loadCalendarFeed(bounds.start.toISOString(),bounds.end.toISOString());}).then(setEntries).catch(e=>setError(e instanceof Error?e.message:'Could not load Calendar.')).finally(()=>setLoading(false));},[bounds]);
  const days=useMemo(()=>{const first=bounds.start.getDay();const count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();return [...Array(first).fill(null),...Array.from({length:count},(_,i)=>i+1)];},[bounds,month]);
  return <PageShell><main className="app-page calendar-page"><HubHero title="Calendar" /><div className="calendar-divider" />
    <section className="calendar-surface" aria-label="Community Calendar"><header className="calendar-toolbar"><button className="os-button os-button-secondary os-button-compact" aria-label="Previous month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>Previous</button><h2 aria-live="polite">{month.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h2><button className="os-button os-button-secondary os-button-compact" aria-label="Next month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>Next</button></header>
    {error?<div className="dashboard-status dashboard-status-error" role="alert">{error}</div>:loading?<div className="calendar-state">Loading Calendar...</div>:<>
      <div className="calendar-month" role="grid" aria-label={`${month.toLocaleDateString(undefined,{month:'long',year:'numeric'})} calendar`}><div className="calendar-weekdays" role="row">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><span role="columnheader" key={day}>{day}</span>)}</div><div className="calendar-days">{days.map((day,index)=><div role="gridcell" className={`calendar-day ${day?'':'calendar-day-empty'}`} key={day??`blank-${index}`} aria-label={day?`${month.toLocaleDateString(undefined,{month:'long'})} ${day}`:undefined}>{day&&<><span className="calendar-day-number">{day}</span>{entries.filter(entry=>new Date(entry.starts_at).getDate()===day).map(entry=><CalendarEntryLink key={`${entry.source_type}-${entry.source_id}`} entry={entry} compact />)}</>}</div>)}</div></div>
      <div className="calendar-agenda" aria-label="Calendar agenda">{entries.length===0?<div className="calendar-state">Nothing scheduled this month.</div>:entries.map(entry=><CalendarEntryLink key={`${entry.source_type}-${entry.source_id}`} entry={entry} />)}</div>
    </>}</section></main></PageShell>;
}
function CalendarEntryLink({entry,compact=false}:{entry:CalendarEntry;compact?:boolean}){const href=entry.source_type==='release'?`/store/item/${entry.item_slug||entry.source_id}`:`/profile/${entry.profile_slug||entry.profile_username||entry.creator_id}?tab=events`;return <article className={`calendar-entry ${entry.state==='cancelled'?'calendar-entry-cancelled':''}`}><Link href={href}><span className="calendar-entry-source">{entry.source_type==='release'?'Upcoming Release':entry.format?.split('_').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}</span><strong>{entry.title}</strong>{!compact&&<><time dateTime={entry.starts_at}>{formatEventDate(entry.starts_at,entry.timezone)}</time>{entry.venue_name&&<span>{[entry.venue_name,entry.locality,entry.region].filter(Boolean).join(' · ')}</span>}{entry.state==='cancelled'&&<span>Cancelled</span>}</>}</Link>{!compact&&<div className="calendar-entry-actions">{entry.online_url&&<a href={entry.online_url} target="_blank" rel="noopener noreferrer">Online Destination</a>}{entry.info_url&&<a href={entry.info_url} target="_blank" rel="noopener noreferrer">Tickets / Information</a>}</div>}</article>}
