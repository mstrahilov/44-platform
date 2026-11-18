'use client';

import { useCallback, useMemo } from 'react';
import { PageShell } from '@/components/Ui';
import { COPY_TO_CLIPBOARD_TOAST_EVENT } from '@/components/ContextMenu';
import { VideoCommunitySection } from '@/components/ItemDetailSections';
import { useTopbarBack, useTopbarMobileTrailingAction, useTopbarOverflow, useTopbarTitle } from '@/components/TopbarContext';

type VideoDetail = { id: string; title: string; youtube_video_id: string };

function ShareIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>;
}

export function VideoDetailClient({ video }: { video: VideoDetail }) {
  const share = useCallback(async () => {
    const url = `${window.location.origin}/videos/${video.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      window.dispatchEvent(new CustomEvent(COPY_TO_CLIPBOARD_TOAST_EVENT, { detail: { message: 'Link copied to clipboard' } }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        window.dispatchEvent(new CustomEvent(COPY_TO_CLIPBOARD_TOAST_EVENT, { detail: { message: 'Link copied to clipboard' } }));
      } catch {
        // Clipboard access can be unavailable in embedded browsers.
      }
    }
  }, [video.id, video.title]);

  const mobileShareAction = useMemo(() => <button type="button" className="ui44-symbol-button os-topbar-icon-button" aria-label="Share video" title="Share video" onClick={() => void share()}><ShareIcon /></button>, [share]);
  useTopbarTitle('');
  useTopbarBack({ href: '/videos', label: 'Videos' });
  useTopbarMobileTrailingAction(mobileShareAction);
  useTopbarOverflow(useMemo(() => [{ id: 'share-video', label: 'Share Video', onSelect: () => void share() }], [share]));

  return <PageShell>
    <main className="app-page video-detail-page">
      <div className="video-detail-player">
        <iframe
          title={video.title}
          src={`https://www.youtube-nocookie.com/embed/${video.youtube_video_id}?playsinline=1&rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <VideoCommunitySection video={video} />
    </main>
  </PageShell>;
}
