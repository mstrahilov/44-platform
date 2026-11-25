'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { useTopbarBack, useTopbarMobileTrailingAction, useTopbarTitle } from '@/components/TopbarContext';
import { StudioCreateCancel } from '@/components/StudioCreateCancel';
import { StudioReleasePicker } from '@/components/StudioReleasePicker';
import { Ui44TextInput } from '@/components/ui44/Inputs';
import { OS44Button } from '@/components/OS44Button';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile } from '@/lib/studioProfiles';
import { listCreatorItems } from '@/lib/domain/studio';
import {
  attachCreatorVideoToRelease,
  deleteCreatorVideo,
  detachCreatorVideoFromRelease,
  getCreatorVideo,
  isSupportedYouTubeVideoUrl,
  listVideoAttachedReleases,
  enrichCreatorVideoMetadata,
  saveCreatorVideo,
  updateCreatorVideo,
  type CreatorVideoPage,
  type SavedCreatorVideo,
  type VideoAttachmentTarget,
} from '@/lib/domain/releaseFeatures';

function CheckIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function RemoveAttachmentIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12h11" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>;
}

function SharePlaceholderArtwork() {
  return <span className="studio-video-release-placeholder" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6.5A2.5 2.5 0 0 0 4 22z" /><path d="M4 6.5v13A2.5 2.5 0 0 1 6.5 17H20" /></svg>
  </span>;
}

function StudioVideoToolbar({ pageTitle, mobileSaveAction, editing }: { pageTitle: string; mobileSaveAction: React.ReactNode; editing: boolean }) {
  useTopbarTitle(pageTitle);
  useTopbarBack(editing ? { href: '/studio', label: 'Studio' } : undefined);
  useTopbarMobileTrailingAction(mobileSaveAction);
  return null;
}

export function StudioVideoEditor({
  videoId,
  embedded = false,
  initialReleaseId,
  onSaved,
  onClose,
}: {
  videoId?: string;
  embedded?: boolean;
  initialReleaseId?: string;
  onSaved?: (video: CreatorVideoPage) => void | Promise<void>;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const editing = Boolean(videoId);
  const pageTitle = editing ? 'Edit Video' : 'New Video';
  const [video, setVideo] = useState<CreatorVideoPage | null>(null);
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [attachedReleases, setAttachedReleases] = useState<VideoAttachmentTarget[]>([]);
  const [creatorReleases, setCreatorReleases] = useState<VideoAttachmentTarget[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState('');
  const [relatedReleaseEnabled, setRelatedReleaseEnabled] = useState(false);
  const [releasePickerOpen, setReleasePickerOpen] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(editing);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mutatingAttachment, setMutatingAttachment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const submit = useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!user || !isSupportedYouTubeVideoUrl(videoUrl) || saving) {
      if (!isSupportedYouTubeVideoUrl(videoUrl)) setError('Enter a valid HTTPS YouTube video link.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let saved: SavedCreatorVideo;
      if (editing && videoId) {
        const sameURL = videoUrl.trim() === `https://www.youtube.com/watch?v=${video?.youtube_video_id}`;
        saved = await updateCreatorVideo(videoId, sameURL ? (title || 'YouTube video') : 'YouTube video', videoUrl, sameURL ? publishedAt : null);
      } else if (video) {
        saved = await updateCreatorVideo(video.id, title || 'YouTube video', videoUrl, publishedAt);
        setVideo({ ...saved, creator_id: user.id });
      } else {
        saved = await saveCreatorVideo(title || 'YouTube video', videoUrl, publishedAt);
        setVideo({ ...saved, creator_id: user.id });
      }
      if (!editing && relatedReleaseEnabled && selectedReleaseId && !attachedReleases.some(release => release.id === selectedReleaseId)) {
        const release = creatorReleases.find(row => row.id === selectedReleaseId);
        if (release) {
          try {
            await attachCreatorVideoToRelease(saved.id, release.id);
            setAttachedReleases(current => [...current, release]);
          } catch {
            setError('Video saved, but it could not be attached to that release. Try saving again.');
            setSaving(false);
            return;
          }
        }
      }
      const savedVideo: CreatorVideoPage = { ...saved, creator_id: user.id };
      if (onSaved) {
        await onSaved(savedVideo);
        void enrichCreatorVideoMetadata(savedVideo).then(enriched => {
          onSaved(enriched);
        });
        return;
      }
      void enrichCreatorVideoMetadata(savedVideo);
      router.push('/studio?studioStatus=video-saved');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this video. Try again.');
      setSaving(false);
    }
  }, [attachedReleases, creatorReleases, editing, onSaved, publishedAt, relatedReleaseEnabled, router, saving, selectedReleaseId, title, user, video, videoId, videoUrl]);

  const mobileSaveAction = useMemo(() => <button
    type="submit"
    form="studio-video-editor-form"
    className="ui44-symbol-button studio-video-save-action"
    aria-label={editing ? 'Save video' : 'Save video'}
    title="Save video"
    disabled={!accessReady || !isSupportedYouTubeVideoUrl(videoUrl) || saving}
  ><CheckIcon /></button>, [accessReady, editing, saving, videoUrl]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void loadStudioProfile(user.id).then(async profileResult => {
      const profile = profileResult.profile;
      if (!profile || !isCreatorProfile(profile)) throw new Error('Creator access is required to manage videos.');
      if (editing && videoId) {
        const loadedVideo = await getCreatorVideo(videoId);
        if (!loadedVideo || loadedVideo.creator_id !== user.id) throw new Error('Video not found or unavailable to this account.');
        const [attached, releases] = await Promise.all([
          listVideoAttachedReleases(videoId),
          listCreatorItems(profile.id),
        ]);
        if (!alive) return;
        setVideo(loadedVideo);
        setTitle(loadedVideo.title);
        setVideoUrl(`https://www.youtube.com/watch?v=${loadedVideo.youtube_video_id}`);
        setPublishedAt(loadedVideo.youtube_published_at);
        setAttachedReleases(attached);
        setCreatorReleases(releases.filter(release => release.experience_type === 'music' || release.experience_type === 'game').map(release => ({
          id: release.id,
          title: release.title,
          cover_url: release.cover_url,
          item_type: release.browse_type?.label || release.item_type || release.experience_type || null,
        })));
        setLoadingVideo(false);
        setLoadingAttachments(false);
      } else {
        const releases = await listCreatorItems(profile.id);
        if (!alive) return;
        const targets = releases.filter(release => release.experience_type === 'music' || release.experience_type === 'game').map(release => ({
          id: release.id,
          title: release.title,
          cover_url: release.cover_url,
          item_type: release.browse_type?.label || release.item_type || release.experience_type || null,
        }));
        setCreatorReleases(targets);
        const initialSelection = targets.some(release => release.id === initialReleaseId) ? initialReleaseId ?? '' : '';
        setSelectedReleaseId(initialSelection);
        setRelatedReleaseEnabled(Boolean(initialSelection));
        setLoadingAttachments(false);
      }
      if (alive) {
        setLoadingVideo(false);
      }
      if (alive) setAccessReady(true);
    }).catch(loadError => {
      if (!alive) return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load this video.');
      setLoadingVideo(false);
      setLoadingAttachments(false);
    });
    return () => { alive = false; };
  }, [editing, initialReleaseId, user, videoId]);

  async function selectRelease(release: VideoAttachmentTarget) {
    if (mutatingAttachment) return;
    if (!editing) {
      setSelectedReleaseId(release.id);
      setReleasePickerOpen(false);
      return;
    }
    if (!video || attachedReleases.some(row => row.id === release.id)) return;
    setMutatingAttachment(true);
    setError('');
    try {
      await attachCreatorVideoToRelease(video.id, release.id);
      setAttachedReleases(current => [...current, release]);
      setReleasePickerOpen(false);
    } catch (attachmentError) {
      setError(attachmentError instanceof Error ? attachmentError.message : 'Could not attach this release.');
    } finally {
      setMutatingAttachment(false);
    }
  }

  async function detachRelease(release: VideoAttachmentTarget) {
    if (!video || mutatingAttachment) return;
    setMutatingAttachment(true);
    setError('');
    try {
      await detachCreatorVideoFromRelease(video.id, release.id);
      setAttachedReleases(current => current.filter(row => row.id !== release.id));
    } catch (attachmentError) {
      setError(attachmentError instanceof Error ? attachmentError.message : 'Could not detach this release.');
    } finally {
      setMutatingAttachment(false);
    }
  }

  async function removeVideo() {
    if (!video || deleting) return;
    if (!window.confirm('Delete this video? It will be removed from your library and from every release it is attached to.')) return;
    setDeleting(true);
    setError('');
    try {
      await deleteCreatorVideo(video.id);
      router.push('/studio?studioStatus=video-deleted');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this video.');
      setDeleting(false);
    }
  }

  const validUrl = isSupportedYouTubeVideoUrl(videoUrl);
  const availableReleases = creatorReleases.filter(release => !attachedReleases.some(attached => attached.id === release.id));
  const formId = embedded ? 'studio-video-editor-form-embedded' : 'studio-video-editor-form';
  const createVideoDirty = !editing && Boolean(videoUrl.trim() || selectedReleaseId || relatedReleaseEnabled);

  if (authLoading || loadingVideo || (editing && !accessReady && !error)) {
    const loadingState = <div className="dashboard-empty ui44-state ui44-state-loading" role="status">Loading video…</div>;
    return embedded ? <div className="studio-video-editor-embedded">{loadingState}</div> : <PageShell><div className="dashboard-page"><HubHero title={pageTitle} />{loadingState}</div></PageShell>;
  }
  if (!user) return embedded ? <div className="studio-video-editor-embedded"><EmptyMessage>Log in to manage videos.</EmptyMessage></div> : <PageShell><div className="dashboard-page"><HubHero title={pageTitle} /><EmptyMessage>Log in to manage videos.</EmptyMessage><OS44Button href="/login" className="os-button os-button-primary">Log In</OS44Button></div></PageShell>;
  if (error && !accessReady) return embedded ? <div className="studio-video-editor-embedded"><div className="dashboard-status dashboard-status-error" role="alert">{error}</div></div> : <PageShell><div className="dashboard-page"><HubHero title={pageTitle} /><EmptyMessage>{error}</EmptyMessage><OS44Button href="/studio" className="os-button os-button-secondary">Back to Studio</OS44Button></div></PageShell>;

  const form = <form id={formId} className="dashboard-form studio-video-editor-form" onSubmit={event => {
    // The embedded editor sits inside the release editor's form. Keep its
    // submit event from also saving the parent release and navigating away.
    if (embedded) event.stopPropagation();
    void submit(event);
  }}>
        {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}

        <section className="dashboard-form-section">
          <SectionHeader title="Details" description="Add the video’s core details." showDescription />
          <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
            <label className="dashboard-field">
              <span className="dashboard-field-label">YouTube link</span>
              <Ui44TextInput className="os-input-field" type="url" value={videoUrl} onChange={event => { setVideoUrl(event.target.value); setPublishedAt(null); setTitle('YouTube video'); }} placeholder="Paste a YouTube video URL" autoCapitalize="none" autoCorrect="off" inputMode="url" aria-label="YouTube link" />
              {videoUrl && !validUrl ? <span className="dashboard-form-note">Use an HTTPS YouTube link to a video.</span> : null}
            </label>
          </div>
        </section>

        {editing ? <>
          <section className="dashboard-form-section">
            <SectionHeader title="Attached Releases" />
            <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible studio-video-attachments">
              {loadingAttachments ? <div className="dashboard-empty ui44-state ui44-state-loading" role="status">Loading releases…</div> : attachedReleases.length === 0 ? <p className="dashboard-form-note">Not attached to any release yet.</p> : attachedReleases.map(release => <div className="studio-video-release-row" key={release.id}>
                {release.cover_url ? <Image className="studio-video-release-artwork" src={release.cover_url} alt="" width={44} height={44} unoptimized /> : <SharePlaceholderArtwork />}
                <span className="studio-video-release-title">{release.title}</span>
                <button
                  className="studio-video-detach-button"
                  type="button"
                  aria-label={`Remove ${release.title}`}
                  title={`Remove ${release.title}`}
                  disabled={mutatingAttachment}
                  onClick={() => void detachRelease(release)}
                  style={{ display: 'grid', flex: '0 0 28px', width: 28, minWidth: 28, height: 28, placeItems: 'center', padding: 0, border: 'none', borderRadius: '50%', backgroundColor: '#ff3048', color: '#fff', position: 'relative', zIndex: 20, cursor: 'pointer' }}
                ><RemoveAttachmentIcon /></button>
              </div>)}
              {!loadingAttachments && attachedReleases.length < 10 ? <div className="studio-visual-video-actions studio-video-release-picker-action">
                <button className="os-button os-button-secondary" type="button" disabled={!availableReleases.length || mutatingAttachment} onClick={() => setReleasePickerOpen(true)}>Select Release</button>
              </div> : null}
              {!loadingAttachments && attachedReleases.length >= 10 ? <p className="dashboard-form-note">A video can be attached to up to 10 releases.</p> : null}
              {!loadingAttachments && attachedReleases.length < 10 && attachedReleases.length === 0 && availableReleases.length === 0 ? <p className="dashboard-form-note">You have no releases to attach.</p> : null}
            </div>
          </section>

          <div className="studio-edit-delete-action">
            <OS44Button className="os-button os-button-destructive" type="button" disabled={deleting || saving} onClick={() => void removeVideo()}>{deleting ? 'Deleting…' : 'Delete Video'}</OS44Button>
          </div>
        </> : embedded && !initialReleaseId ? null : <section className="dashboard-form-section">
          <SectionHeader
            title="Related Release"
            description="Attach this video to a related release."
            showDescription
            alignActionWithTitle
            action={<button
              type="button"
              role="switch"
              aria-label="Enable related release"
              aria-checked={relatedReleaseEnabled}
              className={relatedReleaseEnabled ? 'settings-toggle settings-toggle-on ui44-switch ui44-switch-on' : 'settings-toggle ui44-switch'}
              onClick={() => {
                setRelatedReleaseEnabled(current => {
                  const next = !current;
                  if (!next) setSelectedReleaseId('');
                  return next;
                });
              }}
            />}
          />
          {relatedReleaseEnabled ? <div className="studio-video-release-picker-controls">
            {loadingAttachments ? <div className="dashboard-empty ui44-state ui44-state-loading" role="status">Loading releases…</div> : creatorReleases.length === 0 ? <p className="dashboard-form-note">You have no releases to attach.</p> : selectedReleaseId ? (() => {
              const selectedRelease = creatorReleases.find(release => release.id === selectedReleaseId);
              return selectedRelease ? <div className="studio-video-release-row studio-video-release-row-selected">
                {selectedRelease.cover_url ? <Image className="studio-video-release-artwork" src={selectedRelease.cover_url} alt="" width={56} height={56} unoptimized /> : <SharePlaceholderArtwork />}
                <span className="studio-video-release-title">{selectedRelease.title}</span>
                <button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => setReleasePickerOpen(true)}>Change</button>
              </div> : null;
            })() : <button type="button" className="os-button os-button-secondary studio-video-select-release-button" onClick={() => setReleasePickerOpen(true)}>Select Release</button>}
          </div> : null}
        </section>}

  </form>;

  if (embedded) return <div className="studio-video-editor-embedded">
    <header className="studio-video-drawer-header">
      <button type="button" className="studio-video-drawer-close" aria-label="Close Add Video" onClick={onClose}><CloseDrawerIcon /></button>
      <h2>New Video</h2>
      <button type="submit" form={formId} className="studio-video-drawer-save" aria-label={saving ? 'Saving video' : 'Save video'} title={saving ? 'Saving…' : 'Save video'} disabled={!accessReady || !isSupportedYouTubeVideoUrl(videoUrl) || saving}><CheckIcon /></button>
    </header>
    {form}
  </div>;

  return <PageShell>
    {!editing ? <StudioCreateCancel dirty={createVideoDirty} href="/studio" /> : null}
    <main className="dashboard-page studio-video-editor-page">
      <StudioVideoToolbar pageTitle={pageTitle} mobileSaveAction={mobileSaveAction} editing={editing} />
      <HubHero title={pageTitle} hideDivider />
      {form}
    </main>
    {releasePickerOpen ? <StudioReleasePicker releases={editing ? availableReleases : creatorReleases} selectedId={selectedReleaseId} onSelect={release => void selectRelease(release)} onClose={() => setReleasePickerOpen(false)} /> : null}
  </PageShell>;
}

function CloseDrawerIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}
