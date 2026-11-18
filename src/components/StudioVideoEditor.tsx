'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { EmptyMessage, HubHero, PageShell, SectionHeader } from '@/components/Ui';
import { useTopbarBack, useTopbarMobileTrailingAction, useTopbarTitle } from '@/components/TopbarContext';
import { Ui44SelectInput, Ui44TextInput } from '@/components/ui44/Inputs';
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
  lookupYouTubeVideoMetadata,
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

function StudioVideoToolbar({ pageTitle, mobileSaveAction }: { pageTitle: string; mobileSaveAction: React.ReactNode }) {
  useTopbarTitle(pageTitle);
  useTopbarBack({ href: '/studio', label: 'Studio' });
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
  onSaved?: (video: SavedCreatorVideo) => void;
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
  const [accessReady, setAccessReady] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(editing);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [lookingUp, setLookingUp] = useState(false);
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
        saved = await updateCreatorVideo(videoId, title, videoUrl, publishedAt);
      } else if (video) {
        saved = await updateCreatorVideo(video.id, title, videoUrl, publishedAt);
        setVideo({ ...saved, creator_id: user.id });
      } else {
        saved = await saveCreatorVideo(title, videoUrl, publishedAt);
        setVideo({ ...saved, creator_id: user.id });
      }
      if (!editing && selectedReleaseId && !attachedReleases.some(release => release.id === selectedReleaseId)) {
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
      if (onSaved) {
        onSaved(saved);
        return;
      }
      router.push('/studio?studioStatus=video-saved');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this video. Try again.');
      setSaving(false);
    }
  }, [attachedReleases, creatorReleases, editing, onSaved, publishedAt, router, saving, selectedReleaseId, title, user, video, videoId, videoUrl]);

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
        setCreatorReleases(releases.map(release => ({ id: release.id, title: release.title, cover_url: release.cover_url })));
        setLoadingVideo(false);
        setLoadingAttachments(false);
      } else {
        const releases = await listCreatorItems(profile.id);
        if (!alive) return;
        const targets = releases.map(release => ({ id: release.id, title: release.title, cover_url: release.cover_url }));
        setCreatorReleases(targets);
        setSelectedReleaseId(targets.some(release => release.id === initialReleaseId) ? initialReleaseId ?? '' : '');
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

  useEffect(() => {
    if (!isSupportedYouTubeVideoUrl(videoUrl)) return;
    if (editing && video && videoUrl === `https://www.youtube.com/watch?v=${video.youtube_video_id}` && publishedAt) return;

    let alive = true;
    const timeout = window.setTimeout(() => {
      setLookingUp(true);
      void lookupYouTubeVideoMetadata(videoUrl).then(metadata => {
        if (!alive) return;
        setPublishedAt(metadata?.published_at ?? null);
        if (metadata?.title?.trim()) setTitle(metadata.title.trim());
      }).catch(() => {
        if (alive) setPublishedAt(null);
      }).finally(() => {
        if (alive) setLookingUp(false);
      });
    }, 500);
    return () => {
      alive = false;
      window.clearTimeout(timeout);
    };
  }, [editing, publishedAt, video, videoUrl]);

  async function attachRelease() {
    if (!video || !selectedReleaseId || mutatingAttachment) return;
    const release = creatorReleases.find(row => row.id === selectedReleaseId);
    if (!release) return;
    setMutatingAttachment(true);
    setError('');
    try {
      await attachCreatorVideoToRelease(video.id, release.id);
      setAttachedReleases(current => [...current, release]);
      setSelectedReleaseId('');
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

  if (authLoading || loadingVideo || (editing && !accessReady && !error)) {
    const loadingState = <div className="dashboard-empty ui44-state ui44-state-loading" role="status">Loading video…</div>;
    return embedded ? <div className="studio-video-editor-embedded">{loadingState}</div> : <PageShell><div className="dashboard-page"><HubHero title={pageTitle} />{loadingState}</div></PageShell>;
  }
  if (!user) return embedded ? <div className="studio-video-editor-embedded"><EmptyMessage>Log in to manage videos.</EmptyMessage></div> : <PageShell><div className="dashboard-page"><HubHero title={pageTitle} /><EmptyMessage>Log in to manage videos.</EmptyMessage><OS44Button href="/login" className="os-button os-button-primary">Log In</OS44Button></div></PageShell>;
  if (error && !accessReady) return embedded ? <div className="studio-video-editor-embedded"><div className="dashboard-status dashboard-status-error" role="alert">{error}</div></div> : <PageShell><div className="dashboard-page"><HubHero title={pageTitle} /><EmptyMessage>{error}</EmptyMessage><OS44Button href="/studio" className="os-button os-button-secondary">Back to Studio</OS44Button></div></PageShell>;

  const form = <form id={formId} className="dashboard-form studio-video-editor-form" onSubmit={event => void submit(event)}>
        {error ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div> : null}

        <section className="dashboard-form-section">
          <SectionHeader title="Details" />
          <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
            <label className="dashboard-field">
              <span className="dashboard-field-label">Title</span>
              <Ui44TextInput className="os-input-field" value={title} onChange={event => setTitle(event.target.value)} maxLength={120} placeholder="Video title" aria-label="Video title" />
            </label>
            <label className="dashboard-field">
              <span className="dashboard-field-label">YouTube Video URL</span>
              <Ui44TextInput className="os-input-field" type="url" value={videoUrl} onChange={event => { setVideoUrl(event.target.value); setPublishedAt(null); setLookingUp(false); }} placeholder="Enter YouTube video URL" autoCapitalize="none" autoCorrect="off" inputMode="url" aria-label="YouTube Video URL" />
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
              {!loadingAttachments && attachedReleases.length < 10 ? <div className="studio-video-attach-control">
                <label className="dashboard-field">
                  <span className="dashboard-field-label">Attach to a Release</span>
                  <Ui44SelectInput value={selectedReleaseId} onChange={event => setSelectedReleaseId(event.target.value)}>
                    <option value="">Select a release</option>
                    {availableReleases.map(release => <option key={release.id} value={release.id}>{release.title}</option>)}
                  </Ui44SelectInput>
                </label>
                <OS44Button className="os-button os-button-secondary" type="button" disabled={!selectedReleaseId || mutatingAttachment} onClick={() => void attachRelease()}>{mutatingAttachment ? 'Saving…' : 'Attach'}</OS44Button>
              </div> : null}
              {!loadingAttachments && attachedReleases.length >= 10 ? <p className="dashboard-form-note">A video can be attached to up to 10 releases.</p> : null}
              {!loadingAttachments && attachedReleases.length < 10 && attachedReleases.length === 0 && availableReleases.length === 0 ? <p className="dashboard-form-note">You have no releases to attach.</p> : null}
            </div>
          </section>

          <section className="dashboard-form-section studio-video-management">
            <SectionHeader title="Video Management" />
            <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible">
              <p className="dashboard-form-note">Remove this video from your library and every release it is attached to.</p>
              <OS44Button className="os-button os-button-destructive" type="button" disabled={deleting || saving} onClick={() => void removeVideo()}>{deleting ? 'Deleting…' : 'Delete Video'}</OS44Button>
            </div>
          </section>
        </> : <section className="dashboard-form-section">
          <SectionHeader title="Related Releases" />
          <div className="dashboard-form-step ui44-panel ui44-panel-glass ui44-panel-overflow-visible studio-video-attachments">
            {loadingAttachments ? <div className="dashboard-empty ui44-state ui44-state-loading" role="status">Loading releases…</div> : creatorReleases.length === 0 ? <p className="dashboard-form-note">You have no releases to attach.</p> : <label className="dashboard-field">
              <span className="dashboard-field-label">Attach to a Release (Optional)</span>
              <Ui44SelectInput value={selectedReleaseId} onChange={event => setSelectedReleaseId(event.target.value)}>
                <option value="">Select a release</option>
                {creatorReleases.map(release => <option key={release.id} value={release.id}>{release.title}</option>)}
              </Ui44SelectInput>
            </label>}
          </div>
        </section>}

  </form>;

  if (embedded) return <div className="studio-video-editor-embedded">
    <header className="studio-video-drawer-header">
      <button type="button" className="studio-video-drawer-close" aria-label="Close Add Video" onClick={onClose}><CloseDrawerIcon /></button>
      <h2>Add Video</h2>
      <button type="submit" form={formId} className="studio-video-drawer-save" aria-label={saving ? 'Saving video' : 'Save video'} title={saving ? 'Saving…' : 'Save video'} disabled={!accessReady || !isSupportedYouTubeVideoUrl(videoUrl) || saving}><CheckIcon /></button>
    </header>
    {form}
  </div>;

  return <PageShell>
    <main className="dashboard-page studio-video-editor-page">
      <StudioVideoToolbar pageTitle={pageTitle} mobileSaveAction={mobileSaveAction} />
      <HubHero title={pageTitle} hideDivider={!editing} />
      {form}
    </main>
  </PageShell>;
}

function CloseDrawerIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}
