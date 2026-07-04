'use client';

import { useEffect, useId, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { PageShell, CenteredMessage } from '@/components/Ui';
import { SocialAvatar } from '@/components/Social';
import { useCommunityTopbarTabs } from '@/components/CommunityTopbarTabs';
import type { Profile } from '@/lib/platform';
import { authorHandle } from '@/lib/social';
import { getUploadErrorMessage, uploadPublicFile } from '@/lib/uploads';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  useCommunityTopbarTabs('profile');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [heroUrl, setHeroUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const avatarInputId = useId();
  const heroInputId = useId();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      const p = (data as Profile | null) ?? null;
      setProfile(p);
      if (p) {
        setDisplayName(p.display_name ?? '');
        setUsername(p.username ?? '');
        setBio(p.bio ?? '');
        setAvatarUrl(p.avatar_url ?? '');
        setHeroUrl(p.hero_url ?? '');
      }
      setLoading(false);
    }
    load();
  }, [user, authLoading]);

  async function save() {
    if (!user || saving) return;
    setSaving(true);
    setError('');
    const payload: Partial<Profile> = {
      display_name: displayName.trim() || null,
      username: username.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      hero_url: heroUrl.trim() || null,
    };
    const { error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    const targetHandle = username.trim() || authorHandle(profile) || '';
    router.push(targetHandle ? `/community/profile/${targetHandle}` : '/community');
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>, target: 'avatar' | 'hero') {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(target);
    setError('');
    try {
      const result = await uploadPublicFile({
        file,
        folder: target === 'avatar' ? 'profiles/avatars' : 'profiles/covers',
        userId: user.id,
      });
      if (target === 'avatar') setAvatarUrl(result.publicUrl);
      else setHeroUrl(result.publicUrl);
    } catch (uploadError) {
      setError(getUploadErrorMessage(uploadError));
    } finally {
      setUploading('');
      event.target.value = '';
    }
  }

  if (authLoading || loading) {
    return <PageShell><CenteredMessage>Loading profile...</CenteredMessage></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <CenteredMessage>
          Sign in to edit your profile.{' '}
          <Link href="/login" className="os-button os-button-primary os-button-compact" style={{ marginLeft: 8 }}>Sign In</Link>
        </CenteredMessage>
      </PageShell>
    );
  }

  const previewProfile = {
    id: user.id,
    display_name: displayName,
    username,
    avatar_url: avatarUrl,
    role: profile?.role ?? null,
    slug: profile?.slug ?? null,
  };

  return (
    <PageShell>
      <main className="social-shell social-shell-wide">
        <section
          className="social-profile-cover"
          style={{ backgroundImage: heroUrl ? `url(${heroUrl})` : undefined }}
          aria-label="Cover preview"
        >
          <label htmlFor={heroInputId} className="profile-image-edit-button profile-image-edit-button-cover">
            {uploading === 'hero' ? 'Uploading...' : 'Change Cover'}
          </label>
          <input
            id={heroInputId}
            type="file"
            accept="image/*"
            onChange={event => uploadImage(event, 'hero')}
            disabled={Boolean(uploading)}
            className="profile-image-input"
          />
        </section>

        <section className="social-profile-head">
          <div className="social-profile-main">
            <div className="social-profile-identity">
              <div className="profile-avatar-edit-wrap">
                <SocialAvatar profile={previewProfile} size="large" />
                <label htmlFor={avatarInputId} className="profile-image-edit-button profile-image-edit-button-avatar">
                  {uploading === 'avatar' ? '...' : 'Change'}
                </label>
                <input
                  id={avatarInputId}
                  type="file"
                  accept="image/*"
                  onChange={event => uploadImage(event, 'avatar')}
                  disabled={Boolean(uploading)}
                  className="profile-image-input"
                />
              </div>
              <div className="social-profile-text">
                <h1 className="social-profile-name">{displayName || 'Your name'}</h1>
                {username && <div className="social-handle">@{username}</div>}
                <p className="social-profile-bio">
                  {bio || 'Add a short bio for your public profile.'}
                </p>
              </div>
            </div>

            <div className="social-profile-actions">
              <Link href={authorHandle(profile) ? `/community/profile/${authorHandle(profile)}` : '/community'} className="os-button os-button-secondary">
                Cancel
              </Link>
              <button
                type="button"
                className="os-button os-button-primary"
                onClick={save}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {error && <div className="dashboard-status dashboard-status-error">{error}</div>}

          <div className="profile-edit-fields">
            <label className="profile-edit-field">
              <span className="profile-edit-label">Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={event => setDisplayName(event.target.value)}
                className="profile-edit-input"
                placeholder="Your public name"
              />
            </label>

            <label className="profile-edit-field">
              <span className="profile-edit-label">Username</span>
              <input
                type="text"
                value={username}
                onChange={event => setUsername(event.target.value.replace(/\s+/g, '').toLowerCase())}
                className="profile-edit-input"
                placeholder="username"
              />
            </label>

            <label className="profile-edit-field profile-edit-field-full">
              <span className="profile-edit-label">Bio</span>
              <textarea
                value={bio}
                onChange={event => setBio(event.target.value)}
                className="profile-edit-input profile-edit-textarea"
                placeholder="Tell people what you make."
                rows={4}
              />
            </label>

          </div>
        </section>
      </main>
    </PageShell>
  );
}
