'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/Ui';
import { CommunitySetupGate } from '@/components/CommunitySetupGate';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Category } from '@/lib/platform';
import { normalizeTaxonomyValue } from '@/lib/taxonomy';
import { hasCommunityIdentity } from '@/lib/communityProfile';
import { loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import type { SubjectType } from '@/lib/social';

// Only these 4 categories are pickable in the New Post UI.
// Slugs match the DB (existing `discussions` stays for FK integrity; display is "General").
const NEW_POST_CATEGORY_SLUGS = ['discussions', 'updates', 'reviews', 'questions'] as const;
type PickableSlug = (typeof NEW_POST_CATEGORY_SLUGS)[number];

// Which subject types are allowed for each category.
const SUBJECT_TYPES_FOR_CATEGORY: Record<PickableSlug, SubjectType[]> = {
  discussions: ['product', 'service', 'resource', 'profile'],
  updates:     ['product'],
  reviews:     ['product', 'service'],
  questions:   ['resource', 'product'],
};

type SubjectResult = {
  type: SubjectType;
  id: string;
  label: string;
};

function buildSlug(title: string) {
  const base = normalizeTaxonomyValue(title) || 'thread';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function subjectTypeLabel(type: SubjectType | null) {
  switch (type) {
    case 'product': return 'Product';
    case 'service': return 'Service';
    case 'resource': return 'Resource';
    case 'profile': return 'Member';
    case 'collection_item': return 'Library item';
    default: return 'Item';
  }
}

function displayCategoryName(slug: string, dbName: string) {
  // Display override: 'discussions' shows as "General"
  if (slug === 'discussions') return 'General';
  return dbName;
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
  const search = useSearchParams();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [postType, setPostType] = useState('discussion');
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [setupGateOpen, setSetupGateOpen] = useState(false);

  // URL params
  const initialSubjectType = (search.get('subject_type') as SubjectType | null) ?? null;
  const initialSubjectId = search.get('subject_id') ?? null;
  const initialSubjectLabel = search.get('subject_label') ?? null;
  const initialCategorySlug = search.get('category');
  const categoryLocked = Boolean(initialCategorySlug);

  const [attachType, setAttachType] = useState<SubjectType | null>(initialSubjectType);
  const [attachId, setAttachId] = useState<string | null>(initialSubjectId);
  const [attachLabel, setAttachLabel] = useState<string | null>(initialSubjectLabel);

  // Typeahead
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SubjectResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    loadStudioProfile(user.id).then(result => setProfile(result.profile));
  }, [user]);

  const isCreator = Boolean(profile && (profile.role === 'creator' || profile.creator_type));

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from('categories').select('*').eq('scope', 'posts').order('sort_order');
      const rows = ((data as Category[] | null) ?? [])
        .filter(c => (NEW_POST_CATEGORY_SLUGS as readonly string[]).includes(c.slug))
        // Hide 'updates' from non-creators — updates are creator-to-owner communications
        .filter(c => c.slug !== 'updates' || isCreator || categoryLocked);
      setCategories(rows);
    }
    loadCategories();
  }, [isCreator, categoryLocked]);

  // When categories load, set initial selection: URL locked category > match to subject type > default 'discussions'
  useEffect(() => {
    if (categories.length === 0 || categoryId) return;
    let targetSlug: string | null = null;
    if (initialCategorySlug) {
      targetSlug = initialCategorySlug;
    } else if (initialSubjectType) {
      // Subject-only pre-fill (rare) — pick a sensible default
      targetSlug = initialSubjectType === 'resource' ? 'questions' : 'reviews';
    } else {
      targetSlug = 'discussions';
    }
    const target = categories.find(c => c.slug === targetSlug) ?? categories[0];
    if (target) {
      setCategoryId(target.id);
      setPostType(target.slug);
    }
  }, [categories, categoryId, initialCategorySlug, initialSubjectType]);

  const activeCategory = useMemo(() => categories.find(c => c.id === categoryId) ?? null, [categories, categoryId]);
  const allowedSubjectTypes: SubjectType[] = useMemo(() => {
    if (!activeCategory) return [];
    const slug = activeCategory.slug as PickableSlug;
    return SUBJECT_TYPES_FOR_CATEGORY[slug] ?? [];
  }, [activeCategory]);

  // When the user changes category and their attached subject is no longer compatible, clear it.
  useEffect(() => {
    if (!attachType) return;
    if (allowedSubjectTypes.length === 0) return;
    if (!allowedSubjectTypes.includes(attachType)) {
      setAttachType(null);
      setAttachId(null);
      setAttachLabel(null);
    }
  }, [allowedSubjectTypes, attachType]);

  // Subject typeahead — filtered by category-allowed subject types
  useEffect(() => {
    if (attachId) { setResults([]); return; }
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const timeout = setTimeout(async () => {
      const queries: Promise<{ data: unknown[] | null; type: SubjectType }>[] = [];
      if (allowedSubjectTypes.includes('product')) {
        queries.push(Promise.resolve(supabase.from('products').select('id, title').ilike('title', `%${q}%`).limit(4)).then(r => ({ data: r.data as unknown[] | null, type: 'product' as SubjectType })));
      }
      if (allowedSubjectTypes.includes('service')) {
        queries.push(Promise.resolve(supabase.from('services').select('id, title').ilike('title', `%${q}%`).limit(4)).then(r => ({ data: r.data as unknown[] | null, type: 'service' as SubjectType })));
      }
      if (allowedSubjectTypes.includes('resource')) {
        queries.push(Promise.resolve(supabase.from('resources').select('id, title').ilike('title', `%${q}%`).limit(4)).then(r => ({ data: r.data as unknown[] | null, type: 'resource' as SubjectType })));
      }
      if (allowedSubjectTypes.includes('profile')) {
        queries.push(Promise.resolve(supabase.from('profiles').select('id, display_name, username').or(`display_name.ilike.%${q}%,username.ilike.%${q}%`).limit(4)).then(r => ({ data: r.data as unknown[] | null, type: 'profile' as SubjectType })));
      }
      const responses = await Promise.all(queries);
      const merged: SubjectResult[] = [];
      responses.forEach(({ data, type }) => {
        (data ?? []).forEach(row => {
          const item = row as { id: string; title?: string; display_name?: string | null; username?: string | null };
          const label = type === 'profile'
            ? (item.display_name || item.username || 'Member')
            : (item.title || 'Item');
          merged.push({ type, id: item.id, label });
        });
      });
      setResults(merged);
      setSearching(false);
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, attachId, allowedSubjectTypes]);

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
        category_id: categoryId || null,
        slug: buildSlug(title),
        title: title.trim(),
        body: body.trim(),
        post_type: postType || 'discussion',
        status: 'published',
      })
      .select('id, slug')
      .single();

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    const created = data as { id: string; slug: string | null } | null;
    if (created && attachType && attachId) {
      const { error: tagError } = await supabase.from('post_subjects').insert({
        post_id: created.id,
        subject_type: attachType,
        subject_id: attachId,
      });
      if (tagError) {
        setSaving(false);
        setError(`Post saved, but tagging failed: ${tagError.message}`);
        return;
      }
    }

    setSaving(false);
    const nextSlug = created?.slug ?? created?.id;
    router.push(`/community/thread/${nextSlug}`);
  }

  function pickResult(result: SubjectResult) {
    setAttachType(result.type);
    setAttachId(result.id);
    setAttachLabel(result.label);
    setQuery('');
    setResults([]);
  }

  function clearAttachment() {
    if (categoryLocked) return; // Don't allow clearing pre-attached subject when arrived from an item page
    setAttachType(null);
    setAttachId(null);
    setAttachLabel(null);
  }

  if (loading || !user) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  const attachHint = attachType
    ? `Will show on this ${subjectTypeLabel(attachType).toLowerCase()}'s page.`
    : allowedSubjectTypes.length > 0
      ? `Optional — attach to a ${allowedSubjectTypes.map(t => subjectTypeLabel(t).toLowerCase()).join(', ')}.`
      : 'This post will only show in the community feed.';

  return (
    <PageShell>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div>
            <h1 className="os-type-page-title">New Post</h1>
            <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginTop: 8 }}>
              Pick a category — it decides where your post appears across 44.
            </p>
          </div>
          <Link href="/community" className="os-button os-button-ghost os-button-compact">Back</Link>
        </div>

        <div className="app-panel" style={{ padding: 'var(--os-space-6, 28px)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
            <div>
              <div className="os-type-card-title" style={{ marginBottom: 8 }}>Category</div>
              {categoryLocked && activeCategory ? (
                <div className="post-attach-chip">
                  <span className="post-attach-chip-type">Locked</span>
                  <span className="post-attach-chip-label">{displayCategoryName(activeCategory.slug, activeCategory.name)}</span>
                </div>
              ) : (
                <div className="settings-segment" role="group" aria-label="Post category">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      type="button"
                      className={category.id === categoryId ? 'settings-segment-item settings-segment-item-active' : 'settings-segment-item'}
                      onClick={() => {
                        setCategoryId(category.id);
                        setPostType(category.slug);
                      }}
                    >
                      {displayCategoryName(category.slug, category.name)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label>
              <div className="os-type-card-title" style={{ marginBottom: 8 }}>Title</div>
              <input
                className="os-input-large"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="What do you want to talk about?"
                style={{ width: '100%' }}
              />
            </label>

            <div>
              <div className="os-type-card-title" style={{ marginBottom: 8 }}>Attach to</div>
              {attachId ? (
                <div className="post-attach-chip">
                  <span className="post-attach-chip-type">{subjectTypeLabel(attachType)}</span>
                  <span className="post-attach-chip-label">{attachLabel}</span>
                  {!categoryLocked && (
                    <button type="button" className="post-attach-chip-clear" onClick={clearAttachment} aria-label="Remove attachment">×</button>
                  )}
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input
                    className="os-input-large"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder={allowedSubjectTypes.length > 0 ? `Search ${allowedSubjectTypes.map(t => subjectTypeLabel(t).toLowerCase() + 's').join(', ')}…` : ''}
                    disabled={allowedSubjectTypes.length === 0}
                    style={{ width: '100%' }}
                  />
                  {(results.length > 0 || searching) && (
                    <div className="post-attach-results">
                      {searching && <div className="post-attach-result-empty">Searching…</div>}
                      {results.map(result => (
                        <button
                          key={`${result.type}-${result.id}`}
                          type="button"
                          className="post-attach-result"
                          onClick={() => pickResult(result)}
                        >
                          <span className="post-attach-result-type">{subjectTypeLabel(result.type)}</span>
                          <span className="post-attach-result-label">{result.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)', marginTop: 8 }}>
                {attachHint}
              </div>
            </div>

            <label>
              <div className="os-type-card-title" style={{ marginBottom: 8 }}>Message</div>
              <textarea
                className="os-input-textarea"
                rows={10}
                value={body}
                onChange={event => setBody(event.target.value)}
                placeholder="Share the context, the question, or the update."
                style={{ minHeight: 200 }}
              />
            </label>

            {error && (
              <div className="dashboard-status dashboard-status-error">
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Link className="os-button os-button-ghost" href="/community">Cancel</Link>
              <button className="os-button os-button-primary" type="submit" disabled={saving}>
                {saving ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <CommunitySetupGate open={setupGateOpen} onClose={() => setSetupGateOpen(false)} />
    </PageShell>
  );
}
