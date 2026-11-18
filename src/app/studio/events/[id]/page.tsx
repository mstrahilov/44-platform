'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { useTopbarBack, useTopbarMobileTrailingAction } from '@/components/TopbarContext';
import { useAuth } from '@/lib/useAuth';
import { browserTimeZone, instantFromLocalInput, localInputFromInstant } from '@/lib/eventTime';
import { getCreatorEvent, saveCreatorEvent, type EventFormat } from '@/lib/domain/events';
import { clearStudioFormRecovery, readStudioFormRecovery, writeStudioFormRecovery } from '@/lib/studioFormRecovery';
import { Ui44SelectInput, Ui44TextInput, Ui44Textarea } from '@/components/ui44/Inputs';
import { UploadField } from '@/components/UploadField';

type Draft = { title:string;shortDescription:string;format:EventFormat | '';startLocal:string;endLocal:string;timezone:string;venueName:string;address1:string;address2:string;locality:string;region:string;postalCode:string;countryCode:string;onlineUrl:string;infoUrl:string;coverUrl:string };
const blank = (): Draft => ({ title:'',shortDescription:'',format:'',startLocal:'',endLocal:'',timezone:browserTimeZone(),venueName:'',address1:'',address2:'',locality:'',region:'',postalCode:'',countryCode:'',onlineUrl:'',infoUrl:'',coverUrl:'' });

export default function StudioEventEditor() {
  const { id } = useParams<{id:string}>(); const isNew=id==='new'; const { user }=useAuth(); const router=useRouter();
  const returnHref = isNew ? '/studio' : '/studio/events';
  useTopbarBack({ href: returnHref, label: isNew ? 'Studio' : 'Events' });
  const [draft,setDraft]=useState<Draft>(blank); const [ready,setReady]=useState(false); const [saving,setSaving]=useState(false); const [uploading,setUploading]=useState(false); const [error,setError]=useState('');
  const mobileSaveAction=useMemo(()=> <button type="submit" form="studio-event-form" className="ui44-symbol-button studio-music-publish-action" aria-label="Save event" title="Save event" disabled={!user||!ready||saving||uploading}><EventSaveIcon /></button>,[ready,saving,uploading,user]);
  useTopbarMobileTrailingAction(mobileSaveAction);
  const recoveryKey=useMemo(()=>user?`44os:studio:event:v1:${user.id}:${isNew?'new':id}`:'',[user,id,isNew]);
  useEffect(()=>{ if(!user||!recoveryKey)return; (async()=>{ try { const recovered=readStudioFormRecovery<Draft>(recoveryKey); if(recovered){setDraft({...blank(),...recovered});setReady(true);return;} if(!isNew){const event=await getCreatorEvent(id);if(!event)throw new Error('Event not found.');setDraft({title:event.title,shortDescription:event.short_description,format:event.format,startLocal:localInputFromInstant(event.starts_at,event.timezone),endLocal:event.ends_at?localInputFromInstant(event.ends_at,event.timezone):'',timezone:event.timezone,venueName:event.venue_name??'',address1:event.address_line1??'',address2:event.address_line2??'',locality:event.locality??'',region:event.region??'',postalCode:event.postal_code??'',countryCode:event.country_code??'',onlineUrl:event.online_url??'',infoUrl:event.info_url??'',coverUrl:event.cover_url??''});} setReady(true);}catch(e){setError(e instanceof Error?e.message:'Could not load event.');setReady(true);}})();},[user,recoveryKey,id,isNew]);
  useEffect(()=>{if(ready&&recoveryKey)writeStudioFormRecovery(recoveryKey,draft);},[draft,ready,recoveryKey]);
  const set=(key:keyof Draft,value:string)=>setDraft(current=>({...current,[key]:value}));
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setError('');try{if(!draft.startLocal||!draft.endLocal)throw new Error('Enter both a start and end date.');if(!draft.format)throw new Error('Choose an event format.');const starts=instantFromLocalInput(draft.startLocal,draft.timezone);const ends=instantFromLocalInput(draft.endLocal,draft.timezone);if(new Date(ends)<=new Date(starts))throw new Error('End must be after start.');await saveCreatorEvent(isNew?null:id,{title:draft.title,short_description:draft.shortDescription,format:draft.format,starts_at:starts,ends_at:ends,timezone:draft.timezone,venue_name:draft.format==='online'?null:draft.venueName,address_line1:draft.format==='online'?null:draft.address1,address_line2:draft.format==='online'?null:draft.address2,locality:draft.format==='online'?null:draft.locality,region:draft.format==='online'?null:draft.region,postal_code:draft.format==='online'?null:draft.postalCode,country_code:draft.format==='online'?null:draft.countryCode.toUpperCase(),online_url:draft.format==='in_person'?null:draft.onlineUrl,info_url:draft.infoUrl,cover_url:draft.coverUrl||null});clearStudioFormRecovery(recoveryKey);router.push('/studio/events');}catch(saveError){setError(saveError instanceof Error?saveError.message:'Could not save event.');setSaving(false);}}
  if (!ready) return <PageShell><main className="dashboard-editor"><HubHero title={isNew ? 'New Event' : 'Edit Event'} hideDivider={isNew} /><div className="ui44-state ui44-state-loading" role="status" aria-live="polite">Loading...</div></main></PageShell>;

  return (
    <PageShell>
      <main className="dashboard-editor">
        <HubHero title={isNew ? 'New Event' : 'Edit Event'} hideDivider={isNew} actions={<button type="submit" form="studio-event-form" className="ui44-symbol-button studio-music-publish-desktop" aria-label="Save event" title="Save event" disabled={!user||!ready||saving||uploading}><EventSaveIcon /></button>} />
        <div className="dashboard-section">
          <form id="studio-event-form" className="dashboard-form studio-music-create-form" onSubmit={submit}>
            <UploadField label="Event artwork" folder="events/covers" userId={user?.id ?? ''} value={draft.coverUrl} accept="image/*" artworkSurface onChange={value=>set('coverUrl',value)} onUploadingChange={setUploading} />
            <section className="dashboard-form-section">
              <SectionHeader title="Details" />
              <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Title</div>
                  <Ui44TextInput className="os-input-field" required maxLength={120} value={draft.title} placeholder="Enter event title" onChange={event => set('title', event.target.value)} />
                </label>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Description</div>
                  <Ui44Textarea className="os-input-field dashboard-textarea" required maxLength={280} value={draft.shortDescription} placeholder="Enter event description" onChange={event => set('shortDescription', event.target.value)} />
                </label>
                <div className="dashboard-form-grid dashboard-form-grid-2 ui44-form-grid">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Start</div>
                    <Ui44TextInput type="datetime-local" className="os-input-field" required value={draft.startLocal} onChange={event => set('startLocal', event.target.value)} />
                  </label>
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">End</div>
                    <Ui44TextInput type="datetime-local" className="os-input-field" required value={draft.endLocal} onChange={event => set('endLocal', event.target.value)} />
                  </label>
                </div>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Format</div>
                  <Ui44SelectInput value={draft.format} onChange={event => set('format', event.target.value)}>
                    <option value="">Select event format</option>
                    <option value="in_person">In Person</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </Ui44SelectInput>
                </label>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">More Info (Link Optional)</div>
                  <Ui44TextInput type="url" className="os-input-field" value={draft.infoUrl} placeholder="Enter URL" onChange={event => set('infoUrl', event.target.value)} />
                </label>
              </div>
            </section>

            {(draft.format === 'in_person' || draft.format === 'hybrid') && <section className="dashboard-form-section">
              <SectionHeader title="Location" description="Add the venue and address people should use." />
              <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
                <div className="dashboard-form-grid dashboard-form-grid-2 ui44-form-grid">
                  <label className="dashboard-field"><div className="dashboard-field-label">Venue</div><Ui44TextInput required className="os-input-field" value={draft.venueName} placeholder="Enter venue name" onChange={event => set('venueName', event.target.value)} /></label>
                  <label className="dashboard-field"><div className="dashboard-field-label">Address</div><Ui44TextInput required className="os-input-field" value={draft.address1} placeholder="Enter street address" onChange={event => set('address1', event.target.value)} /></label>
                  <label className="dashboard-field"><div className="dashboard-field-label">City</div><Ui44TextInput required className="os-input-field" value={draft.locality} placeholder="Enter city" onChange={event => set('locality', event.target.value)} /></label>
                </div>
              </div>
            </section>}

            {(draft.format === 'online' || draft.format === 'hybrid') && <section className="dashboard-form-section">
              <SectionHeader title="Online" description="Add the secure destination where attendees will join." />
              <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Online Destination</div>
                  <Ui44TextInput type="url" required className="os-input-field" value={draft.onlineUrl} placeholder="Enter online event URL" onChange={event => set('onlineUrl', event.target.value)} />
                </label>
              </div>
            </section>}

            {error && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div>}
          </form>
        </div>
      </main>
    </PageShell>
  );
}

function EventSaveIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}
