'use client';

import Image from 'next/image';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PageShell } from '@/components/Ui';
import { TeamAccessBoundary } from '@/components/team/TeamPrimitives';
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

function LogoShowcase() {
  return <div className="team-brand-logo-showcase" aria-label="Approved black and white logo examples">
    <figure className="team-brand-logo-card team-brand-logo-card-dark">
      <Image src="/brand/forty-four-mark-white.png" alt="White forty four mark" width={512} height={512} />
      <figcaption><strong>White mark</strong><span>For dark backgrounds</span></figcaption>
    </figure>
    <figure className="team-brand-logo-card team-brand-logo-card-light">
      <Image src="/brand/forty-four-mark-black.png" alt="Black forty four mark" width={512} height={512} />
      <figcaption><strong>Black mark</strong><span>For light backgrounds</span></figcaption>
    </figure>
  </div>;
}

function DeveloperSystemShowcase() {
  return <div className="team-brand-dev-reference" aria-label="44OS interface system examples">
    <header><span>44OS</span><strong>Interface reference</strong></header>

    <section className="team-brand-dev-section">
      <h3>Accent colors</h3>
      <div className="team-brand-dev-accents">
        <div><i style={{ background: '#60A5FA' }} /><strong>Ocean</strong><code>#60A5FA</code></div>
        <div><i style={{ background: '#F59E0B' }} /><strong>Amber</strong><code>#F59E0B</code></div>
        <div><i style={{ background: '#7CFF4F' }} /><strong>Sage</strong><code>#7CFF4F</code></div>
        <div><i style={{ background: '#B56CFF' }} /><strong>Violet</strong><code>#B56CFF</code></div>
      </div>
    </section>

    <section className="team-brand-dev-section">
      <h3>Materials</h3>
      <div className="team-brand-dev-materials">
        <div className="team-brand-dev-material team-brand-dev-material-environment"><span /><div><strong>Environment</strong><small>Behind the app window</small></div></div>
        <div className="team-brand-dev-material team-brand-dev-material-shell"><span /><div><strong>Shell glass</strong><small>One unified workspace</small></div></div>
        <div className="team-brand-dev-material team-brand-dev-material-glass"><span /><div><strong>Glass</strong><small>Flat panels and lists</small></div></div>
        <div className="team-brand-dev-material team-brand-dev-material-paper"><span /><div><strong>Paper</strong><small>Raised transient menus</small></div></div>
      </div>
    </section>

    <div className="team-brand-dev-columns">
      <section className="team-brand-dev-section">
        <h3>Corner radius</h3>
        <div className="team-brand-dev-radii" aria-label="Radius steps">
          {[14, 18, 22, 26, 34].map(radius => <span key={radius} style={{ borderRadius: radius }}>{radius}</span>)}
          <span className="team-brand-dev-radius-pill">Pill</span>
        </div>
      </section>
      <section className="team-brand-dev-section">
        <h3>Border and elevation</h3>
        <div className="team-brand-dev-elevation">
          <div className="team-brand-dev-flat"><strong>Flat</strong><small>1px hairline, no shadow</small></div>
          <div className="team-brand-dev-raised"><strong>Raised</strong><small>Shared content shadow</small></div>
        </div>
      </section>
    </div>

    <section className="team-brand-dev-section team-brand-dev-type">
      <h3>Application typography</h3>
      <div><span>Page title</span><strong className="team-brand-dev-type-page">Discover</strong><code>26 / 32 · 700</code></div>
      <div><span>Section title</span><strong className="team-brand-dev-type-section">New Releases</strong><code>22 / 26 · 700</code></div>
      <div><span>Card title</span><strong className="team-brand-dev-type-card">MUSES</strong><code>13 / 16 · 600</code></div>
      <div><span>Body</span><strong className="team-brand-dev-type-body">A platform for independent creative work.</strong><code>13 / 18 · 400</code></div>
      <div><span>Metadata</span><strong className="team-brand-dev-type-meta">TELLALI · 2026</strong><code>10 / 13 · 400</code></div>
    </section>
  </div>;
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

  async function downloadKit() {
    setDownloading(true); setKitMessage('');
    try {
      const token = await teamBearerToken();
      if (!token) throw new Error('Sign in again to download the Brand Kit.');
      const response = await fetch('/api/team/brand-kit', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const body = await response.json() as { downloadUrl?: string; filename?: string; localDownload?: boolean; error?: string };
      if (!response.ok || !body.downloadUrl) throw new Error(body.error || 'The Brand Kit could not be downloaded.');
      if (body.localDownload) {
        const localResponse = await fetch(body.downloadUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!localResponse.ok) throw new Error('The local Brand Kit could not be downloaded.');
        const objectUrl = URL.createObjectURL(await localResponse.blob());
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = body.filename || 'forty-four-brand-kit.zip';
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
        return;
      }
      window.location.assign(body.downloadUrl);
    } catch (downloadError) {
      setKitMessage(downloadError instanceof Error ? downloadError.message : 'The Brand Kit could not be downloaded.');
    } finally { setDownloading(false); }
  }

  if (loading) return <div className="team-brand-loading"><div className="ui44-loading-shell" role="status" aria-label="Loading Brand Guide" /></div>;
  if (error) return <div className="team-brand-error" role="alert">{error}</div>;

  return <PageShell><main className="team-brand-surface">
    <div className="team-brand-top"><button className="team-brand-download" type="button" onClick={downloadKit} disabled={downloading}>{downloading ? 'Preparing…' : 'Download Brand Kit'}</button></div>
    {kitMessage ? <p className="team-brand-kit-message" role="status">{kitMessage}</p> : null}
    <div className="team-brand-layout">
      <article className="team-brand-document">
        {blocks.map((block, index) => {
          if (block.kind === 'h1') return <h1 id={block.id} key={index}>{block.text}</h1>;
          if (block.kind === 'h2') return <Fragment key={index}><h2 id={block.id}>{block.text}</h2>{block.id === 'logo-system' ? <LogoShowcase /> : null}{block.id === 'for-developers' ? <DeveloperSystemShowcase /> : null}</Fragment>;
          if (block.kind === 'h3') return <h3 id={block.id} key={index}>{block.text}</h3>;
          if (block.kind === 'ul') return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>;
          return <p key={index}>{inline(block.text)}</p>;
        })}
      </article>
    </div>
  </main></PageShell>;
}

export default function TeamBrandGuideApp() {
  return <TeamAccessBoundary><BrandGuide /></TeamAccessBoundary>;
}
