'use client';

import { useEffect, useId, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { PageShell, CenteredMessage } from '@/components/Ui';
import { SocialAvatar } from '@/components/Social';
import type { Profile } from '@/lib/platform';
import { authorHandle } from '@/lib/social';
import { getUploadErrorMessage, uploadPublicFile } from '@/lib/uploads';
import { ProfileImageCropDialog } from '@/components/ProfileImageCropDialog';
import type { Database } from '@/lib/database.types';
import { getOwnProfile, updateOwnProfile } from '@/lib/domain/profiles';
import { ExternalLinksEditor } from '@/components/ExternalLinksEditor';
import { Ui44FileInput, Ui44TextInput, Ui44Textarea } from '@/components/ui44/Inputs';
import {
  listExternalLinkPlatforms,
  listOwnProfileExternalLinks,
  materializeExternalLinkDrafts,
  activeExternalLinkDrafts,
  replaceOwnProfileExternalLinks,
  validateExternalLinkDrafts,
  type ExternalLinkDraft,
  type ExternalLinkPlatform,
} from '@/lib/domain/externalLinks';

type PendingImage = { file: File };

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [externalLinks, setExternalLinks] = useState<ExternalLinkDraft[]>([]);
  const [externalLinkPlatforms, setExternalLinkPlatforms] = useState<ExternalLinkPlatform[]>([]);
  const [initialExternalLinks, setInitialExternalLinks] = useState<ExternalLinkDraft[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [error, setError] = useState('');
  const avatarInputId = useId();

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    async function load() {
      const [p, links, platforms] = await Promise.all([
        getOwnProfile(user!.id),
        listOwnProfileExternalLinks(user!.id),
        listExternalLinkPlatforms('profile'),
      ]);
      setProfile(p);
      setExternalLinks(materializeExternalLinkDrafts(platforms, links));
      setInitialExternalLinks(activeExternalLinkDrafts(links));
      setExternalLinkPlatforms(platforms);
      if (p) {
        setDisplayName(p.display_name ?? '');
        setUsername(p.username ?? '');
        setBio(p.bio ?? '');
        setAvatarUrl(p.avatar_url ?? '');
      }
      setLoading(false);
    }
    load();
  }, [user, authLoading]);

  async function save() {
    if (!user || saving) return;
    const canManageExternalLinks = profile?.role === 'creator' || profile?.role === 'admin';
    setSaving(true);
    setError('');
    const linkError = canManageExternalLinks ? validateExternalLinkDrafts(externalLinks, externalLinkPlatforms) : null;
    if (linkError) {
      setSaving(false);
      setError(linkError);
      return;
    }
    const activeLinks = activeExternalLinkDrafts(externalLinks);
    const linksChanged = JSON.stringify(activeLinks) !== JSON.stringify(initialExternalLinks);
    const payload: Database['public']['Tables']['profiles']['Update'] = {
      display_name: displayName.trim() || null,
      username: username.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    };
    try {
      await updateOwnProfile(user.id, payload);
      if (canManageExternalLinks && linksChanged) await replaceOwnProfileExternalLinks(activeLinks);
    } catch (updateError) {
      setSaving(false);
      setError(updateError instanceof Error ? updateError.message : 'Could not update your profile.');
      return;
    }
    setSaving(false);
    const targetHandle = username.trim() || authorHandle(profile) || '';
    router.push(targetHandle ? `/profile/${targetHandle}` : '/profile');
  }

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingImage({ file });
    event.target.value = '';
  }

  async function uploadCroppedImage(file: File) {
    if (!user) return;
    setUploading('avatar');
    setError('');
    try {
      const result = await uploadPublicFile({
        file,
        folder: 'profiles/avatars',
        userId: user.id,
      });
      setAvatarUrl(result.publicUrl);
      setPendingImage(null);
    } catch (uploadError) {
      setError(getUploadErrorMessage(uploadError));
    } finally {
      setUploading('');
    }
  }

  if (authLoading) {
    return <PageShell><CenteredMessage status>Loading profile...</CenteredMessage></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <CenteredMessage>
          Sign in to edit your profile.{' '}
          <Link href="/login" className="os-button os-button-primary os-button-compact profile-edit-sign-in">Sign In</Link>
        </CenteredMessage>
      </PageShell>
    );
  }

  if (loading) {
    return <PageShell><CenteredMessage status>Loading profile...</CenteredMessage></PageShell>;
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
        <section className="social-profile-head">
          <div className="social-profile-main">
            <div className="social-profile-identity">
              <label htmlFor={avatarInputId} className="profile-avatar-edit-wrap profile-avatar-edit-control">
                <SocialAvatar profile={previewProfile} size="large" />
                <span className="profile-image-edit-icon" aria-hidden="true" />
                <span className="profile-edit-visually-hidden">Choose a new profile photo</span>
              </label>
              <Ui44FileInput
                id={avatarInputId}
                accept="image/*"
                onChange={selectImage}
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

            <div className="social-profile-actions profile-edit-actions">
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

          {error && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{error}</div>}

          <div className="profile-edit-fields ui44-form-grid">
            <label className="profile-edit-field dashboard-field">
              <span className="profile-edit-label">Display name</span>
              <Ui44TextInput
                type="text"
                value={displayName}
                onChange={event => setDisplayName(event.target.value)}
                className="profile-edit-input os-input-field"
                placeholder="Enter public name"
              />
            </label>

            <label className="profile-edit-field dashboard-field">
              <span className="profile-edit-label">Username</span>
              <span className="profile-edit-username-control ui44-composed-field">
                <span className="profile-edit-username-prefix" aria-hidden="true">@</span>
                <Ui44TextInput
                  surface="bare"
                  type="text"
                  value={username}
                  onChange={event => setUsername(event.target.value.replace(/\s+/g, '').toLowerCase())}
                  className="profile-edit-username-input"
                  aria-label="Username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </span>
            </label>

            <label className="profile-edit-field profile-edit-field-full dashboard-field">
              <span className="profile-edit-label">Bio</span>
              <Ui44Textarea
                value={bio}
                onChange={event => setBio(event.target.value)}
                className="profile-edit-input profile-edit-textarea os-input-field"
                rows={4}
              />
            </label>

          </div>

          {(profile?.role === 'creator' || profile?.role === 'admin') && <div className="profile-edit-links-section">
            <div className="settings-field-head">
              <div className="os-type-card-title">Around the Web</div>
            </div>
            <ExternalLinksEditor
              links={externalLinks}
              platforms={externalLinkPlatforms}
              onChange={setExternalLinks}
            />
          </div>}
        </section>
      </main>
      {pendingImage && (
        <ProfileImageCropDialog
          file={pendingImage.file}
          busy={Boolean(uploading)}
          onCancel={() => {
            if (!uploading) setPendingImage(null);
          }}
          onConfirm={uploadCroppedImage}
        />
      )}
    </PageShell>
  );
}
