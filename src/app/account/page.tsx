'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { UploadField } from '@/components/UploadField';
import { supabase } from '@/lib/supabase';
import { hasCommunityIdentity } from '@/lib/communityProfile';

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="panel-scroll" />}>
      <AccountContent />
    </Suspense>
  );
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    async function loadAccount() {
      const { profile: nextProfile } = await loadStudioProfile(user!.id);
      setProfile(nextProfile);
      setUsername(nextProfile?.username ?? '');
      setAvatarUrl(nextProfile?.avatar_url ?? '');
      setBio(nextProfile?.bio ?? '');
      setProfileLoading(false);
    }

    loadAccount();
  }, [loading, router, user]);

  if (loading || profileLoading) {
    return <div className="panel-scroll" />;
  }

  if (!user) {
    return <div className="panel-scroll" />;
  }

  function normalizeUsername(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32);
  }

  function slugify(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  async function saveCommunityProfile() {
    if (!user || saving) return;
    const cleanUsername = normalizeUsername(username);
    if (!cleanUsername) {
      setStatus('Choose a username with letters or numbers.');
      return;
    }
    if (!avatarUrl.trim()) {
      setStatus('Add a profile photo before joining community conversations.');
      return;
    }

    setSaving(true);
    setStatus('');
    const displayName = profile?.display_name || cleanUsername;
    const { error } = await supabase
      .from('profiles')
      .update({
        username: cleanUsername,
        slug: slugify(profile?.slug || cleanUsername) || cleanUsername.replace(/_/g, '-'),
        display_name: displayName,
        avatar_url: avatarUrl.trim(),
        bio: bio.trim() || null,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      setStatus(error.message.includes('duplicate') ? 'That username is already taken.' : error.message);
      return;
    }

    const { profile: nextProfile } = await loadStudioProfile(user.id);
    setProfile(nextProfile);
    setStatus('Community profile ready.');
  }

  const publicName = profile?.display_name || profile?.username || user.email?.split('@')[0] || '44 Member';
  const publicProfileHref = profile?.username ? `/community/profile/${profile.username}` : '/profile';
  const communityReady = hasCommunityIdentity(profile);
  const isGatedReturn = searchParams.get('setup') === 'community';
  const introCopy = isGatedReturn
    ? 'Finish your community profile to post, review, reply, and interact on 44.'
    : 'Your account is created. Now let’s set up your community profile.';

  function cancelSetup() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/community');
  }

  return (
    <div className="panel-scroll">
      <div className="settings-section" style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px' }}>
        <div className="settings-block">
          <p className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)' }}>Account</p>
          <h1 className="os-type-page-title">{communityReady ? `Welcome, ${publicName}` : 'Welcome to 44.'}</h1>
          <p className="os-type-body">
            {communityReady
              ? 'Your community profile is ready. You can post, reply, like, review, follow, and message across 44.'
              : introCopy}
          </p>
        </div>

        {!communityReady && (
          <div className="os-panel-surface" style={{ padding: 24, display: 'grid', gap: 18 }}>
            <div className="settings-block">
              <h2 className="os-type-panel-title">{isGatedReturn ? 'Finish your community profile' : 'Set up your community profile'}</h2>
              <p className="os-type-body">
                Choose a username and add a profile photo. Bio is optional, but it helps other members know who they are talking to.
              </p>
            </div>
            <UploadField
              label="Profile Photo"
              folder="profiles/avatars"
              userId={user.id}
              value={avatarUrl}
              accept="image/*"
              buttonLabel="Upload photo"
              onChange={setAvatarUrl}
            />
            <label className="dashboard-field">
              <div className="dashboard-field-label">Username</div>
              <input className="input" value={username} onChange={event => setUsername(normalizeUsername(event.target.value))} placeholder="username" />
            </label>
            <label className="dashboard-field">
              <div className="dashboard-field-label">Bio Optional</div>
              <textarea className="input" rows={4} value={bio} onChange={event => setBio(event.target.value)} placeholder="A short note for your profile." />
            </label>
            {status && <div className={status === 'Community profile ready.' ? 'dashboard-status dashboard-status-success' : 'dashboard-status dashboard-status-error'}>{status}</div>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="os-button os-button-primary" type="button" onClick={() => void saveCommunityProfile()} disabled={saving}>
                {saving ? 'Saving…' : 'Create Community Profile'}
              </button>
              {isGatedReturn ? (
                <button className="os-button os-button-secondary" type="button" onClick={cancelSetup}>
                  Cancel
                </button>
              ) : (
                <Link className="os-button os-button-secondary" href="/collection">
                  Skip for now
                </Link>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="os-button os-button-primary" href={communityReady ? '/community' : '/settings?tab=account'}>
            {communityReady ? 'Open Community' : 'Edit Account Settings'}
          </Link>
          <Link className="os-button os-button-secondary" href={publicProfileHref}>
            View Public Profile
          </Link>
          <Link className="os-button os-button-secondary" href="/collection">
            Open Collection
          </Link>
        </div>
      </div>
    </div>
  );
}
