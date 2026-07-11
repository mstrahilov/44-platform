'use client';

import { useEffect, useId, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { PageShell, CenteredMessage } from '@/components/Ui';
import { SocialAvatar } from '@/components/Social';
import type { Profile } from '@/lib/platform';
import { authorHandle } from '@/lib/social';
import { getUploadErrorMessage, uploadPublicFile } from '@/lib/uploads';
import { ProfileImageCropDialog } from '@/components/ProfileImageCropDialog';
import type { Database } from '@/lib/database.types';

type PendingImage = { file: File; target: 'avatar' | 'hero' };

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [heroUrl, setHeroUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [error, setError] = useState('');
  const avatarInputId = useId();
  const heroInputId = useId();

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
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
    const payload: Database['public']['Tables']['profiles']['Update'] = {
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
    router.push(targetHandle ? `/profile/${targetHandle}` : '/profile');
  }

  function selectImage(event: ChangeEvent<HTMLInputElement>, target: 'avatar' | 'hero') {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingImage({ file, target });
    event.target.value = '';
  }

  async function uploadCroppedImage(file: File, target: 'avatar' | 'hero') {
    if (!user) return;
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
      setPendingImage(null);
    } catch (uploadError) {
      setError(getUploadErrorMessage(uploadError));
    } finally {
      setUploading('');
    }
  }

  if (authLoading) {
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

  if (loading) {
    return <PageShell><CenteredMessage>Loading profile...</CenteredMessage></PageShell>;
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
        <label
          htmlFor={heroInputId}
          className="social-profile-cover profile-cover-edit-control"
          style={{ backgroundImage: heroUrl ? `url(${heroUrl})` : undefined }}
          aria-label="Cover preview"
        >
          <span className="profile-image-edit-icon" aria-hidden="true" />
          <span className="profile-edit-visually-hidden">Choose a new cover image</span>
        </label>
        <input
          id={heroInputId}
          type="file"
          accept="image/*"
          onChange={event => selectImage(event, 'hero')}
          disabled={Boolean(uploading)}
          className="profile-image-input"
        />

        <section className="social-profile-head">
          <div className="social-profile-main">
            <div className="social-profile-identity">
              <label htmlFor={avatarInputId} className="profile-avatar-edit-wrap profile-avatar-edit-control">
                <SocialAvatar profile={previewProfile} size="large" />
                <span className="profile-image-edit-icon" aria-hidden="true" />
                <span className="profile-edit-visually-hidden">Choose a new profile photo</span>
              </label>
              <input
                id={avatarInputId}
                type="file"
                accept="image/*"
                onChange={event => selectImage(event, 'avatar')}
                disabled={Boolean(uploading)}
                className="profile-image-input"
              />
              <div className="social-profile-text">
                <h1 className="social-profile-name">{displayName || 'Your name'}</h1>
                {username && <div className="social-handle">@{username}</div>}
                <p className="social-profile-bio">
                  {bio || 'Add a short bio for your public profile.'}
                </p>
              </div>
            </div>

            <div className="social-profile-actions">
              <Link href={authorHandle(profile) ? `/profile/${authorHandle(profile)}` : '/profile'} className="os-button os-button-secondary">
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
      {pendingImage && (
        <ProfileImageCropDialog
          file={pendingImage.file}
          target={pendingImage.target}
          busy={Boolean(uploading)}
          onCancel={() => {
            if (!uploading) setPendingImage(null);
          }}
          onConfirm={file => uploadCroppedImage(file, pendingImage.target)}
        />
      )}
    </PageShell>
  );
}
