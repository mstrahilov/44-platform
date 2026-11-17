'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { isSavedMusicContractMissing, listSavedMusicTracks, listVisibleLibraryItems } from '@/lib/domain/library';
import { listPlaylists, type Playlist } from '@/lib/domain/playlists';
import { getProductExperience, productLibraryHref } from '@/lib/experience';
import { useTopbarBack } from '@/components/TopbarContext';

type Result = { id: string; title: string; detail: string; href: string; image?: string | null };

export default function LibrarySearchPage() {
  useTopbarBack({ href: '/library', label: 'Library' });
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const [query, setQuery] = useState(() => params.get('q') || '');
  const [results, setResults] = useState<Result[]>([]);
  const [completedQuery, setCompletedQuery] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user) return;
    const q = query.trim().toLocaleLowerCase();
    if (!q) return;
    let live = true;
    void (async () => {
      const [items, playlists] = await Promise.all([listVisibleLibraryItems(user.id), listPlaylists(user.id)]);
      let tracks: Awaited<ReturnType<typeof listSavedMusicTracks>> = [];
      let savedMusicAvailable = true;
      try {
        tracks = await listSavedMusicTracks(user.id);
      } catch (musicError) {
        if (!isSavedMusicContractMissing(musicError)) throw musicError;
        savedMusicAvailable = false;
      }
      if (!live) return;
      const next: Result[] = [];
      for (const item of items) {
        const product = item.products;
        if (!product || !`${product.title} ${product.creator} ${product.item_type}`.toLocaleLowerCase().includes(q)) continue;
        const exp = getProductExperience(product);
        if (exp === 'music' && savedMusicAvailable) continue;
        next.push({ id: item.id, title: product.title, detail: product.item_type, href: productLibraryHref(product, item.id), image: product.cover_url });
      }
      const albums = new Map<string, Result>();
      tracks.forEach(track => {
        if (!`${track.title} ${track.product.title} ${track.product.creator}`.toLocaleLowerCase().includes(q)) return;
        if (!albums.has(track.item_id)) albums.set(track.item_id, { id: track.item_id, title: track.product.title, detail: `${track.product.creator} · Saved music`, href: `/library/music/${track.item_id}`, image: track.product.cover_url });
        next.push({ id: track.track_id, title: track.title, detail: `${track.product.title} · Track`, href: `/library/music/${track.item_id}`, image: track.product.cover_url });
      });
      next.push(...albums.values());
      (playlists as Playlist[]).forEach(playlist => { if (`${playlist.title}`.toLocaleLowerCase().includes(q)) next.push({ id: playlist.id, title: playlist.title, detail: 'Playlist', href: `/library/playlists/${playlist.id}`, image: playlist.artwork_url }); });
      setResults(next);
      setError('');
      setCompletedQuery(q);
    })().catch(reason => { if (live) { setError(reason instanceof Error ? reason.message : 'Could not search your Library.'); setCompletedQuery(q); } });
    return () => { live = false; };
  }, [query, user]);

  const ordered = results;
  const busy = Boolean(query.trim()) && completedQuery !== query.trim().toLocaleLowerCase();
  if (loading) return <main className="app-page"><p role="status">Loading Library…</p></main>;
  if (!user) return <main className="app-page"><Link href="/login">Sign in to search your Library.</Link></main>;
  return <main className="app-page library-search-page">
    <div className="library-search-heading"><Link href="/library" aria-label="Back to Library">‹ Library</Link><h1>Search Library</h1></div>
    <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search saved items" aria-label="Search saved items" autoFocus />
    {busy ? <p role="status">Searching your Library…</p> : error ? <p role="alert" className="ui44-status ui44-status-error">{error}</p> : !query.trim() ? <p>Search your saved music, playlists, books, games, and assets.</p> : ordered.length ? <div className="app-grid ui44-catalog-grid">{ordered.map(result => <Link key={`${result.id}:${result.detail}`} href={result.href} className="product-tile ui44-catalog-card"><span className="product-tile-art product-tile-art-square ui44-catalog-art">{result.image ? <img src={result.image} alt="" /> : null}</span><span className="product-tile-info ui44-catalog-copy"><span className="product-tile-title ui44-catalog-title">{result.title}</span><span className="product-tile-subtitle ui44-catalog-subheadline">{result.detail}</span></span></Link>)}</div> : <p>No saved items match your search.</p>}
  </main>;
}
