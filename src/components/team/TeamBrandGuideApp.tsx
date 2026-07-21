'use client';

import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { TeamAccessBoundary, TeamSectionNav } from '@/components/team/TeamPrimitives';
import { teamBearerToken } from '@/lib/domain/team';

type MarkdownBlock =
  | { kind: 'h1' | 'h2' | 'h3'; text: string; id: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] };

function slug(value: string) {
  return value.toLowerCase().replace(/[`*]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', text: paragraph.join(' ').replace(/\s{2,}/g, ' ').trim() });
    if (list.length) blocks.push({ kind: 'ul', items: list });
    paragraph = []; list = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flush();
      const text = heading[2].replace(/[*`]/g, '');
      blocks.push({ kind: `h${heading[1].length}` as 'h1' | 'h2' | 'h3', text, id: slug(text) });
      continue;
    }
    if (line.startsWith('- ')) {
      if (paragraph.length) flush();
      list.push(line.slice(2));
      continue;
    }
    if (list.length) flush();
    paragraph.push(line.replace(/\s{2}$/g, ''));
  }
  flush();
  return blocks;
}

function inline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('`') && token.endsWith('`')) return <code key={index}>{token.slice(1, -1)}</code>;
    return <Fragment key={index}>{token}</Fragment>;
  });
}

function BrandGuide() {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kitMessage, setKitMessage] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    void teamBearerToken().then(async token => {
      if (!token) throw new Error('Sign in again to open the Brand Guide.');
      const response = await fetch('/api/team/brand-guide', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const body = await response.json() as { markdown?: string; error?: string };
      if (!response.ok || !body.markdown) throw new Error(body.error || 'The Brand Guide could not be loaded.');
      if (alive) { setMarkdown(body.markdown); setLoading(false); }
    }).catch(loadError => {
      if (alive) { setError(loadError instanceof Error ? loadError.message : 'The Brand Guide could not be loaded.'); setLoading(false); }
    });
    return () => { alive = false; };
  }, []);

  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);
  const sections = blocks.filter(block => block.kind === 'h2') as Array<{ kind: 'h2'; text: string; id: string }>;

  async function downloadKit() {
    setDownloading(true); setKitMessage('');
    try {
      const token = await teamBearerToken();
      if (!token) throw new Error('Sign in again to download the Brand Kit.');
      const response = await fetch('/api/team/brand-kit', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const body = await response.json() as { downloadUrl?: string; error?: string };
      if (!response.ok || !body.downloadUrl) throw new Error(body.error || 'The Brand Kit could not be downloaded.');
      window.location.assign(body.downloadUrl);
    } catch (downloadError) {
      setKitMessage(downloadError instanceof Error ? downloadError.message : 'The Brand Kit could not be downloaded.');
    } finally { setDownloading(false); }
  }

  if (loading) return <div className="team-brand-loading"><div className="ui44-loading-shell" role="status" aria-label="Loading Brand Guide" /></div>;
  if (error) return <div className="team-brand-error" role="alert">{error}</div>;

  return <main className="team-brand-surface">
    <div className="team-brand-top"><TeamSectionNav /><button className="team-brand-download" type="button" onClick={downloadKit} disabled={downloading}>{downloading ? 'Preparing…' : 'Download Brand Kit'}</button></div>
    {kitMessage ? <p className="team-brand-kit-message" role="status">{kitMessage}</p> : null}
    <div className="team-brand-layout">
      <aside className="team-brand-toc"><strong>Brand Guide</strong><nav aria-label="Brand Guide sections">{sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.text}</a>)}</nav></aside>
      <article className="team-brand-document">
        {blocks.map((block, index) => {
          if (block.kind === 'h1') return <h1 id={block.id} key={index}>{block.text}</h1>;
          if (block.kind === 'h2') return <h2 id={block.id} key={index}>{block.text}</h2>;
          if (block.kind === 'h3') return <h3 id={block.id} key={index}>{block.text}</h3>;
          if (block.kind === 'ul') return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>;
          return <p key={index}>{inline(block.text)}</p>;
        })}
      </article>
    </div>
  </main>;
}

export default function TeamBrandGuideApp() {
  return <TeamAccessBoundary><BrandGuide /></TeamAccessBoundary>;
}
