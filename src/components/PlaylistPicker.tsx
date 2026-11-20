'use client';

import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/Ui';
import { PublicArtwork } from '@/components/PublicArtwork';
import { useTopbarBack, useTopbarTitle } from '@/components/TopbarContext';
import { getUploadErrorMessage, uploadPublicFile } from '@/lib/uploads';
import { useAuth } from '@/lib/useAuth';
import { addReleaseToPlaylist, addTrackToPlaylist, createPlaylist, listPlaylistIdsContainingTrack, listPlaylists, type Playlist } from '@/lib/domain/playlists';

const PICKER_PATH = '/library/add-to-playlist';

/** Navigation bridge retained for existing callers. The picker itself is a dedicated app page. */
export function PlaylistPicker({ userId, trackId, releaseItemId, onClose }: { userId: string; trackId?: string; releaseItemId?: string; onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams();
    if (trackId) params.set('trackId', trackId);
    if (releaseItemId) params.set('releaseItemId', releaseItemId);
    const returnTo = `${window.location.pathname}${window.location.search}`;
    params.set('returnTo', returnTo);
    router.push(`${PICKER_PATH}?${params.toString()}`);
    onClose();
  }, [onClose, releaseItemId, router, trackId, userId]);

  return null;
}

export function PlaylistPickerPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsWithTrack, setPlaylistsWithTrack] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] = useState(Boolean(params.get('trackId')));
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputId = useId();
  const trackId = params.get('trackId') || undefined;
  const releaseItemId = params.get('releaseItemId') || undefined;
  const returnTo = safeReturnPath(params.get('returnTo'));

  useTopbarTitle(creating ? 'New Playlist' : 'Add to Playlist');
  useTopbarBack({ href: returnTo, label: 'Close', alwaysNavigate: true });

  const closeCreate = useCallback(() => {
    setCreating(false);
    setTitle('');
    setCoverUrl('');
    setError('');
  }, []);

  const create = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const name = title.trim();
    if (!user || !name || saving || uploading) return;
    setSaving(true);
    setError('');
    try {
      const playlist = await createPlaylist(user.id, name, coverUrl || null);
      setPlaylists(current => sortPlaylistsOldestFirst([
        ...current.filter(row => row.id !== playlist.id),
        { ...playlist, artwork_url: coverUrl || null, trackCount: 0 },
      ]));
      setCreating(false);
      setTitle('');
      setCoverUrl('');
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Could not create playlist.');
    } finally {
      setSaving(false);
    }
  }, [coverUrl, saving, title, uploading, user]);

  useEffect(() => {
    function runPrimaryAction() {
      if (creating) void create();
      else { setError(''); setCreating(true); }
    }
    window.addEventListener('playlist-picker:primary-action', runPrimaryAction);
    return () => window.removeEventListener('playlist-picker:primary-action', runPrimaryAction);
  }, [create, creating]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void listPlaylists(user.id)
      .then(rows => { if (active) setPlaylists(sortPlaylistsOldestFirst(rows)); })
      .catch(value => { if (active) setError(value instanceof Error ? value.message : 'Could not load playlists.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !trackId) {
      setPlaylistsWithTrack(new Set());
      setMembershipLoading(false);
      return;
    }
    let active = true;
    setMembershipLoading(true);
    void listPlaylistIdsContainingTrack(trackId)
      .then(ids => { if (active) setPlaylistsWithTrack(new Set(ids)); })
      .catch(value => { if (active) setError(value instanceof Error ? value.message : 'Could not check playlist status.'); })
      .finally(() => { if (active) setMembershipLoading(false); });
    return () => { active = false; };
  }, [trackId, user]);

  async function selectPlaylist(playlistId: string) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      if (releaseItemId) await addReleaseToPlaylist(releaseItemId, playlistId);
      else if (trackId) await addTrackToPlaylist(trackId, playlistId);
      router.replace(returnTo);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Could not add this track.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArtwork(file?: File) {
    if (!file || !user) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadPublicFile({ file, folder: 'playlists', userId: user.id });
      setCoverUrl(uploaded.publicUrl);
    } catch (value) {
      setError(getUploadErrorMessage(value));
    } finally {
      setUploading(false);
    }
  }

  return <PageShell>
    <main className={`dashboard-page playlist-picker-page${creating ? ' playlist-picker-page-creating' : ''}`}>
      {creating ? (
        <form className="playlist-create-page playlist-picker-create-page" onSubmit={create}>
          <label className="playlist-create-art" htmlFor={inputId} style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}>
            {!coverUrl ? <ArtworkIcon className="playlist-create-art-icon" /> : null}
            <span className="sr-only">Choose playlist artwork</span>
          </label>
          <input id={inputId} className="ui44-file-input-hidden" type="file" accept="image/*" onChange={event => void handleArtwork(event.target.files?.[0])} disabled={uploading || saving} />
          <div className="library-search-field playlist-create-title-field">
            <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Playlist Name" aria-label="Playlist Name" maxLength={80} autoFocus disabled={saving} />
          </div>
          {uploading ? <p role="status">Uploading artwork…</p> : null}
          {error ? <p className="ui44-status ui44-status-error" role="alert">{error}</p> : null}
          <button type="button" className="playlist-picker-create-cancel" onClick={closeCreate} disabled={saving || uploading}>Back to playlists</button>
        </form>
      ) : (
        <>
          <section className="dashboard-section playlist-picker-section">
            {loading ? <p className="playlist-picker-state" role="status">Loading playlists…</p> : null}
            {!loading && playlists.length ? (
              <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip" aria-label="Your playlists">
                {playlists.map(playlist => (
                  <button key={playlist.id} type="button" className="dashboard-list-row studio-overview-row ui44-list-row ui44-list-row-dashboard ui44-list-row-interactive playlist-picker-studio-row" disabled={saving || membershipLoading || playlistsWithTrack.has(playlist.id)} onClick={() => void selectPlaylist(playlist.id)} aria-label={playlistsWithTrack.has(playlist.id) ? `${playlist.title}, already in playlist` : `Add to ${playlist.title}, ${playlist.trackCount ?? 0} tracks`}>
                    <span className="studio-overview-artwork" aria-hidden="true">
                      {playlist.artwork_url || playlist.cover_url
                        ? <PublicArtwork className="studio-overview-artwork-image" src={playlist.artwork_url || playlist.cover_url || ''} alt="" width={56} height={56} sizes="56px" />
                        : <MusicIcon />}
                    </span>
                    <span className="studio-overview-copy playlist-picker-row-copy">
                      <span className="studio-overview-title">{playlist.title}</span>
                      {playlistsWithTrack.has(playlist.id) ? <span className="studio-overview-subtitle">Already in playlist</span> : null}
                    </span>
                    <span className="studio-overview-trailing playlist-picker-row-count">{playlist.trackCount ?? 0}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {!loading && !playlists.length ? <p className="playlist-picker-state">No playlists yet. Create one with + to add this {releaseItemId ? 'release' : 'track'}.</p> : null}
            {error ? <p className="playlist-picker-error" role="alert">{error}</p> : null}
          </section>
        </>
      )}
    </main>
  </PageShell>;
}

function safeReturnPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/library';
}

function sortPlaylistsOldestFirst(playlists: Playlist[]) {
  return [...playlists].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

function MusicIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>; }
function ArtworkIcon({ className }: { className?: string }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 4.5-4.5 3.5 3 2.5-2.5L20 17" /></svg>; }
