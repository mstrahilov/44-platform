'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SectionHeader } from '@/components/Ui';
import { CreatorVideoTitle } from '@/components/CreatorVideoTitle';
import { StudioVideoEditor } from '@/components/StudioVideoEditor';
import { useAuth } from '@/lib/useAuth';
import { listCreatorVideos, type CreatorVideoPage, type SavedCreatorVideo } from '@/lib/domain/releaseFeatures';

function RemoveIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12h11" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

export function StudioVisualsEditor({
  enabled,
  onEnabledChange,
  releaseId,
  videos,
  onVideosChange,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  releaseId: string;
  videos: CreatorVideoPage[];
  onVideosChange: (videos: CreatorVideoPage[]) => void;
}) {
  const { user } = useAuth();
  const [libraryVideos, setLibraryVideos] = useState<CreatorVideoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState<'select' | 'add' | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void listCreatorVideos(200, user.id).then(rows => {
      if (active) { setLibraryVideos(rows); setError(''); }
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not load your videos.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const availableVideos = libraryVideos.filter(video => !videos.some(attached => attached.id === video.id));

  function addVideo(video: CreatorVideoPage) {
    if (videos.length >= 10 || videos.some(row => row.id === video.id)) return;
    onVideosChange([...videos, video]);
    setDrawer(null);
  }

  function handleNewVideo(video: SavedCreatorVideo) {
    if (!user) return;
    const created: CreatorVideoPage = { ...video, creator_id: user.id };
    setLibraryVideos(current => [created, ...current.filter(row => row.id !== created.id)]);
    addVideo(created);
  }

  return <section className="dashboard-form-section studio-component-section">
    <SectionHeader title="Visuals" description="Attach up to 10 videos from your library." showDescription alignActionWithTitle action={(
      <button type="button" role="switch" aria-label="Enable release visuals" aria-checked={enabled}
        className={enabled ? 'settings-toggle settings-toggle-on ui44-switch ui44-switch-on' : 'settings-toggle ui44-switch'}
        onClick={() => onEnabledChange(!enabled)} />
    )} />
    {enabled ? <>
      <div className="studio-visual-controls">
        <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-visible studio-feature-panel studio-visuals-panel">
          {loading ? <p className="dashboard-form-note studio-visual-empty" role="status">Loading your videos…</p> : null}
          {error ? <p className="dashboard-status dashboard-status-error studio-visual-empty" role="alert">{error}</p> : null}
          {videos.map((video, index) => <div className={`studio-visual-video-row${index === videos.length - 1 ? ' studio-visual-video-row-last' : ''}`} key={video.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="studio-visual-video-artwork" src={`https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`} alt="" />
            <div className="studio-visual-video-copy">
              <CreatorVideoTitle className="studio-visual-video-title" videoId={video.youtube_video_id} storedTitle={video.title} />
              <span className="studio-visual-video-service">YouTube</span>
            </div>
            <button className="studio-visual-remove-button" type="button" aria-label={`Remove ${video.title}`} title={`Remove ${video.title}`} onClick={() => onVideosChange(videos.filter(row => row.id !== video.id))}>
              <RemoveIcon />
            </button>
          </div>)}
          {!loading && !error && videos.length === 0 ? <p className="dashboard-form-note studio-visual-empty">No videos attached yet.</p> : null}
        </div>
        {videos.length < 10 ? <div className="studio-visual-video-actions">
          <button className="os-button os-button-secondary" type="button" onClick={() => setDrawer('select')}>Select Existing</button>
          <button className="os-button os-button-primary" type="button" onClick={() => setDrawer('add')}>Add New Video</button>
        </div> : null}
      </div>
    </> : null}

    {drawer && typeof document !== 'undefined' ? createPortal(<div className="studio-video-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDrawer(null); }}>
      <section className="studio-video-drawer" role="dialog" aria-modal="true" aria-label={drawer === 'select' ? 'Select Video' : 'Add New Video'}>
        {drawer === 'select' ? <>
          <header className="studio-video-drawer-header">
            <button type="button" className="studio-video-drawer-close" aria-label="Close video picker" onClick={() => setDrawer(null)}><CloseIcon /></button>
            <h2>Select Video</h2>
            <span className="studio-video-drawer-header-action" aria-hidden="true" />
          </header>
          {availableVideos.length ? <div className="studio-video-picker-list">
            {availableVideos.map(video => <button type="button" className="studio-video-picker-row" key={video.id} onClick={() => addVideo(video)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`} alt="" />
              <CreatorVideoTitle videoId={video.youtube_video_id} storedTitle={video.title} />
            </button>)}
          </div> : <p className="dashboard-form-note studio-video-picker-empty">{loading ? 'Loading your videos…' : 'No other videos are available to attach.'}</p>}
        </> : <StudioVideoEditor embedded initialReleaseId={releaseId} onClose={() => setDrawer(null)} onSaved={handleNewVideo} />}
      </section>
    </div>, document.body) : null}
  </section>;
}
