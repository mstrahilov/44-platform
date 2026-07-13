'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import { useAuth } from '@/lib/useAuth';
import { browserTimeZone, instantFromLocalInput, localInputFromInstant } from '@/lib/eventTime';
import { getCreatorEvent, saveCreatorEvent, type EventFormat } from '@/lib/domain/events';
import { clearStudioFormRecovery, readStudioFormRecovery, writeStudioFormRecovery } from '@/lib/studioFormRecovery';

type Draft = { title:string;shortDescription:string;format:EventFormat;startLocal:string;endLocal:string;timezone:string;venueName:string;address1:string;address2:string;locality:string;region:string;postalCode:string;countryCode:string;onlineUrl:string;infoUrl:string };
const blank = (): Draft => ({ title:'',shortDescription:'',format:'in_person',startLocal:'',endLocal:'',timezone:browserTimeZone(),venueName:'',address1:'',address2:'',locality:'',region:'',postalCode:'',countryCode:'',onlineUrl:'',infoUrl:'' });

export default function StudioEventEditor() {
  const { id } = useParams<{id:string}>(); const isNew=id==='new'; const { user }=useAuth(); const router=useRouter();
  const returnHref = isNew ? '/studio' : '/studio/events';
  useTopbarBack({ href: returnHref, label: isNew ? 'Studio' : 'Events' });
  const [draft,setDraft]=useState<Draft>(blank); const [ready,setReady]=useState(false); const [saving,setSaving]=useState(false); const [error,setError]=useState('');
  const recoveryKey=useMemo(()=>user?`44os:studio:event:v1:${user.id}:${isNew?'new':id}`:'',[user,id,isNew]);
  useEffect(()=>{ if(!user||!recoveryKey)return; (async()=>{ try { const recovered=readStudioFormRecovery<Draft>(recoveryKey); if(recovered){setDraft(recovered);setReady(true);return;} if(!isNew){const event=await getCreatorEvent(id);if(!event)throw new Error('Event not found.');setDraft({title:event.title,shortDescription:event.short_description,format:event.format,startLocal:localInputFromInstant(event.starts_at,event.timezone),endLocal:event.ends_at?localInputFromInstant(event.ends_at,event.timezone):'',timezone:event.timezone,venueName:event.venue_name??'',address1:event.address_line1??'',address2:event.address_line2??'',locality:event.locality??'',region:event.region??'',postalCode:event.postal_code??'',countryCode:event.country_code??'',onlineUrl:event.online_url??'',infoUrl:event.info_url??''});} setReady(true);}catch(e){setError(e instanceof Error?e.message:'Could not load event.');setReady(true);}})();},[user,recoveryKey,id,isNew]);
  useEffect(()=>{if(ready&&recoveryKey)writeStudioFormRecovery(recoveryKey,draft);},[draft,ready,recoveryKey]);
  const set=(key:keyof Draft,value:string)=>setDraft(current=>({...current,[key]:value}));
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setError('');try{const starts=instantFromLocalInput(draft.startLocal,draft.timezone);const ends=draft.endLocal?instantFromLocalInput(draft.endLocal,draft.timezone):null;if(ends&&new Date(ends)<=new Date(starts))throw new Error('End must be after start.');await saveCreatorEvent(isNew?null:id,{title:draft.title,short_description:draft.shortDescription,format:draft.format,starts_at:starts,ends_at:ends,timezone:draft.timezone,venue_name:draft.format==='online'?null:draft.venueName,address_line1:draft.format==='online'?null:draft.address1,address_line2:draft.format==='online'?null:draft.address2,locality:draft.format==='online'?null:draft.locality,region:draft.format==='online'?null:draft.region,postal_code:draft.format==='online'?null:draft.postalCode,country_code:draft.format==='online'?null:draft.countryCode.toUpperCase(),online_url:draft.format==='in_person'?null:draft.onlineUrl,info_url:draft.infoUrl});clearStudioFormRecovery(recoveryKey);router.push('/studio/events');}catch(saveError){setError(saveError instanceof Error?saveError.message:'Could not save event.');setSaving(false);}}
  if (!ready) return <PageShell><main className="dashboard-editor"><HubHero title={isNew ? 'New Event' : 'Edit Event'} /><div>Loading...</div></main></PageShell>;

  return (
    <PageShell>
      <main className="dashboard-editor">
        <HubHero title={isNew ? 'New Event' : 'Edit Event'} />
        <div className="dashboard-section">
          <form className="dashboard-form" onSubmit={submit}>
            <section className="dashboard-form-section">
              <SectionHeader title="Details" description="Name the event and choose how people can attend." />
              <div className="dashboard-form-step">
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Title</div>
                  <input className="os-input-field" required maxLength={120} value={draft.title} onChange={event => set('title', event.target.value)} />
                </label>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Short Description</div>
                  <textarea className="os-input-field dashboard-textarea" required maxLength={280} value={draft.shortDescription} onChange={event => set('shortDescription', event.target.value)} />
                </label>
                <div className="dashboard-form-grid dashboard-form-grid-3">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Format</div>
                    <select className="os-input-field" value={draft.format} onChange={event => set('format', event.target.value)}>
                      <option value="in_person">In Person</option>
                      <option value="online">Online</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </label>
                </div>
              </div>
            </section>

            <section className="dashboard-form-section">
              <SectionHeader title="When" description="Enter the event's local start and optional end time." />
              <div className="dashboard-form-step">
                <div className="dashboard-form-grid dashboard-form-grid-2">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Start</div>
                    <input type="datetime-local" className="os-input-field" required value={draft.startLocal} onChange={event => set('startLocal', event.target.value)} />
                  </label>
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">End (Optional)</div>
                    <input type="datetime-local" className="os-input-field" value={draft.endLocal} onChange={event => set('endLocal', event.target.value)} />
                  </label>
                </div>
              </div>
            </section>

            {draft.format !== 'online' && <section className="dashboard-form-section">
              <SectionHeader title="Location" description="Add the venue and address people should use." />
              <div className="dashboard-form-step">
                <div className="dashboard-form-grid dashboard-form-grid-2">
                  <label className="dashboard-field"><div className="dashboard-field-label">Venue</div><input required className="os-input-field" value={draft.venueName} onChange={event => set('venueName', event.target.value)} /></label>
                  <label className="dashboard-field"><div className="dashboard-field-label">Address</div><input required className="os-input-field" value={draft.address1} onChange={event => set('address1', event.target.value)} /></label>
                  <label className="dashboard-field"><div className="dashboard-field-label">City</div><input required className="os-input-field" value={draft.locality} onChange={event => set('locality', event.target.value)} /></label>
                </div>
              </div>
            </section>}

            {draft.format !== 'in_person' && <section className="dashboard-form-section">
              <SectionHeader title="Online" description="Add the secure destination where attendees will join." />
              <div className="dashboard-form-step">
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Online Destination</div>
                  <input type="url" required className="os-input-field" value={draft.onlineUrl} onChange={event => set('onlineUrl', event.target.value)} />
                </label>
              </div>
            </section>}

            <section className="dashboard-form-section">
              <SectionHeader title="Information" description="Optionally link to external tickets or additional event details." />
              <div className="dashboard-form-step">
                <label className="dashboard-field">
                  <div className="dashboard-field-label">External Ticket or Information URL (Optional)</div>
                  <input type="url" className="os-input-field" value={draft.infoUrl} onChange={event => set('infoUrl', event.target.value)} />
                </label>
                <span className="dashboard-form-note">44OS does not sell or fulfill event tickets.</span>
              </div>
            </section>

            {error && <div className="dashboard-status dashboard-status-error" role="alert">{error}</div>}
            <div className="dashboard-form-actions">
              <Link className="os-button os-button-secondary" href={returnHref} onClick={() => clearStudioFormRecovery(recoveryKey)}>Cancel</Link>
              <button disabled={saving} className="os-button os-button-primary">{saving ? 'Saving...' : 'Save Event'}</button>
            </div>
          </form>
        </div>
      </main>
    </PageShell>
  );
}
