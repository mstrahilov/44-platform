'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { PageShell } from '@/components/Ui';
import {
  Ui44CheckboxInput,
  Ui44FileInput,
  Ui44RangeInput,
  Ui44SelectInput,
  Ui44Textarea,
  Ui44TextInput,
} from '@/components/ui44/Inputs';
import {
  Ui44BackSymbol,
  Ui44Button,
  Ui44CartSymbol,
  Ui44ControlExample,
  Ui44MenuSymbol,
  Ui44SearchSymbol,
  Ui44SectionArrow,
} from '@/components/ui44/Controls';
import {
  Ui44AchievementRow,
  Ui44CommunityPostRow,
  Ui44DetailRow,
  Ui44Panel,
  Ui44PanelContent,
  Ui44ReviewRow,
  Ui44Section,
  Ui44StudioReleaseRow,
  Ui44TrackRow,
} from '@/components/ui44/Spacing';
import { Ui44Text, ui44TypeSpecimens, type Ui44TextTone } from '@/components/ui44/Typography';
import { Ui44FormField, Ui44FormGrid, Ui44IdentityAvatar, Ui44PageHeader } from '@/components/ui44/System';
import { Ui44OverflowTrackTitle } from '@/components/ui44/OverflowTrackTitle';
import type {
  UiComponentInventoryItem,
  UiCssClassInventoryItem,
  UiCssTokenInventoryItem,
  UiSystemInventory,
} from '@/lib/uiSystemInventory';

const sectionLinks = [
  ['foundations', 'Foundations'],
  ['materials', 'Materials'],
  ['typography', 'Typography'],
  ['geometry', 'Geometry'],
  ['inputs', 'Inputs'],
  ['controls', 'Controls'],
  ['shell', 'Shell'],
  ['content', 'Content'],
  ['states', 'States'],
  ['specialized', 'Specialized'],
  ['components', 'Components'],
  ['css', 'CSS index'],
] as const;

const colorTokens = [
  ['--os-color-ink', 'Primary ink'],
  ['--os-color-ink-secondary', 'Secondary ink'],
  ['--os-color-accent', 'Accent'],
  ['--os-color-success', 'Success'],
  ['--os-color-warning', 'Warning'],
  ['--os-color-danger', 'Danger'],
  ['--os-color-hairline', 'Hairline'],
] as const;

const geometryTokens = [
  ['--44ui-page-inset', 'Page inset'],
  ['--44ui-section-gap', 'Section gap'],
  ['--44ui-panel-inset', 'Panel inset'],
  ['--44ui-row-x', 'Row inset X'],
  ['--44ui-row-y', 'Row inset Y'],
  ['--44ui-target', 'Minimum target'],
  ['--44ui-radius-glass', 'Glass radius'],
  ['--44ui-radius-paper', 'Paper radius'],
  ['--44ui-radius-input', 'Input radius'],
] as const;

function ReferenceSection({ id, title, children }: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return <section className="ui-system-section" id={id}>
    <header className="ui-system-section-header">
      <Ui44Text as="h2" variant="section-title">{title}</Ui44Text>
    </header>
    <div className="ui-system-section-content">{children}</div>
  </section>;
}

function SourceLabel({ children }: { children: ReactNode }) {
  return <code className="ui-system-source-label">{children}</code>;
}

function Specimen({ title, source, children, className = '' }: {
  title: string;
  description: string;
  source: string;
  children: ReactNode;
  className?: string;
}) {
  return <article className={`ui-system-specimen ${className}`.trim()}>
    <header className="ui-system-specimen-header">
      <div>
        <Ui44Text as="h3" variant="subsection-title">{title}</Ui44Text>
      </div>
      <SourceLabel>{source}</SourceLabel>
    </header>
    <div className="ui-system-specimen-stage">{children}</div>
  </article>;
}

function ResolvedValue({ name, resolved }: { name: string; resolved: Record<string, string> }) {
  return <code className="ui-system-resolved-value">{resolved[name] || 'Resolved by active appearance'}</code>;
}

function ColorSystem({ resolved }: { resolved: Record<string, string> }) {
  return <div className="ui-system-color-grid">
    {colorTokens.map(([name, label]) => <div className="ui-system-color-item" key={name}>
      <span className="ui-system-color-swatch" style={{ '--ui-system-swatch': `var(${name})` } as CSSProperties} aria-hidden="true" />
      <span>
        <Ui44Text variant="headline">{label}</Ui44Text>
        <code>{name}</code>
        <ResolvedValue name={name} resolved={resolved} />
      </span>
    </div>)}
  </div>;
}

function MaterialsSystem({ resolved }: { resolved: Record<string, string> }) {
  const materials = [
    {
      title: 'Glass',
      variant: 'glass' as const,
      token: '--44ui-material-glass',
      usage: 'Default content, form, Community, Studio, settings, and dialog surface.',
      geometry: '24px desktop · 16px mobile',
    },
    {
      title: 'Paper',
      variant: 'paper' as const,
      token: '--44ui-material-paper',
      usage: 'Menus, dropdowns, and selection lists.',
      geometry: '24px desktop · 16px mobile · floating elevation',
    },
  ];

  return <div className="ui-system-material-grid">
    {materials.map(material => <Ui44Panel variant={material.variant} className="ui-system-material-card" key={material.title}>
      <Ui44PanelContent>
        <Ui44Text as="h3" variant="subsection-title">{material.title}</Ui44Text>
        <Ui44Text variant="body" tone="secondary">{material.usage}</Ui44Text>
        <code>{material.token}</code>
        <ResolvedValue name={material.token} resolved={resolved} />
        <Ui44Text variant="caption" tone="secondary">{material.geometry}</Ui44Text>
      </Ui44PanelContent>
    </Ui44Panel>)}
  </div>;
}

function TypographySystem() {
  const tones: Array<{ tone: Ui44TextTone; label: string }> = [
    { tone: 'primary', label: 'Primary' },
    { tone: 'secondary', label: 'Secondary' },
    { tone: 'placeholder', label: 'Placeholder' },
    { tone: 'disabled', label: 'Disabled' },
    { tone: 'success', label: 'Success' },
    { tone: 'warning', label: 'Warning' },
    { tone: 'danger', label: 'Danger' },
    { tone: 'accent', label: 'Accent' },
  ];

  return <div className="ui-system-typography-layout">
    <Ui44Panel variant="glass" className="ui-system-type-list">
      {ui44TypeSpecimens.map(specimen => <div className="ui-system-type-row" key={specimen.variant}>
        <div className="ui-system-type-meta">
          <Ui44Text variant="field-label">{specimen.label}</Ui44Text>
          <code>Ui44Text · {specimen.variant}</code>
          <span>{specimen.desktop} desktop</span>
          <span>{specimen.mobile} mobile</span>
        </div>
        <Ui44Text variant={specimen.variant}>{specimen.sample}</Ui44Text>
      </div>)}
    </Ui44Panel>
    <div className="ui-system-tone-grid">
      {tones.map(item => <Ui44Panel variant="glass" className="ui-system-tone-card" key={item.tone}>
        <Ui44Text variant="headline" tone={item.tone}>{item.label}</Ui44Text>
        <code>ui44-tone-{item.tone}</code>
      </Ui44Panel>)}
    </div>
  </div>;
}

function GeometrySystem({ resolved }: { resolved: Record<string, string> }) {
  return <div className="ui-system-geometry-grid">
    {geometryTokens.map(([name, label]) => <Ui44Panel variant="glass" className="ui-system-token-card" key={name}>
      <Ui44Text variant="headline">{label}</Ui44Text>
      <code>{name}</code>
      <ResolvedValue name={name} resolved={resolved} />
      <span className="ui-system-token-ruler" style={{ '--ui-system-ruler': `var(${name})` } as CSSProperties} aria-hidden="true" />
    </Ui44Panel>)}
  </div>;
}

function ElevationSystem() {
  return <div className="ui44-elevation-audit-grid">
    <div className="ui44-elevation-sample ui44-elevation-sample-flat">
      <Ui44Text variant="headline">Flat</Ui44Text>
      <code>--44ui-elevation-flat</code>
    </div>
    <div className="ui44-elevation-sample ui44-elevation-sample-raised">
      <Ui44Text variant="headline">Raised</Ui44Text>
      <code>--44ui-elevation-raised</code>
    </div>
  </div>;
}

function InputsSystem() {
  return <Ui44Panel variant="glass"><Ui44PanelContent>
    <Ui44FormGrid>
      <Ui44FormField label="Text input" span="medium" help="Ui44TextInput · .ui44-input">
        <Ui44TextInput placeholder="Enter release title" />
      </Ui44FormField>
      <Ui44FormField label="Select input" span="medium" help="Ui44SelectInput · .ui44-input-select">
        <Ui44SelectInput defaultValue="album"><option value="album">Album</option><option value="ep">EP</option><option value="single">Single</option></Ui44SelectInput>
      </Ui44FormField>
      <Ui44FormField label="Textarea" span="full" help="Ui44Textarea · one owned field surface">
        <Ui44Textarea rows={4} placeholder="Write an update" />
      </Ui44FormField>
      <div className="ui-system-native-inputs ui44-form-field ui44-form-field-full">
        <label><Ui44CheckboxInput defaultChecked /> <span>Checkbox input</span></label>
        <label><span>Range input</span><Ui44RangeInput min="0" max="100" defaultValue="62" /></label>
        <label><span>File input</span><Ui44FileInput aria-label="File input specimen" /></label>
      </div>
    </Ui44FormGrid>
  </Ui44PanelContent></Ui44Panel>;
}

function ControlsSystem() {
  return <div className="ui-system-control-layout">
    <Ui44Panel variant="glass"><Ui44PanelContent>
      <Ui44Text as="h3" variant="subsection-title">Buttons</Ui44Text>
      <div className="ui44-button-audit-grid">
        <div className="ui44-button-audit-item"><span>Default</span><Ui44Button>Continue</Ui44Button></div>
        <div className="ui44-button-audit-item"><span>Destructive</span><Ui44Button variant="destructive">Remove</Ui44Button></div>
        <div className="ui44-button-audit-item"><span>Unavailable</span><Ui44Button variant="unavailable">Unavailable</Ui44Button></div>
      </div>
    </Ui44PanelContent></Ui44Panel>
    <Ui44Panel variant="glass"><Ui44PanelContent>
      <Ui44Text as="h3" variant="subsection-title">Symbols</Ui44Text>
      <div className="ui44-symbol-audit-grid">
        <Ui44ControlExample label="Add"><Ui44MenuSymbol kind="add" label="Add new" align="left" /></Ui44ControlExample>
        <Ui44ControlExample label="Filter"><Ui44MenuSymbol kind="filter" label="Filter" align="left" /></Ui44ControlExample>
        <Ui44ControlExample label="More"><Ui44MenuSymbol kind="more" label="More" /></Ui44ControlExample>
        <Ui44ControlExample label="Search"><Ui44SearchSymbol /></Ui44ControlExample>
        <Ui44ControlExample label="Back"><Ui44BackSymbol /></Ui44ControlExample>
        <Ui44ControlExample label="Cart"><Ui44CartSymbol /></Ui44ControlExample>
        <Ui44ControlExample label="Section"><Ui44SectionArrow label="View section" /></Ui44ControlExample>
      </div>
    </Ui44PanelContent></Ui44Panel>
    <Ui44Panel variant="glass"><Ui44PanelContent>
      <Ui44Text as="h3" variant="subsection-title">Segments, tabs, and menu</Ui44Text>
      <div className="ui-system-selection-grid">
        <div className="ui44-segmented" role="radiogroup" aria-label="Appearance specimen">
          <button className="ui44-segmented-item" type="button" role="radio" aria-checked="false">System</button>
          <button className="ui44-segmented-item" type="button" role="radio" aria-checked="false">Light</button>
          <button className="ui44-segmented-item ui44-segmented-item-active" type="button" role="radio" aria-checked="true">Dark</button>
        </div>
        <div className="ui44-segmented-tabs" role="tablist" aria-label="Profile content specimen">
          <button type="button" role="tab" aria-selected="true">Posts</button>
          <button type="button" role="tab" aria-selected="false">Music</button>
          <button type="button" role="tab" aria-selected="false">Events</button>
        </div>
        <div className="ui44-paper-menu ui-system-static-menu" role="menu" aria-label="Menu specimen">
          <button type="button" className="ui44-paper-menu-item" role="menuitem">Open</button>
          <button type="button" className="ui44-paper-menu-item ui44-paper-menu-item-selected" role="menuitem">Selected</button>
          <button type="button" className="ui44-paper-menu-item ui44-paper-menu-item-danger" role="menuitem">Remove</button>
        </div>
      </div>
    </Ui44PanelContent></Ui44Panel>
  </div>;
}

function ShellSystem() {
  const dockItems = [
    ['os-icon-store', 'Home'],
    ['os-icon-library', 'Library'],
    ['os-icon-radio-classic', 'Radio'],
    ['os-icon-community', 'Community'],
    ['os-icon-settings', 'Settings'],
  ];
  return <div className="ui-system-shell-grid">
    <Specimen title="App shell, Dock, and Topbar" description="The environment and one shell-glass window own global navigation. This reduced specimen uses the same icon masks and control material without mounting a second live shell." source="SystemShell · Sidebar · Topbar">
      <div className="ui-system-shell-miniature">
        <aside className="ui-system-dock-miniature" aria-label="Dock specimen">
          <span className="ui-system-logo">44</span>
          {dockItems.map(([icon, label]) => <span className="ui-system-dock-item" title={label} key={label}><span className={`os-icon ${icon}`} aria-hidden="true" /></span>)}
        </aside>
        <div className="ui-system-workspace-miniature">
          <div className="ui-system-topbar-miniature">
            <span>44OS</span>
            <span className="ui-system-topbar-actions"><Ui44SearchSymbol /><Ui44MenuSymbol kind="notifications" label="Notifications" /></span>
          </div>
          <Ui44Panel variant="glass" className="ui-system-window-panel"><Ui44PanelContent>
            <Ui44PageHeader title="Library" description="The shell stays fixed while application content changes." />
          </Ui44PanelContent></Ui44Panel>
        </div>
      </div>
    </Specimen>
    <Specimen title="Settings panel" description="Settings uses Glass sections, canonical rows, segmented choices, swatches, and input fields." source="Settings page · Ui44Panel · ui44-segmented">
      <Ui44Panel variant="glass">
        <Ui44PanelContent><Ui44Text as="h3" variant="subsection-title">Appearance</Ui44Text></Ui44PanelContent>
        <Ui44DetailRow label="Theme" value="Dark" />
        <Ui44DetailRow label="Accent" value="Ocean" />
        <Ui44DetailRow label="Landing app" value="Home" />
      </Ui44Panel>
    </Specimen>
    <Specimen title="Identity" description="Inline identity is 34px. Hero identity remains responsive and specialized." source="Ui44IdentityAvatar · profile identity">
      <div className="ui-system-identity-row">
        <span><Ui44IdentityAvatar name="44 Member" /><Ui44Text variant="body">Inline member</Ui44Text></span>
        <span><Ui44IdentityAvatar name="44 Creator" size="hero" /><Ui44Text variant="body">Hero creator</Ui44Text></span>
      </div>
    </Specimen>
  </div>;
}

function ContentSystem() {
  return <div className="ui-system-content-layout">
    <Specimen title="Catalog card" description="Artwork carries radius and elevation; the card wrapper remains transparent." source="ProductCard · .ui44-catalog-*">
      <div className="ui44-catalog-grid ui-system-catalog-grid">
        <a className="product-tile ui44-catalog-card" href="#content" onClick={event => event.preventDefault()}>
          <span className="product-tile-art product-tile-art-square ui44-catalog-art ui-system-catalog-art" />
          <span className="product-tile-info ui44-catalog-copy"><span className="product-tile-title ui44-catalog-title">Here comes the feeling</span><span className="product-tile-subtitle ui44-catalog-subheadline">OLSTEN</span></span>
        </a>
        <a className="product-tile ui44-catalog-card" href="#content" onClick={event => event.preventDefault()}>
          <span className="product-tile-art product-tile-art-book ui44-catalog-art ui-system-catalog-art ui-system-catalog-art-book" />
          <span className="product-tile-info ui44-catalog-copy"><span className="product-tile-title ui44-catalog-title">Collected Works</span><span className="product-tile-subtitle ui44-catalog-subheadline">44 Editions</span></span>
        </a>
      </div>
    </Specimen>
    <Specimen title="Track and detail rows" description="Tracklists and Product Details use the shared Glass-with-Rows surface." source="Ui44TrackRow · Ui44DetailRow">
      <div className="ui-system-paired-panels">
        <Ui44Panel variant="glass">
          <Ui44TrackRow number={1} title="A concise title" duration="2:16" />
          <Ui44TrackRow number={2} title={<Ui44OverflowTrackTitle title="A deliberately long track title featuring several collaborators" />} duration="4:08" />
        </Ui44Panel>
        <Ui44Panel variant="glass">
          <Ui44DetailRow label="Format" value="Album" />
          <Ui44DetailRow label="Release date" value="January 1, 2026" />
          <Ui44DetailRow label="Tracks" value="10" />
        </Ui44Panel>
      </div>
    </Specimen>
    <Specimen title="Community and review rows" description="Identity, metadata, content, actions, and dividers share the canonical row rhythm." source="Ui44CommunityPostRow · Ui44ReviewRow">
      <Ui44Panel variant="glass">
        <Ui44CommunityPostRow author="@olsten44" time="1d" initials="Ø" likeCount={12} replyCount={3} canDelete body="Thank you everyone for helping test the new system." />
        <Ui44ReviewRow author="Night Listener" initials="NL" body="The system feels cohesive across every surface." />
      </Ui44Panel>
    </Specimen>
    <Specimen title="Studio and achievement rows" description="Operational rows preserve artwork, status, issues, glyphs, and completion state." source="Ui44StudioReleaseRow · Ui44AchievementRow">
      <Ui44Panel variant="glass">
        <Ui44StudioReleaseRow title="Everything Before" itemType="Album" status="Under Review" statusTone="review" issueLabel="1 issue" />
        <Ui44AchievementRow title="Front to Back" secondary="Listen to every track on this release." icon="♫" />
        <Ui44AchievementRow title="Nightbird" secondary="Listen between 10 PM and 4 AM." icon="★" unlocked={false} />
      </Ui44Panel>
    </Specimen>
  </div>;
}

function StatesSystem() {
  return <div className="ui-system-state-grid">
    <Ui44Panel variant="glass" className="ui-system-state-card"><div className="ui44-state ui44-state-empty">Nothing here yet.</div><SourceLabel>.ui44-state-empty</SourceLabel></Ui44Panel>
    <Ui44Panel variant="glass" className="ui-system-state-card"><div className="ui44-state ui44-state-loading" role="status">Loading…</div><SourceLabel>.ui44-state-loading</SourceLabel></Ui44Panel>
    <Ui44Panel variant="glass" className="ui-system-state-card"><div className="ui44-status ui44-status-success" role="status">Changes saved.</div><SourceLabel>.ui44-status-success</SourceLabel></Ui44Panel>
    <Ui44Panel variant="glass" className="ui-system-state-card"><div className="ui44-status ui44-status-warning" role="status">Review required.</div><SourceLabel>.ui44-status-warning</SourceLabel></Ui44Panel>
    <Ui44Panel variant="glass" className="ui-system-state-card"><div className="ui44-status ui44-status-error" role="alert">Something went wrong.</div><SourceLabel>.ui44-status-error</SourceLabel></Ui44Panel>
    <div className="ui-system-dialog-stage">
      <div className="ui44-dialog-scrim" aria-hidden="true" />
      <Ui44Panel variant="glass" className="ui44-dialog-surface ui-system-dialog-surface">
        <Ui44PanelContent><Ui44Text as="h3" variant="subsection-title">Remove this Item?</Ui44Text><Ui44Text variant="body" tone="secondary">Store visibility ends while Library history remains.</Ui44Text></Ui44PanelContent>
        <div className="ui44-dialog-actions"><Ui44Button>Cancel</Ui44Button><Ui44Button variant="destructive">Remove</Ui44Button></div>
      </Ui44Panel>
    </div>
  </div>;
}

function SpecializedSystem() {
  return <div className="ui-system-specialized-grid">
    <Specimen title="Mini player and Now Playing" description="The mini player is theme-aware Glass. Expanded Now Playing is the sole non-dropdown Paper exception." source="MusicPlayer · FAM-31">
      <div className="ui-system-player-stage">
        <div className="ui-system-mini-player"><span className="ui-system-player-art" /><span><Ui44Text variant="headline">Now playing</Ui44Text><Ui44Text variant="subheadline" tone="secondary">44 Creator</Ui44Text></span><button type="button" aria-label="Play">▶</button><button type="button" aria-label="Close">×</button></div>
        <div className="ui44-player-sheet-audit"><span className="ui44-player-sheet-audit-art" /><Ui44Text variant="subsection-title">Here comes the feeling</Ui44Text><Ui44Text variant="subheadline" tone="secondary">OLSTEN</Ui44Text></div>
      </div>
    </Specimen>
    <Specimen title="Radio" description="Radio is a card-free centered workspace and remains independent from the ordinary panel system." source="Radio page · FAM-32">
      <div className="ui-system-radio-stage"><span className="ui-system-radio-art" /><Ui44Text variant="meta" tone="secondary">NOW PLAYING</Ui44Text><Ui44Text variant="subsection-title">Midnight Transmission</Ui44Text><Ui44Text variant="body" tone="secondary">44 Radio</Ui44Text><Ui44Button>Play Radio</Ui44Button></div>
    </Specimen>
    <Specimen title="Reader and interactive launch" description="Reader and launch replace ordinary workspace chrome only where their contracts require it. Mobile launch shows Desktop Required." source="BookReader · /launch/[itemId] · FAM-33/34">
      <div className="ui-system-runtime-grid"><div className="ui-system-reader-stage"><span className="ui-system-runtime-toolbar">Close <span>12 of 64</span> − +</span><span className="ui-system-reader-page" /></div><div className="ui-system-launch-stage"><Ui44Text variant="subsection-title">Desktop Required</Ui44Text><Ui44Text variant="body" tone="secondary">This interactive Item requires a keyboard and mouse.</Ui44Text></div></div>
    </Specimen>
  </div>;
}

function InventoryMeta({ count, consumers }: { count: number; consumers: string[] }) {
  return <span className="ui-system-inventory-meta">{count} source use{count === 1 ? '' : 's'}{consumers.length ? ` · ${consumers.slice(0, 3).join(' · ')}` : ' · canonical/reference API'}</span>;
}

function ComponentRegistry({ components, query }: { components: UiComponentInventoryItem[]; query: string }) {
  const filtered = components.filter(item => `${item.name} ${item.file} ${item.category}`.toLowerCase().includes(query));
  const groups = [...new Set(filtered.map(item => item.category))];
  return <div className="ui-system-registry-groups">
    {groups.map(group => <details className="ui-system-registry-group" open key={group}>
      <summary>{group}<span>{filtered.filter(item => item.category === group).length}</span></summary>
      <div className="ui-system-registry-list">
        {filtered.filter(item => item.category === group).map(item => <div className="ui-system-registry-row" key={`${item.file}-${item.name}`}>
          <code>{item.name}</code><span>{item.file}</span><InventoryMeta count={item.usageCount} consumers={item.consumers} />
        </div>)}
      </div>
    </details>)}
  </div>;
}

function TokenRegistry({ tokens, query, resolved }: { tokens: UiCssTokenInventoryItem[]; query: string; resolved: Record<string, string> }) {
  const filtered = tokens.filter(item => `${item.name} ${item.category} ${item.definitions.map(definition => definition.value).join(' ')}`.toLowerCase().includes(query));
  const groups = [...new Set(filtered.map(item => item.category))];
  return <div className="ui-system-registry-groups">
    {groups.map(group => <details className="ui-system-registry-group" key={group}>
      <summary>{group}<span>{filtered.filter(item => item.category === group).length}</span></summary>
      <div className="ui-system-registry-list">
        {filtered.filter(item => item.category === group).map(item => <div className="ui-system-registry-row ui-system-token-registry-row" key={item.name}>
          <code>{item.name}</code><ResolvedValue name={item.name} resolved={resolved} /><span>{item.definitions.map(definition => `${definition.value} · ${definition.source}`).join(' | ')}</span><InventoryMeta count={item.usageCount} consumers={item.consumers} />
        </div>)}
      </div>
    </details>)}
  </div>;
}

function ClassRegistry({ classes, query }: { classes: UiCssClassInventoryItem[]; query: string }) {
  const filtered = classes.filter(item => `${item.name} ${item.definitions.join(' ')}`.toLowerCase().includes(query));
  const buckets = [...new Set(filtered.map(item => item.name.slice(1, 2).toUpperCase()))];
  return <div className="ui-system-registry-groups">
    {buckets.map(bucket => <details className="ui-system-registry-group" key={bucket}>
      <summary>{bucket}<span>{filtered.filter(item => item.name.slice(1, 2).toUpperCase() === bucket).length}</span></summary>
      <div className="ui-system-registry-list">
        {filtered.filter(item => item.name.slice(1, 2).toUpperCase() === bucket).map(item => <div className="ui-system-registry-row" key={item.name}>
          <code>{item.name}</code><span>{item.definitions.join(' · ')}</span><InventoryMeta count={item.usageCount} consumers={item.consumers} />
        </div>)}
      </div>
    </details>)}
  </div>;
}

export function UiSystemReferencePage({ inventory }: { inventory: UiSystemInventory }) {
  const [query, setQuery] = useState('');
  const [registry, setRegistry] = useState<'components' | 'tokens' | 'classes'>('components');
  const [resolved, setResolved] = useState<Record<string, string>>({});

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const styles = getComputedStyle(document.body);
      setResolved(Object.fromEntries(inventory.tokens.map(token => [token.name, styles.getPropertyValue(token.name).trim()])));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [inventory.tokens]);

  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

  return <PageShell><main className="ui-system-page">
    <header className="ui-system-hero">
      <span className="ui-system-kicker">44 design system</span>
      <Ui44Text as="h1" variant="page-title">44OS UI</Ui44Text>
      <div className="ui-system-stat-grid">
        <span><strong>{inventory.stats.stylesheets}</strong> production stylesheets</span>
        <span><strong>{inventory.stats.tokens}</strong> CSS tokens</span>
        <span><strong>{inventory.stats.classes}</strong> CSS classes</span>
        <span><strong>{inventory.stats.componentExports}</strong> component exports</span>
      </div>
    </header>

    <nav className="ui-system-nav" aria-label="44OS UI sections">
      {sectionLinks.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}
    </nav>

    <ReferenceSection id="foundations" title="Foundations" description="The environment, active appearance, colors, borders, and two-state elevation model establish the system before components are composed.">
      <Specimen title="Active appearance and color" description="These swatches resolve directly from the current body appearance and accent. Signed-out 44OS uses Dark + Ocean; account-driven appearance can use the same semantic tokens." source="globals.css · --os-color-*">
        <ColorSystem resolved={resolved} />
      </Specimen>
      <Specimen title="Elevation" description="Glass is flat with no shadow. Paper menus, transient selection surfaces, and catalog/media cards use one shared Raised shadow; the App Shell retains its independent window shadow." source="--44ui-elevation-flat · --44ui-elevation-raised"><ElevationSystem /></Specimen>
    </ReferenceSection>

    <ReferenceSection id="materials" title="Materials and panels" description="Glass covers ordinary content panels and Paper covers floating selection surfaces. Shell glass remains its own environmental composition.">
      <MaterialsSystem resolved={resolved} />
    </ReferenceSection>

    <ReferenceSection id="typography" title="Typography" description="One semantic role describes meaning; desktop and mobile apply their responsive measurements through the same Ui44Text API.">
      <TypographySystem />
    </ReferenceSection>

    <ReferenceSection id="geometry" title="Spacing, sizing, radii, and borders" description="The shared geometry tokens keep page gutters, panels, rows, fields, and touch targets aligned across desktop and mobile.">
      <GeometrySystem resolved={resolved} />
      <Specimen title="Page header and responsive form grid" description="Headers align actions with the title. Field spans use a 12-column desktop grid and collapse to one column on mobile." source="Ui44PageHeader · Ui44FormGrid · Ui44FormField">
        <Ui44Panel variant="glass"><Ui44PanelContent>
          <Ui44PageHeader title="Studio" description="Manage Items, updates, events, and creator settings." action={<Ui44Button>Add new</Ui44Button>} />
          <Ui44FormGrid>
            <Ui44FormField label="Release year" span="short"><Ui44TextInput placeholder="Enter release year" /></Ui44FormField>
            <Ui44FormField label="Release type" span="medium"><Ui44SelectInput defaultValue="album"><option value="album">Album</option><option value="ep">EP</option></Ui44SelectInput></Ui44FormField>
            <Ui44FormField label="Release title" span="wide"><Ui44TextInput placeholder="Enter release title" /></Ui44FormField>
          </Ui44FormGrid>
        </Ui44PanelContent></Ui44Panel>
      </Specimen>
      <Specimen title="Section composition" description="Section titles, optional guidance, trailing actions, and content share one predictable relationship." source="Ui44Section · Ui44SectionArrow">
        <Ui44Section title="New in Music" description="A guided section keeps one sentence of context close to its title." trailingAction={<Ui44SectionArrow label="View all music" />}>
          <Ui44Panel variant="glass"><Ui44PanelContent><Ui44Text variant="body" tone="secondary">Section content begins after the shared header-to-content gap.</Ui44Text></Ui44PanelContent></Ui44Panel>
        </Ui44Section>
      </Specimen>
    </ReferenceSection>

    <ReferenceSection id="inputs" title="Inputs" description="All text, select, textarea, checkbox, range, and file controls render through the canonical input primitives."><InputsSystem /></ReferenceSection>
    <ReferenceSection id="controls" title="Buttons, symbols, menus, and selections" description="Controls share 44px targets, visible focus, capability-gated hover, and semantic default, destructive, unavailable, open, and selected states."><ControlsSystem /></ReferenceSection>
    <ReferenceSection id="shell" title="Shell, navigation, settings, and identity" description="The persistent app shell owns global navigation; application panels and identity patterns compose inside its workspace."><ShellSystem /></ReferenceSection>
    <ReferenceSection id="content" title="Catalog, lists, rows, and content patterns" description="These are the reusable compositions behind Store, Library, Community, Studio, profiles, reviews, details, achievements, and tracklists."><ContentSystem /></ReferenceSection>
    <ReferenceSection id="states" title="Loading, empty, status, and dialog states" description="Semantic states remain quiet by default. Dialogs use the canonical scrim, Glass surface, actions, focus, and dismissal contract."><StatesSystem /></ReferenceSection>
    <ReferenceSection id="specialized" title="Player, Radio, reader, and launch" description="These documented specialized families retain their purpose-built compositions while consuming the shared type, control, focus, and token system."><SpecializedSystem /></ReferenceSection>

    <ReferenceSection id="components" title="Component and CSS registry" description="This generated registry is the A–Z source index. It is read from the current component directory and the two production stylesheets at build/request time, so future additions appear here without rewriting the reference page.">
      <div className="ui-system-registry-toolbar">
        <Ui44TextInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Search components, tokens, classes, files, or values" aria-label="Search UI registry" />
        <div className="ui44-segmented" role="radiogroup" aria-label="Registry type">
          {(['components', 'tokens', 'classes'] as const).map(value => <button type="button" role="radio" aria-checked={registry === value} className={`ui44-segmented-item${registry === value ? ' ui44-segmented-item-active' : ''}`} onClick={() => setRegistry(value)} key={value}>{value[0].toUpperCase() + value.slice(1)}</button>)}
        </div>
      </div>
      <div className="ui-system-registry-summary">
        {inventory.stylesheets.map(stylesheet => <SourceLabel key={stylesheet}>{stylesheet}</SourceLabel>)}
      </div>
      {registry === 'components' ? <ComponentRegistry components={inventory.components} query={normalizedQuery} /> : null}
      {registry === 'tokens' ? <TokenRegistry tokens={inventory.tokens} query={normalizedQuery} resolved={resolved} /> : null}
      {registry === 'classes' ? <ClassRegistry classes={inventory.classes} query={normalizedQuery} /> : null}
    </ReferenceSection>
    <div id="css" className="ui-system-end-note"><Ui44Text variant="callout" tone="secondary">Production source remains authoritative. This page is an inspection surface: edit the owning token, semantic class, or component—not this specimen—when changing 44OS.</Ui44Text></div>
  </main></PageShell>;
}
