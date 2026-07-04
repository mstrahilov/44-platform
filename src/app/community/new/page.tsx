'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { createMentionNotifications } from '@/lib/achievementNotifications';

function buildSlug(title: string) {
  const base = normalizeTaxonomyValue(title) || 'thread';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export default function NewCommunityThreadPage() {
  return (
    <Suspense fallback={<PageShell><div style={{ minHeight: '40vh' }} /></PageShell>}>
      <NewCommunityThreadContent />
    </Suspense>
  );
}

function NewCommunityThreadContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState('');
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
    if (!title.trim() || !body.trim()) {
      setError('Please add both a title and a message.');
      return;
    }

    setSaving(true);
    setError('');

    const { data, error: insertError } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        category_id: null,
        slug: buildSlug(title),
        title: title.trim(),
        body: body.trim(),
        post_type: 'general',
        status: 'published',
      })
      .select('id, slug')
      .single();

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    await createMentionNotifications({
      authorUserId: user.id,
      authorName: profile?.display_name || profile?.username || 'Someone',
      postId: data.id,
      postSlug: data.slug,
      postTitle: title.trim(),
      body: body.trim(),
    });

    setSaving(false);
    const created = data as { id: string; slug: string | null } | null;
    router.push(`/community/thread/${created?.slug ?? created?.id}`);
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  return (
    <PageShell>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 24 }}>
        <div className="dashboard-header">
          <div className="dashboard-header-copy">
            <h1 className="os-type-display">New Post</h1>
            <p className="os-type-body">Community posts are for general conversation. Reviews happen on release and item pages. Creator updates happen in release context.</p>
          </div>
          <Link href="/community" className="os-button os-button-secondary os-button-compact">Back</Link>
        </div>

        <div className="dashboard-list-surface" style={{ padding: 'var(--os-space-6, 28px)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
            <label>
              <div className="os-type-card-title" style={{ marginBottom: 8 }}>Title</div>
              <input
                className="os-input-field os-input-large"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="What do you want to talk about?"
                style={{ width: '100%' }}
              />
            </label>

            <label>
              <div className="os-type-card-title" style={{ marginBottom: 8 }}>Message</div>
              <textarea
                className="os-input-textarea"
                rows={10}
                value={body}
                onChange={event => setBody(event.target.value)}
                placeholder="Share the thought, question, or idea."
                style={{ minHeight: 200 }}
              />
            </label>
            <div className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
              {bodyHint}
            </div>

            {error && (
              <div className="dashboard-status dashboard-status-error">
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifySelf: 'start' }}>
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
