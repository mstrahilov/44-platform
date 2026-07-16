'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { useAuth } from '@/lib/useAuth';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { createDiscussion } from '@/lib/domain/community';
import { Ui44Textarea } from '@/components/ui44/Inputs';

function buildPostTitle(body: string) {
  const cleanBody = body.trim().replace(/\s+/g, ' ');
  return cleanBody.slice(0, 72) || 'New post';
}

function buildSlug(body: string) {
  const base = normalizeTaxonomyValue(buildPostTitle(body)) || 'thread';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export default function NewCommunityThreadPage() {
  return (
    <Suspense fallback={<PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>}>
      <NewCommunityThreadContent />
    </Suspense>
  );
}

function NewCommunityThreadContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [body, setBody] = useState('');
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    loadStudioProfile(user.id).then(result => setProfile(result.profile));
  }, [user]);

  const bodyHint = useMemo(
    () => 'Use @username in the message when you want to mention someone.',
    [],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
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

    const slug = buildSlug(body);
    try {
      const created = await createDiscussion({ title: buildPostTitle(body), body: body.trim(), slug });
      setSaving(false);
      router.push(`/community/thread/${created.slug || created.id}`);
    } catch (insertError) {
      setSaving(false);
      setError(insertError instanceof Error ? insertError.message : 'Could not create this post.');
      return;
    }
  }

  if (loading || !user) {
    return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;
  }

  return (
    <PageShell>
      <div className="community-new-layout">
        <div className="dashboard-header ui44-page-header">
          <div className="dashboard-header-copy ui44-page-header-copy">
            <h1 className="os-type-display ui44-type ui44-type-page-title">New Post</h1>
          </div>
          <Link href="/community" className="os-button os-button-secondary os-button-compact">Back</Link>
        </div>

        <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip community-new-surface">
          <form className="ui44-form-stack" onSubmit={handleSubmit}>
            <label>
              <div className="os-type-card-title ui44-form-label">Message</div>
              <Ui44Textarea
                className="os-input-textarea ui44-form-textarea-tall"
                rows={10}
                value={body}
                onChange={event => setBody(event.target.value)}
                placeholder="Write your post"
              />
            </label>
            <div className="os-type-body-small ui44-form-help">
              {bodyHint}
            </div>

            {error && (
              <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">
                {error}
              </div>
            )}

            <div className="ui44-form-actions">
              <button className="os-button os-button-primary" type="submit" disabled={saving}>
                {saving ? 'Posting…' : 'Publish Post'}
              </button>
              <Link className="os-button os-button-ghost" href="/community">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
    </PageShell>
  );
}
