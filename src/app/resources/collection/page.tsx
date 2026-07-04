'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { SavedResource } from '@/lib/platform';
import { useAuth } from '@/lib/useAuth';
import { PageShell, HubHero, EmptyMessage, ResourceCard } from '@/components/Ui';
import { useResourcesTopbarTabs } from '@/components/ResourcesTopbarTabs';
import { isMissingRelationError } from '@/lib/schemaCompat';

export default function ResourcesCollectionPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<SavedResource[]>([]);
  const [schemaReady, setSchemaReady] = useState(true);

  useResourcesTopbarTabs('collection');

  useEffect(() => {
    if (!user) {
      setRows([]);
      return;
    }

    async function loadCollection() {
      const { data, error } = await supabase
        .from('saved_resources')
        .select('id,resource_id,saved_at,resources(*, creators:profiles!author_id(id, slug, name:display_name, avatar_url), categories(id, slug, name))')
        .eq('user_id', user!.id)
        .order('saved_at', { ascending: false });

      if (isMissingRelationError(error)) {
        setSchemaReady(false);
        return;
      }

      setRows((data as SavedResource[] | null) ?? []);
      setSchemaReady(true);
    }

    loadCollection();
  }, [user]);

  return (
    <PageShell>
      <div className="app-page">
        <HubHero
          title="Saved Resources"
          copy="Saved guides, templates, references, and downloads for later."
        />

        {loading ? (
          <EmptyMessage>Loading saved resources...</EmptyMessage>
        ) : !user ? (
          <EmptyMessage>
            Sign in to save resources for later.
            <div style={{ marginTop: 18 }}>
              <Link href="/login" className="os-button os-button-primary os-button-compact">Sign In</Link>
            </div>
          </EmptyMessage>
        ) : !schemaReady ? (
          <EmptyMessage>Saved resources are ready in the app. Run the library SQL to enable saved resources in Supabase.</EmptyMessage>
        ) : rows.length === 0 ? (
          <EmptyMessage>No saved resources yet.</EmptyMessage>
        ) : (
          <div className="app-grid">
            {rows.map(row => row.resources ? (
              <ResourceCard key={row.id} resource={row.resources} saved />
            ) : null)}
          </div>
        )}
      </div>
    </PageShell>
  );
}
