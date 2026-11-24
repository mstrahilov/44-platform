'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { useTopbarBack, useTopbarMobileTrailingAction } from '@/components/TopbarContext';
import { StudioCreateCancel } from '@/components/StudioCreateCancel';
import { useAuth } from '@/lib/useAuth';
import { browserTimeZone, instantFromLocalInput, localInputFromInstant } from '@/lib/eventTime';
import { getCreatorEvent, getCreatorEventRelatedRelease, saveCreatorEvent, setCreatorEventRelatedRelease, setCreatorEventState, type EventFormat } from '@/lib/domain/events';
import { listCreatorItems } from '@/lib/domain/studio';
import { clearStudioFormRecovery, readStudioFormRecovery, writeStudioFormRecovery } from '@/lib/studioFormRecovery';
import { Ui44SelectInput, Ui44TextInput, Ui44Textarea } from '@/components/ui44/Inputs';
import { UploadField } from '@/components/UploadField';
import { StudioDateTimeInput } from '@/components/StudioDateInput';
import { StudioReleasePicker, type StudioReleasePickerItem } from '@/components/StudioReleasePicker';

type Draft = { title:string;shortDescription:string;format:EventFormat | '';startLocal:string;endLocal:string;timezone:string;locationText:string;onlineUrl:string;infoUrl:string;coverUrl:string;relatedReleaseEnabled:boolean;relatedReleaseId:string };
const blank = (): Draft => ({ title:'',shortDescription:'',format:'',startLocal:'',endLocal:'',timezone:browserTimeZone(),locationText:'',onlineUrl:'',infoUrl:'',coverUrl:'',relatedReleaseEnabled:false,relatedReleaseId:'' });

export default function StudioEventEditor() {
  const { id } = useParams<{id:string}>(); const isNew=id==='new'; const { user }=useAuth(); const router=useRouter();
  const returnHref = isNew ? '/studio' : '/studio/events';
  useTopbarBack(isNew ? undefined : { href: returnHref, label: 'Events' });
  const [draft,setDraft]=useState<Draft>(blank); const [relatedReleases,setRelatedReleases]=useState<StudioReleasePickerItem[]>([]); const [releasePickerOpen,setReleasePickerOpen]=useState(false); const [ready,setReady]=useState(false); const [saving,setSaving]=useState(false); const [uploading,setUploading]=useState(false); const [deleting,setDeleting]=useState(false); const [error,setError]=useState('');
  const mobileSaveAction=useMemo(()=> <button type="submit" form="studio-event-form" className="ui44-symbol-button studio-music-publish-action" aria-label="Save event" title="Save event" disabled={!user||!ready||saving||uploading}><EventSaveIcon /></button>,[ready,saving,uploading,user]);
  useTopbarMobileTrailingAction(mobileSaveAction);
  const recoveryKey=useMemo(()=>user?`44os:studio:event:v1:${user.id}:${isNew?'new':id}`:'',[user,id,isNew]);
  useEffect(()=>{ if(!user||!recoveryKey)return; (async()=>{ try { const recovered=readStudioFormRecovery<Draft>(recoveryKey); const releases=await listCreatorItems(user.id); setRelatedReleases(releases.filter(item=>item.experience_type==='music').map(item=>({id:item.id,title:item.title,cover_url:item.cover_url,item_type:item.browse_type?.label||item.item_type||null,experience_type:item.experience_type||null}))); if(recovered){setDraft({...blank(),...recovered});setReady(true);return;} if(!isNew){const event=await getCreatorEvent(id);if(!event)throw new Error('Event not found.');const relatedReleaseId=await getCreatorEventRelatedRelease(id);setDraft({title:event.title,shortDescription:event.short_description,format:event.format,startLocal:localInputFromInstant(event.starts_at,event.timezone),endLocal:event.ends_at?localInputFromInstant(event.ends_at,event.timezone):'',timezone:event.timezone,locationText:[event.venue_name,event.address_line1,event.address_line2,event.locality,event.region,event.postal_code,event.country_code].filter(Boolean).join(', '),onlineUrl:event.online_url??'',infoUrl:event.info_url??'',coverUrl:event.cover_url??'',relatedReleaseEnabled:Boolean(relatedReleaseId),relatedReleaseId:relatedReleaseId??''});} setReady(true);}catch(e){setError(e instanceof Error?e.message:'Could not load event.');setReady(true);}})();},[user,recoveryKey,id,isNew]);
  useEffect(()=>{if(ready&&recoveryKey)writeStudioFormRecovery(recoveryKey,draft);},[draft,ready,recoveryKey]);
  const set=(key:keyof Draft,value:string)=>setDraft(current=>({...current,[key]:value}));
  const eventDirty = isNew && Boolean(
    draft.title.trim() || draft.shortDescription.trim() || draft.format || draft.startLocal || draft.endLocal ||
    draft.locationText.trim() || draft.onlineUrl.trim() || draft.relatedReleaseEnabled || draft.relatedReleaseId ||
    draft.infoUrl.trim() || draft.coverUrl
  );
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setError('');try{if(!draft.startLocal||!draft.endLocal)throw new Error('Enter both a start and end date.');if(!draft.format)throw new Error('Choose an event location.');const starts=instantFromLocalInput(draft.startLocal,draft.timezone);const ends=instantFromLocalInput(draft.endLocal,draft.timezone);if(new Date(ends)<=new Date(starts))throw new Error('End must be after start.');const isOnline=draft.format==='online';const isVenue=draft.format==='in_person'||draft.format==='hybrid';if(isVenue&&!draft.locationText.trim())throw new Error('Enter the venue address.');if((draft.format==='online'||draft.format==='hybrid')&&!draft.onlineUrl.trim())throw new Error('Enter the online event URL.');const savedEventId=await saveCreatorEvent(isNew?null:id,{title:draft.title,short_description:draft.shortDescription,format:draft.format,starts_at:starts,ends_at:ends,timezone:draft.timezone,venue_name:isVenue?draft.locationText.trim():null,address_line1:null,address_line2:null,locality:null,region:null,postal_code:null,country_code:null,online_url:isOnline||draft.format==='hybrid'?draft.onlineUrl.trim():null,info_url:draft.infoUrl||null,cover_url:draft.coverUrl||null});await setCreatorEventRelatedRelease(savedEventId,draft.relatedReleaseEnabled?draft.relatedReleaseId||null:null);clearStudioFormRecovery(recoveryKey);router.push('/studio/events');}catch(saveError){setError(saveError instanceof Error?saveError.message:'Could not save event.');setSaving(false);}}
  async function deleteEvent(){if(isNew)return;setDeleting(true);setError('');try{await setCreatorEventState(id,'removed');clearStudioFormRecovery(recoveryKey);router.push('/studio/events');}catch(deleteError){setError(deleteError instanceof Error?deleteError.message:'Could not delete event.');setDeleting(false);}}
  if (!ready) return <PageShell><main className="dashboard-editor"><HubHero title={isNew ? 'New Event' : 'Edit Event'} hideDivider={isNew} /><div className="ui44-state ui44-state-loading" role="status" aria-live="polite">Loading...</div></main></PageShell>;

  return (
    <PageShell>
      {isNew ? <StudioCreateCancel dirty={eventDirty} recoveryKey={recoveryKey} href="/studio" /> : null}
      <main className="dashboard-editor">
        <HubHero title={isNew ? 'New Event' : 'Edit Event'} hideDivider={isNew} actions={<button type="submit" form="studio-event-form" className="ui44-symbol-button studio-music-publish-desktop" aria-label="Save event" title="Save event" disabled={!user||!ready||saving||uploading}><EventSaveIcon /></button>} />
        <div className="dashboard-section">
          <form id="studio-event-form" className="dashboard-form studio-music-create-form" onSubmit={submit}>
            <UploadField label="Event artwork" folder="events/covers" userId={user?.id ?? ''} value={draft.coverUrl} accept="image/*" artworkSurface onChange={value=>set('coverUrl',value)} onUploadingChange={setUploading} />
            <section className="dashboard-form-section">
              <SectionHeader title="Details" description="Add the event’s core details." showDescription />
              <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Title</div>
                  <Ui44TextInput className="os-input-field" required maxLength={120} value={draft.title} placeholder="Enter event title" onChange={event => set('title', event.target.value)} />
                </label>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Description</div>
                  <Ui44Textarea className="os-input-field dashboard-textarea" required maxLength={280} value={draft.shortDescription} placeholder="Enter description" onChange={event => set('shortDescription', event.target.value)} />
                </label>
                <div className="dashboard-form-grid dashboard-form-grid-2 ui44-form-grid">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Start date and time</div>
                    <StudioDateTimeInput required value={draft.startLocal} placeholder="Select start date and time" onChange={value => set('startLocal', value)} />
                  </label>
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">End date and time</div>
                    <StudioDateTimeInput required value={draft.endLocal} placeholder="Select end date and time" onChange={value => set('endLocal', value)} />
                  </label>
                </div>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Event location</div>
                  <Ui44SelectInput value={draft.format} onChange={event => set('format', event.target.value)}>
                    <option value="">Select event location</option>
                    <option value="in_person">Venue</option>
                    <option value="online">Online</option>
                    {draft.format === 'hybrid' ? <option value="hybrid">Hybrid (legacy)</option> : null}
                  </Ui44SelectInput>
                </label>
                {(draft.format === 'in_person' || draft.format === 'hybrid') ? <label className="dashboard-field">
                  <div className="dashboard-field-label">Venue address</div>
                  <Ui44TextInput required className="os-input-field" value={draft.locationText} placeholder="Enter venue address" onChange={event => set('locationText', event.target.value)} />
                </label> : null}
                {(draft.format === 'online' || draft.format === 'hybrid') ? <label className="dashboard-field">
                  <div className="dashboard-field-label">Online URL</div>
                  <Ui44TextInput required type="url" className="os-input-field" value={draft.onlineUrl} placeholder="Enter online event URL" onChange={event => set('onlineUrl', event.target.value)} />
                </label> : null}
              </div>
            </section>

            <section className="dashboard-form-section">
              <SectionHeader
                title="Related Release"
                description="Attach this item to a related release."
                showDescription
                alignActionWithTitle
                action={<button
                  type="button"
                  role="switch"
                  aria-label="Enable related release"
                  aria-checked={draft.relatedReleaseEnabled}
                  className={draft.relatedReleaseEnabled ? 'settings-toggle settings-toggle-on ui44-switch ui44-switch-on' : 'settings-toggle ui44-switch'}
                  onClick={() => setDraft(current => ({ ...current, relatedReleaseEnabled: !current.relatedReleaseEnabled, relatedReleaseId: current.relatedReleaseEnabled ? '' : current.relatedReleaseId }))}
                />}
              />
              {draft.relatedReleaseEnabled ? <div className="studio-video-release-picker-controls">
                {relatedReleases.find(release => release.id === draft.relatedReleaseId) ? (() => {
                  const release = relatedReleases.find(item => item.id === draft.relatedReleaseId)!;
                  return <div className="studio-video-release-row studio-video-release-row-selected">
                    {release.cover_url ? <img className="studio-video-release-artwork" src={release.cover_url} alt="" /> : <span className="studio-video-release-placeholder" aria-hidden="true">44</span>}
                    <span className="studio-video-release-title">{release.title}</span>
                    <button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => setReleasePickerOpen(true)}>Change</button>
                  </div>;
                })() : <button type="button" className="os-button os-button-secondary studio-video-select-release-button" onClick={() => setReleasePickerOpen(true)}>Select Release</button>}
              </div> : null}
            </section>

            {!isNew ? <section className="dashboard-form-section">
              <SectionHeader title="Event Management" description="Remove this event from your profile and the calendar." />
              <button type="button" className="os-button os-button-danger" disabled={deleting||saving||uploading} onClick={() => { if (window.confirm('Delete this event? It will no longer appear on your profile or the calendar.')) void deleteEvent(); }}>Delete Event</button>
            </section> : null}

            {error && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div>}
          </form>
        </div>
      </main>
      {releasePickerOpen ? <StudioReleasePicker
        releases={relatedReleases}
        selectedId={draft.relatedReleaseId}
        onSelect={release => {
          setDraft(current => ({ ...current, relatedReleaseEnabled: true, relatedReleaseId: release.id }));
          setReleasePickerOpen(false);
        }}
        onClose={() => setReleasePickerOpen(false)}
      /> : null}
    </PageShell>
  );
}

function EventSaveIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}
