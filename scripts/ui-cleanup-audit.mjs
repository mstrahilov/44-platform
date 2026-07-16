import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import postcss from 'postcss';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const writeUnusedCss = process.argv.includes('--write-unused-css');
const writeShadowedCss = process.argv.includes('--write-shadowed-css');
const styleFiles = [
  'src/app/globals.css',
  'src/styles/44-ui/canonical-system.css',
  'src/styles/44-ui/system-reference.css',
];

function walk(directory, predicate) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(absolute, predicate));
    else if (predicate(absolute)) output.push(absolute);
  }
  return output;
}

const sourceFiles = walk(srcRoot, file => /\.(?:ts|tsx)$/.test(file));
const sourceSet = new Set(sourceFiles);

function resolveSourceImport(fromFile, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = specifier.startsWith('@/')
    ? path.join(srcRoot, specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]) {
    if (sourceSet.has(candidate)) return candidate;
  }
  return null;
}

const imports = new Map();
const importedNames = new Map();
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const imported = ts.preProcessFile(text, true, true).importedFiles
    .map(entry => resolveSourceImport(file, entry.fileName))
    .filter(Boolean);
  imports.set(file, imported);

  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const dependency = resolveSourceImport(file, statement.moduleSpecifier.text);
    if (!dependency || !statement.importClause) continue;
    const names = importedNames.get(dependency) ?? new Set();
    if (statement.importClause.name) names.add('default');
    const bindings = statement.importClause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) names.add('*');
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) names.add((element.propertyName ?? element.name).text);
    }
    importedNames.set(dependency, names);
  }
}

function routeEntry(file) {
  const relative = path.relative(srcRoot, file).replaceAll('\\', '/');
  if (!relative.startsWith('app/')) return false;
  return /\/(?:page|layout|route|loading|error|not-found|template|default)\.(?:ts|tsx)$/.test(relative);
}

function referenceRoute(file) {
  const relative = path.relative(srcRoot, file).replaceAll('\\', '/');
  return relative.startsWith('app/44OS_UI/');
}

function reachableFrom(entries) {
  const reached = new Set(entries);
  const queue = [...entries];
  while (queue.length) {
    const current = queue.pop();
    for (const dependency of imports.get(current) ?? []) {
      if (reached.has(dependency)) continue;
      reached.add(dependency);
      queue.push(dependency);
    }
  }
  return reached;
}

const allEntries = sourceFiles.filter(routeEntry);
const productionEntries = allEntries.filter(file => !referenceRoute(file));
const allPageEntries = sourceFiles.filter(file => /[/\\]page\.tsx$/.test(file) && file.includes(`${path.sep}app${path.sep}`));
const productionPageEntries = allPageEntries.filter(file => !referenceRoute(file));
const productionReachable = reachableFrom(productionEntries);
const allReachable = reachableFrom(allEntries);

const unreachableComponents = sourceFiles
  .filter(file => file.includes(`${path.sep}components${path.sep}`))
  .filter(file => !allReachable.has(file))
  .map(file => path.relative(root, file).replaceAll('\\', '/'))
  .sort();

const referenceOnly = [...allReachable]
  .filter(file => !productionReachable.has(file))
  .map(file => path.relative(root, file).replaceAll('\\', '/'))
  .sort();

const sourceStats = {
  nativeButtons: 0,
  rawInputsOutsidePrimitive: 0,
  rawTextareasOutsidePrimitive: 0,
  rawSelectsOutsidePrimitive: 0,
  forms: 0,
  inlineStyles: 0,
  classNameAttributes: 0,
  ui44TextInput: 0,
  ui44Textarea: 0,
  ui44SelectInput: 0,
  ui44CheckboxInput: 0,
  ui44RangeInput: 0,
  ui44FileInput: 0,
  ui44Panel: 0,
};
const componentStatKeys = new Map([
  ['Ui44TextInput', 'ui44TextInput'],
  ['Ui44Textarea', 'ui44Textarea'],
  ['Ui44SelectInput', 'ui44SelectInput'],
  ['Ui44CheckboxInput', 'ui44CheckboxInput'],
  ['Ui44RangeInput', 'ui44RangeInput'],
  ['Ui44FileInput', 'ui44FileInput'],
  ['Ui44Panel', 'ui44Panel'],
]);
for (const file of productionReachable) {
  if (!file.endsWith('.tsx')) continue;
  const text = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const isInputPrimitive = file.endsWith(`${path.sep}components${path.sep}ui44${path.sep}Inputs.tsx`);
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      if (tagName === 'button') sourceStats.nativeButtons += 1;
      if (tagName === 'form') sourceStats.forms += 1;
      if (!isInputPrimitive && tagName === 'input') sourceStats.rawInputsOutsidePrimitive += 1;
      if (!isInputPrimitive && tagName === 'textarea') sourceStats.rawTextareasOutsidePrimitive += 1;
      if (!isInputPrimitive && tagName === 'select') sourceStats.rawSelectsOutsidePrimitive += 1;
      const statKey = componentStatKeys.get(tagName);
      if (statKey) sourceStats[statKey] += 1;
      for (const attribute of node.attributes.properties) {
        if (!ts.isJsxAttribute(attribute)) continue;
        if (attribute.name.text === 'style') sourceStats.inlineStyles += 1;
        if (attribute.name.text === 'className') sourceStats.classNameAttributes += 1;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function exportedValueNames(file) {
  const text = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = [];
  for (const statement of sourceFile.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    const exported = modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
    const defaultExport = modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword);
    if (!exported || defaultExport) continue;
    if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
      if (statement.name) names.push(statement.name.text);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
      }
    }
  }
  return names;
}

const unreferencedComponentExports = sourceFiles
  .filter(file => file.includes(`${path.sep}components${path.sep}`))
  .flatMap(file => {
    const used = importedNames.get(file) ?? new Set();
    if (used.has('*')) return [];
    const text = fs.readFileSync(file, 'utf8');
    return exportedValueNames(file)
      .filter(name => !used.has(name))
      .filter(name => (text.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length === 1)
      .map(name => `${path.relative(root, file).replaceAll('\\', '/')}:${name}`);
  })
  .sort();

const productionText = [...productionReachable]
  .map(file => fs.readFileSync(file, 'utf8'))
  .join('\n');
const allText = [...allReachable]
  .map(file => fs.readFileSync(file, 'utf8'))
  .join('\n');

function sourceClassTokens(files) {
  const tokens = new Set();
  function addText(text) {
    for (const match of text.matchAll(/-?[_A-Za-z][_A-Za-z0-9-]*/g)) tokens.add(match[0]);
  }
  function collectLiteralText(node) {
    if (!node) return;
    if (
      ts.isStringLiteralLike(node)
      || node.kind === ts.SyntaxKind.TemplateHead
      || node.kind === ts.SyntaxKind.TemplateMiddle
      || node.kind === ts.SyntaxKind.TemplateTail
    ) addText(node.text);
    ts.forEachChild(node, collectLiteralText);
  }
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name && /class|icon/i.test(node.name.text)) {
        collectLiteralText(node.body);
      } else if (ts.isJsxAttribute(node) && node.name.text === 'className') {
        collectLiteralText(node.initializer);
      } else if (ts.isPropertyAssignment(node)) {
        const name = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : '';
        if (/class/i.test(name)) collectLiteralText(node.initializer);
      } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /class/i.test(node.name.text)) {
        collectLiteralText(node.initializer);
      } else if (ts.isBinaryExpression(node) && ts.isPropertyAccessExpression(node.left) && node.left.name.text === 'className') {
        collectLiteralText(node.right);
      } else if (ts.isCallExpression(node)) {
        const expression = node.expression;
        const callName = ts.isIdentifier(expression)
          ? expression.text
          : ts.isPropertyAccessExpression(expression)
            ? expression.name.text
            : '';
        if (/^(?:joinClasses|classNames|clsx|querySelector|querySelectorAll|closest|matches|getElementsByClassName|add|remove|toggle|contains)$/.test(callName)) {
          for (const argument of node.arguments) collectLiteralText(argument);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }
  return tokens;
}

const productionClassTokens = sourceClassTokens(productionReachable);
const allClassTokens = sourceClassTokens(allReachable);

function dynamicPrefixes(text) {
  const prefixes = new Set();
  for (const match of text.matchAll(/([A-Za-z_][A-Za-z0-9_-]{2,}-)\$\{/g)) prefixes.add(match[1]);
  return prefixes;
}

const productionPrefixes = dynamicPrefixes(productionText);
const allPrefixes = dynamicPrefixes(allText);

function classReferenced(name, tokens, prefixes) {
  if (tokens.has(name)) return true;
  return [...prefixes].some(prefix => name.startsWith(prefix));
}

function splitSelectors(selector) {
  const selectors = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];
    if (quote) {
      if (character === quote && selector[index - 1] !== '\\') quote = '';
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(' || character === '[') depth += 1;
    else if (character === ')' || character === ']') depth = Math.max(0, depth - 1);
    else if (character === ',' && depth === 0) {
      selectors.push(selector.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(selector.slice(start).trim());
  return selectors.filter(Boolean);
}

function selectorClasses(selector) {
  return [...selector.matchAll(/\.(-?[_A-Za-z][_A-Za-z0-9-]*)/g)].map(match => match[1]);
}

const css = {
  rules: 0,
  selectors: 0,
  declarations: 0,
  customPropertyDefinitions: 0,
  importantDeclarations: 0,
  mediaBlocks: 0,
  keyframes: 0,
  productionUnusedRules: 0,
  allUnusedRules: 0,
  productionUnusedSelectors: 0,
  allUnusedSelectors: 0,
  perFile: [],
};
const customPropertyNames = new Set();
const mediaConditions = new Set();
const cssClassNames = new Set();

function removeEmptyContainers(rootNode) {
  let removedEmptyContainer = true;
  while (removedEmptyContainer) {
    removedEmptyContainer = false;
    rootNode.walkRules(rule => {
      if (!rule.nodes?.length) {
        rule.remove();
        removedEmptyContainer = true;
      }
    });
    rootNode.walkAtRules(atRule => {
      if (Array.isArray(atRule.nodes) && atRule.nodes.length === 0) {
        atRule.remove();
        removedEmptyContainer = true;
      }
    });
  }
}

for (const relative of styleFiles) {
  const absolute = path.join(root, relative);
  const rootNode = postcss.parse(fs.readFileSync(absolute, 'utf8'), { from: absolute });
  const fileResult = {
    file: relative,
    rules: 0,
    selectors: 0,
    declarations: 0,
    customPropertyDefinitions: 0,
    importantDeclarations: 0,
    mediaBlocks: 0,
    keyframes: 0,
    productionUnusedRules: 0,
    allUnusedRules: 0,
    productionUnusedSelectors: 0,
    allUnusedSelectors: 0,
    examples: [],
  };
  rootNode.walkDecls(declaration => {
    fileResult.declarations += 1;
    if (declaration.prop.startsWith('--')) {
      fileResult.customPropertyDefinitions += 1;
      customPropertyNames.add(declaration.prop);
    }
    if (declaration.important) fileResult.importantDeclarations += 1;
  });
  rootNode.walkAtRules('media', atRule => {
    fileResult.mediaBlocks += 1;
    mediaConditions.add(atRule.params.trim());
  });
  rootNode.walkAtRules(/(?:-webkit-)?keyframes$/, () => {
    fileResult.keyframes += 1;
  });
  rootNode.walkRules(rule => {
    fileResult.rules += 1;
    const selectors = splitSelectors(rule.selector);
    for (const selector of selectors) {
      for (const name of selectorClasses(selector)) cssClassNames.add(name);
    }
    fileResult.selectors += selectors.length;
    const productionUnused = selectors.filter(selector => {
      const classes = selectorClasses(selector);
      return classes.length > 0 && classes.every(name => !classReferenced(name, productionClassTokens, productionPrefixes));
    });
    const allUnused = selectors.filter(selector => {
      const classes = selectorClasses(selector);
      return classes.length > 0 && classes.every(name => !classReferenced(name, allClassTokens, allPrefixes));
    });
    fileResult.productionUnusedSelectors += productionUnused.length;
    fileResult.allUnusedSelectors += allUnused.length;
    if (productionUnused.length === selectors.length) fileResult.productionUnusedRules += 1;
    if (allUnused.length === selectors.length) {
      fileResult.allUnusedRules += 1;
      if (fileResult.examples.length < 20) fileResult.examples.push(rule.selector);
    }
  });
  if (writeUnusedCss) {
    rootNode.walkRules(rule => {
      const selectors = splitSelectors(rule.selector);
      const retained = selectors.filter(selector => {
        const classes = selectorClasses(selector);
        return classes.length === 0 || classes.some(name => classReferenced(name, allClassTokens, allPrefixes));
      });
      if (retained.length === 0) rule.remove();
      else if (retained.length !== selectors.length) rule.selector = retained.join(',\n');
    });
    removeEmptyContainers(rootNode);
    fs.writeFileSync(absolute, rootNode.toString());
  }
  css.rules += fileResult.rules;
  css.selectors += fileResult.selectors;
  css.declarations += fileResult.declarations;
  css.customPropertyDefinitions += fileResult.customPropertyDefinitions;
  css.importantDeclarations += fileResult.importantDeclarations;
  css.mediaBlocks += fileResult.mediaBlocks;
  css.keyframes += fileResult.keyframes;
  css.productionUnusedRules += fileResult.productionUnusedRules;
  css.allUnusedRules += fileResult.allUnusedRules;
  css.productionUnusedSelectors += fileResult.productionUnusedSelectors;
  css.allUnusedSelectors += fileResult.allUnusedSelectors;
  css.perFile.push(fileResult);
}
css.uniqueCustomProperties = customPropertyNames.size;
css.uniqueOsCustomProperties = [...customPropertyNames].filter(name => name.startsWith('--os-')).length;
css.uniqueUi44CustomProperties = [...customPropertyNames].filter(name => name.startsWith('--44ui-')).length;
css.uniqueOtherCustomProperties = css.uniqueCustomProperties - css.uniqueOsCustomProperties - css.uniqueUi44CustomProperties;
css.uniqueMediaConditions = mediaConditions.size;
css.uniqueClassNames = cssClassNames.size;
sourceStats.staticProductionClassTokens = productionClassTokens.size;
sourceStats.staticProductionClassTokensWithCssDefinition = [...productionClassTokens]
  .filter(name => cssClassNames.has(name)).length;
sourceStats.staticProductionClassTokensWithoutCssDefinition = [...productionClassTokens]
  .filter(name => !cssClassNames.has(name)).length;
sourceStats.staticProductionClassTokensWithoutCssDefinitionExamples = [...productionClassTokens]
  .filter(name => !cssClassNames.has(name))
  .sort()
  .slice(0, 40);
sourceStats.dynamicProductionClassPrefixes = productionPrefixes.size;
sourceStats.staticAllSourceClassTokens = allClassTokens.size;
sourceStats.dynamicAllSourceClassPrefixes = allPrefixes.size;

const cleanupStats = { customProperties: 0, keyframes: 0 };
if (writeUnusedCss) {
  const parsedStyles = styleFiles.map(relative => {
    const absolute = path.join(root, relative);
    return { relative, absolute, rootNode: postcss.parse(fs.readFileSync(absolute, 'utf8'), { from: absolute }) };
  });

  let removedToken = true;
  while (removedToken) {
    removedToken = false;
    const referenced = new Set();
    for (const { rootNode } of parsedStyles) {
      rootNode.walkDecls(declaration => {
        for (const match of declaration.value.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) referenced.add(match[1]);
      });
      rootNode.walkAtRules(atRule => {
        for (const match of atRule.params.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) referenced.add(match[1]);
      });
    }
    for (const match of allText.matchAll(/--[A-Za-z0-9_-]+/g)) referenced.add(match[0]);
    for (const { rootNode } of parsedStyles) {
      rootNode.walkDecls(/^--/, declaration => {
        if (referenced.has(declaration.prop)) return;
        declaration.remove();
        cleanupStats.customProperties += 1;
        removedToken = true;
      });
    }
  }

  const animationValues = [];
  for (const { rootNode } of parsedStyles) {
    rootNode.walkDecls(/^(?:animation|animation-name)$/, declaration => animationValues.push(declaration.value));
  }
  for (const { rootNode } of parsedStyles) {
    rootNode.walkAtRules(/(?:-webkit-)?keyframes$/, atRule => {
      const name = atRule.params.trim();
      const used = animationValues.some(value => new RegExp(`(^|[^A-Za-z0-9_-])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_-]|$)`).test(value))
        || allText.includes(name);
      if (used) return;
      atRule.remove();
      cleanupStats.keyframes += 1;
    });
  }

  for (const { absolute, rootNode } of parsedStyles) {
    removeEmptyContainers(rootNode);
    fs.writeFileSync(absolute, rootNode.toString());
  }
}

function conditionalContext(node) {
  const context = [];
  let parent = node.parent;
  while (parent && parent.type !== 'root') {
    if (parent.type === 'atrule') context.push(`@${parent.name} ${parent.params}`);
    parent = parent.parent;
  }
  return context.reverse().join(' > ');
}

function normalizedSelector(selector) {
  return selector.replace(/\s+/g, ' ').trim();
}

function shadowedDeclarations(files) {
  const active = new Map();
  const shadowed = new Set();
  const parsed = files.map(relative => {
    const absolute = path.join(root, relative);
    return { relative, absolute, rootNode: postcss.parse(fs.readFileSync(absolute, 'utf8'), { from: absolute }) };
  });

  for (const file of parsed) {
    file.rootNode.walkRules(rule => {
      const selector = normalizedSelector(rule.selector);
      const context = conditionalContext(rule);
      rule.walkDecls(declaration => {
        const key = `${context}\u0000${selector}\u0000${declaration.prop}`;
        const current = active.get(key) ?? { important: [], normal: [] };
        if (declaration.important) {
          for (const previous of [...current.important, ...current.normal]) shadowed.add(previous);
          current.important = [declaration];
          current.normal = [];
        } else if (current.important.length) {
          shadowed.add(declaration);
        } else {
          for (const previous of current.normal) shadowed.add(previous);
          current.normal = [declaration];
        }
        active.set(key, current);
      });
    });
  }

  const perFile = parsed.map(file => {
    const declarations = [...shadowed].filter(declaration => declaration.source?.input.file === file.absolute);
    return {
      file: file.relative,
      declarations: declarations.length,
      examples: declarations.slice(0, 20).map(declaration => ({
        selector: declaration.parent?.selector,
        property: declaration.prop,
        value: declaration.value,
      })),
    };
  });

  if (writeShadowedCss) {
    for (const declaration of shadowed) declaration.remove();
    for (const file of parsed) {
      removeEmptyContainers(file.rootNode);
      fs.writeFileSync(file.absolute, file.rootNode.toString());
    }
  }

  return {
    declarations: shadowed.size,
    perFile,
  };
}

const shadowed = shadowedDeclarations([
  'src/app/globals.css',
  'src/styles/44-ui/canonical-system.css',
]);

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  wroteUnusedCss: writeUnusedCss,
  wroteShadowedCss: writeShadowedCss,
  cleanupStats,
  routeEntries: allEntries.length,
  productionRouteEntries: productionEntries.length,
  pageEntries: allPageEntries.length,
  productionPageEntries: productionPageEntries.length,
  componentFiles: sourceFiles.filter(file => file.includes(`${path.sep}components${path.sep}`)).length,
  productionReachableTsxFiles: [...productionReachable].filter(file => file.endsWith('.tsx')).length,
  productionReachableFiles: productionReachable.size,
  allReachableFiles: allReachable.size,
  sourceStats,
  unreachableComponents,
  unreferencedComponentExports,
  referenceOnly,
  css,
  shadowed,
}, null, 2));
