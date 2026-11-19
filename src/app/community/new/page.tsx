'use client';

import { Suspense, useEffect, useId, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/Ui';
import { OS44Button } from '@/components/OS44Button';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { CommunityMentionSelect, CommunityPostTagSelect } from '@/components/CommunityPostTagSelect';
import { useAuth } from '@/lib/useAuth';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import {
  communityItemReference,
  type CommunityCatalogItem,
  type CommunityIntent,
  type CommunityReference,
} from '@/lib/communityV11';
import { createCommunityPost } from '@/lib/domain/community';
import { listCommunityReferenceItems } from '@/lib/domain/catalog';
import { getCatalogItem } from '@/lib/domain/itemDetails';
import { getCreatorVideo, type CreatorVideoPage } from '@/lib/domain/releaseFeatures';
import { getUploadErrorMessage, uploadPublicFile } from '@/lib/uploads';
import type { Item } from '@/lib/products';

export default function NewCommunityThreadPage() {
  return (
    <Suspense fallback={<PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>}>
      <NewCommunityThreadContent />
    </Suspense>
  );
}

function NewCommunityThreadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contextItemId = searchParams.get('itemId');
  const contextVideoId = searchParams.get('videoId');
  const returnToParam = searchParams.get('returnTo');
  const returnTo = returnToParam?.startsWith('/') && !returnToParam.startsWith('//') ? returnToParam : '/community';
  const { user, loading } = useAuth();
  const [body, setBody] = useState('');
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [items, setItems] = useState<CommunityCatalogItem[] | null>(null);
  const [mentionLoadError, setMentionLoadError] = useState(false);
  const [intent, setIntent] = useState<CommunityIntent | ''>('');
  const [selectedReferences, setSelectedReferences] = useState<CommunityReference[]>([]);
  const [lockedItem, setLockedItem] = useState<Item | null>(null);
  const [lockedVideo, setLockedVideo] = useState<CreatorVideoPage | null>(null);
  const [contextLoading, setContextLoading] = useState(Boolean(contextItemId || contextVideoId));
  const [contextError, setContextError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);
  const imageInputId = useId();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    loadStudioProfile(user.id).then(result => setProfile(result.profile));
  }, [user]);

  useEffect(() => {
    function submitFromToolbar() {
      (document.getElementById('community-new-form') as HTMLFormElement | null)?.requestSubmit();
    }
    window.addEventListener('community:new-post-submit', submitFromToolbar);
    return () => window.removeEventListener('community:new-post-submit', submitFromToolbar);
  }, []);

  useEffect(() => {
    if (items) return;
    let active = true;
    void listCommunityReferenceItems(200).then(nextItems => {
      if (active) setItems(nextItems);
    }).catch(() => {
      if (active) setMentionLoadError(true);
    });
    return () => { active = false; };
  }, [items]);

  useEffect(() => {
    if (!contextItemId) return;
    let live = true;
    void getCatalogItem(contextItemId)
      .then(item => {
        if (!item || item.status !== 'published') throw new Error('This item is not available for a new post.');
        if (!live) return;
        setLockedItem(item);
        setSelectedReferences([communityItemReference(item)]);
        setContextError('');
      })
      .catch(reason => { if (live) setContextError(reason instanceof Error ? reason.message : 'Could not load this item.'); })
      .finally(() => { if (live) setContextLoading(false); });
    return () => { live = false; };
  }, [contextItemId]);

  useEffect(() => {
    if (!contextVideoId || contextItemId) return;
    let live = true;
    void getCreatorVideo(contextVideoId)
      .then(video => {
        if (!video) throw new Error('This video is not available for a new post.');
        if (!live) return;
        setLockedVideo(video);
        setContextError('');
      })
      .catch(reason => { if (live) setContextError(reason instanceof Error ? reason.message : 'Could not load this video.'); })
      .finally(() => { if (live) setContextLoading(false); });
    return () => { live = false; };
  }, [contextItemId, contextVideoId]);

  const canPostUpdate = profile?.role === 'creator' || profile?.role === 'admin';
  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user) return;
    setImageUploading(true);
    setImageError('');
    try {
      const uploaded = await uploadPublicFile({
        file,
        folder: 'community-posts',
        userId: user.id,
      });
      setImageUrl(uploaded.publicUrl);
    } catch (uploadError) {
      setImageError(getUploadErrorMessage(uploadError));
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (contextLoading || contextError || (contextItemId && !lockedItem) || (contextVideoId && !lockedVideo)) return;
    if (!hasCommunityIdentity(profile)) {
      setSetupGateOpen(true);
      return;
    }
    if (!body.trim()) {
      setError('Please add a message.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const created = await createCommunityPost({
        body: lockedVideo ? `@${lockedVideo.title} ${body.trim()}` : body.trim(),
        intent: intent || 'general',
        references: lockedItem ? [communityItemReference(lockedItem)] : selectedReferences,
        imageUrl: imageUrl || null,
      });
      setSaving(false);
      router.push(`/community/thread/${created.slug || created.id}`);
    } catch (insertError) {
      setSaving(false);
      setError(insertError instanceof Error ? insertError.message : 'Could not create this post.');
      return;
    }
  }

  if (loading || !user || contextLoading) {
    return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;
  }

  return (
    <PageShell>
      <div className="community-v11-composer-layer community-new-page-layer">
        <form id="community-new-form" className="community-v11-composer community-new-composer ui44-panel ui44-panel-glass" onSubmit={handleSubmit} aria-labelledby="community-new-title">
          <div className="community-v11-composer-heading">
            <OS44Button className="community-v11-composer-cancel" onClick={() => router.push(returnTo)}>Cancel</OS44Button>
            <h1 id="community-new-title">New Post</h1>
            <OS44Button type="submit" className="community-v11-composer-post" disabled={saving || Boolean(contextError) || !body.trim() || (intent === 'update' && !canPostUpdate)}>{saving ? 'Posting…' : 'Post'}</OS44Button>
          </div>

          <div className="community-v11-composer-field-label">
            <label htmlFor="community-new-body">What&apos;s on your mind?</label>
            <label className="community-v11-composer-photo" htmlFor={imageInputId} aria-label="Attach Photo" title="Attach Photo">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8" cy="10" r="1.4" />
                <path d="m5.5 17 4.2-4.2 3.2 3.1 2.2-2.2 3.4 3.3" />
              </svg>
            </label>
            <input id={imageInputId} className="ui44-file-input-hidden" type="file" accept="image/*" onChange={handleImageChange} disabled={imageUploading || saving} />
          </div>
          {imageUrl ? (
            <div className="community-v11-composer-image-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Attached to this post" />
              <button type="button" aria-label="Remove attached image" onClick={() => setImageUrl('')}>×</button>
            </div>
          ) : null}
          {imageUploading ? <div className="community-v11-composer-upload-status" role="status">Uploading image…</div> : null}
          {imageError ? <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{imageError}</div> : null}
          <textarea
            id="community-new-body"
            className="ui44-input ui44-textarea ui44-input-bare"
            value={body}
            onChange={event => setBody(event.target.value)}
            placeholder=""
            rows={6}
            autoFocus
            disabled={saving}
          />

          <CommunityMentionSelect
            items={items ?? []}
            value={selectedReferences.find(reference => reference.kind === 'item')?.id ?? ''}
            disabled={Boolean(lockedItem || lockedVideo)}
            lockedLabel={lockedItem?.title ?? lockedVideo?.title}
            onChange={itemId => {
              const item = items?.find(candidate => candidate.id === itemId);
              setSelectedReferences(item ? [communityItemReference(item)] : []);
            }}
          />
          {mentionLoadError ? <div className="community-v11-composer-upload-status" role="status">Could not load releases.</div> : null}

          <CommunityPostTagSelect value={intent} canPostUpdate={canPostUpdate} onChange={setIntent} />

          {(error || contextError) && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error || contextError}</div>}
        </form>
      </div>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
    </PageShell>
  );
}
