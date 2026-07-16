import fs from 'node:fs';
import path from 'node:path';

export type UiCssDefinition = {
  source: string;
  value: string;
};

export type UiCssTokenInventoryItem = {
  name: string;
  category: string;
  definitions: UiCssDefinition[];
  usageCount: number;
  consumers: string[];
};

export type UiCssClassInventoryItem = {
  name: string;
  definitions: string[];
  usageCount: number;
  consumers: string[];
};

export type UiComponentInventoryItem = {
  name: string;
  file: string;
  category: string;
  usageCount: number;
  consumers: string[];
};

export type UiSystemInventory = {
  stylesheets: string[];
  tokens: UiCssTokenInventoryItem[];
  classes: UiCssClassInventoryItem[];
  components: UiComponentInventoryItem[];
  stats: {
    stylesheets: number;
    tokens: number;
    classes: number;
    componentFiles: number;
    componentExports: number;
  };
};

const productionStylesheets = [
  'src/app/globals.css',
  'src/styles/44-ui/canonical-system.css',
];

function walk(directory: string, predicate: (file: string) => boolean): string[] {
  const output: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(absolute, predicate));
    else if (predicate(absolute)) output.push(absolute);
  }
  return output;
}

function displaySource(file: string, sourceRoot: string) {
  const relative = path.relative(sourceRoot, file).replaceAll('\\', '/');
  if (relative.startsWith('app/')) {
    const route = relative
      .replace(/^app/, '')
      .replace(/\/(?:page|layout|error|loading|not-found)\.tsx?$/, '') || '/';
    return `page ${route}`;
  }
  return relative;
}

function lineAt(text: string, index: number) {
  return text.slice(0, index).split('\n').length;
}

function occurrenceCount(text: string, value: string) {
  if (!value) return 0;
  return text.split(value).length - 1;
}

function tokenCategory(name: string) {
  if (/(material|paper|glass|surface|background|scrim)/.test(name)) return 'Materials';
  if (/(color|accent|ink|danger|warning|success)/.test(name)) return 'Color';
  if (/(type|font|line-height|letter)/.test(name)) return 'Typography';
  if (/(shadow|elevation)/.test(name)) return 'Elevation';
  if (/(radius|corner)/.test(name)) return 'Radii';
  if (/(space|gap|inset|padding|margin|row-x|row-y)/.test(name)) return 'Spacing';
  if (/(target|height|width|size)/.test(name)) return 'Sizing';
  if (/(duration|ease|motion|transition)/.test(name)) return 'Motion';
  if (/(border|hairline|outline|ring)/.test(name)) return 'Borders';
  return 'Other';
}

function componentCategory(file: string) {
  if (file.includes('/ui44/Typography')) return 'Typography';
  if (file.includes('/ui44/Inputs')) return 'Inputs';
  if (file.includes('/ui44/Controls')) return 'Controls and symbols';
  if (file.includes('/ui44/Spacing')) return 'Panels and rows';
  if (file.includes('/ui44/System')) return 'System foundations';
  if (file.includes('/ui44/')) return 'Canonical primitives';
  if (/(Sidebar|Topbar|SystemShell|ThemeSync|MobileMenu|ContextMenu|MusicPlayer)/.test(file)) return 'Shell and navigation';
  if (/(BookReader|SamplePackExperience|Achievement|Radio)/.test(file)) return 'Media and specialized';
  if (/(Profile|Social|Inbox|Community|Reviews|Updates)/.test(file)) return 'Community and identity';
  if (/(Store|Library|Product|Studio|ExternalLink|Upload|Tag)/.test(file)) return 'Catalog and Studio';
  if (/(Dialog|Gate|Tip|Legal)/.test(file)) return 'Dialogs and states';
  return 'Shared application';
}

function componentExports(text: string) {
  const names = new Set<string>();
  const patterns = [
    /export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Z][A-Za-z0-9_]*)/g,
    /export\s+(?:default\s+)?class\s+([A-Z][A-Za-z0-9_]*)/g,
    /export\s+const\s+([A-Z][A-Za-z0-9_]*)\s*=/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) names.add(match[1]);
  }
  return [...names].sort((left, right) => left.localeCompare(right));
}

export function loadUiSystemInventory(): UiSystemInventory {
  const sourceRoot = path.join(/* turbopackIgnore: true */ process.cwd(), 'src');
  const projectRoot = path.dirname(sourceRoot);
  const sourceFiles = walk(sourceRoot, file => /\.(?:ts|tsx)$/.test(file));
  const sourceEntries = sourceFiles.map(file => ({ file, text: fs.readFileSync(file, 'utf8') }));
  const productionEntries = sourceEntries.filter(entry => {
    const relative = path.relative(sourceRoot, entry.file).replaceAll('\\', '/');
    return !relative.startsWith('app/44OS_UI/') && !relative.endsWith('components/UiSystemReferencePage.tsx');
  });

  const tokenDefinitions = new Map<string, UiCssDefinition[]>();
  const classDefinitions = new Map<string, Set<string>>();

  for (const relative of productionStylesheets) {
    const absolute = path.join(/* turbopackIgnore: true */ projectRoot, relative);
    const css = fs.readFileSync(absolute, 'utf8');
    const display = relative.replace(/^src\//, '');

    for (const match of css.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g)) {
      const name = match[1];
      const definition = { source: `${display}:${lineAt(css, match.index ?? 0)}`, value: match[2].trim().replace(/\s+/g, ' ') };
      const existing = tokenDefinitions.get(name) ?? [];
      if (!existing.some(item => item.source === definition.source && item.value === definition.value)) existing.push(definition);
      tokenDefinitions.set(name, existing);
    }

    for (const match of css.matchAll(/\.(-?[_A-Za-z][_A-Za-z0-9-]*)/g)) {
      const name = match[1];
      const existing = classDefinitions.get(name) ?? new Set<string>();
      existing.add(`${display}:${lineAt(css, match.index ?? 0)}`);
      classDefinitions.set(name, existing);
    }
  }

  const tokens = [...tokenDefinitions.entries()]
    .map(([name, definitions]) => {
      const consumers = productionEntries
        .filter(entry => entry.text.includes(name))
        .map(entry => displaySource(entry.file, sourceRoot));
      return {
        name,
        category: tokenCategory(name),
        definitions,
        usageCount: productionEntries.reduce((total, entry) => total + occurrenceCount(entry.text, name), 0),
        consumers,
      } satisfies UiCssTokenInventoryItem;
    })
    .sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name));

  const classes = [...classDefinitions.entries()]
    .map(([name, definitions]) => {
      const consumers = productionEntries
        .filter(entry => entry.text.includes(name))
        .map(entry => displaySource(entry.file, sourceRoot));
      return {
        name: `.${name}`,
        definitions: [...definitions],
        usageCount: productionEntries.reduce((total, entry) => total + occurrenceCount(entry.text, name), 0),
        consumers,
      } satisfies UiCssClassInventoryItem;
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const componentFiles = sourceFiles.filter(file => file.includes(`${path.sep}components${path.sep}`));
  const components = componentFiles
    .filter(file => !file.endsWith(`${path.sep}UiSystemReferencePage.tsx`))
    .flatMap(file => {
      const text = fs.readFileSync(file, 'utf8');
      const display = path.relative(sourceRoot, file).replaceAll('\\', '/');
      return componentExports(text).map(name => {
        const consumers = productionEntries
          .filter(entry => entry.file !== file && new RegExp(`\\b${name}\\b`).test(entry.text))
          .map(entry => displaySource(entry.file, sourceRoot));
        return {
          name,
          file: display,
          category: componentCategory(display),
          usageCount: productionEntries
            .filter(entry => entry.file !== file)
            .reduce((total, entry) => total + (entry.text.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length, 0),
          consumers,
        } satisfies UiComponentInventoryItem;
      });
    })
    .sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name));

  return {
    stylesheets: productionStylesheets,
    tokens,
    classes,
    components,
    stats: {
      stylesheets: productionStylesheets.length,
      tokens: tokens.length,
      classes: classes.length,
      componentFiles: componentFiles.length - 1,
      componentExports: components.length,
    },
  };
}
