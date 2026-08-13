/**
 * Construit l'index des déclarations du design system.
 *
 * Pas un compteur de `var()` : pour chaque déclaration, on garde son sélecteur résolu,
 * son état, sa propriété CSS et son token. C'est ce qui permettra de confronter le code
 * à la spec Figma partie par partie et état par état (ADR 003).
 *
 * `tools/generate-design-specs.mjs`, côté design system, attribue aujourd'hui les tokens
 * aux composants **par convention de nommage de fichier**. Ici c'est par preuve.
 *
 * Usage :
 *   node tools/build-usage-index.mjs [--ds-root=...] [--ds-ref=master]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { listFiles, readFileAtRef, refSha, resolveDsRef, resolveDsRoot } from './ds-repo.mjs';
import { scanScss, scanTypescript } from './scss-scan.mjs';

const OUT_FILE = 'data/declarations.json';

const SCAN_PATHS = ['libs', 'apps/web/src'];

/** Fichiers générés ou vendorés : les scanner compterait deux fois, ou hors périmètre. */
const EXCLUDED = [/^3rd-party\//, /\/node_modules\//, /\/dist\//, /\.spec\.ts$/, /\.stories\.ts$/];

/**
 * À quel morceau du design system appartient un fichier.
 * Dérivé du chemin, mais rattaché à une déclaration réelle — pas à un nom de fichier
 * supposé correspondre à un composant.
 */
function entryPointOf(file) {
  let match;

  if ((match = file.match(/^libs\/ui-components\/([^/]+)\//))) {
    return { id: `ui-components/${match[1]}`, kind: 'angular', name: match[1] };
  }
  if ((match = file.match(/^libs\/ui-theme\/assets\/style\/css-ui\/_?([^/]+)\.scss$/))) {
    return { id: `css-ui/${match[1]}`, kind: 'css-ui', name: match[1] };
  }
  if (
    (match = file.match(
      /^libs\/ui-theme\/assets\/style\/components-custom-style\/_?([^/]+)\.scss$/,
    ))
  ) {
    return { id: `material/${match[1]}`, kind: 'material-override', name: match[1] };
  }
  if ((match = file.match(/^libs\/([^/]+)\//))) {
    return { id: `${match[1]}/divers`, kind: 'autre', name: match[1] };
  }
  if (file.startsWith('apps/web/')) {
    return { id: 'storybook', kind: 'storybook', name: 'storybook' };
  }
  return { id: 'autre', kind: 'autre', name: 'autre' };
}

export function buildUsageIndex({ dsRoot, dsRef, outFile = OUT_FILE }) {
  const files = SCAN_PATHS.flatMap((path) => listFiles(dsRoot, dsRef, path))
    .filter((file) => /\.(scss|ts|html)$/.test(file))
    .filter((file) => !EXCLUDED.some((pattern) => pattern.test(file)))
    .sort();

  const declarations = [];
  const scannedFiles = [];
  // Les custom properties déclarées dans les feuilles de style. Sans elles, un token
  // défini localement passerait pour référencé nulle part.
  const cssDefinitions = [];

  for (const file of files) {
    const source = readFileAtRef(dsRoot, dsRef, file);
    if (!source.includes('--')) continue;

    const found = file.endsWith('.scss')
      ? scanScss(source, file)
      : file.endsWith('.ts')
        ? scanTypescript(source, file)
        : [];

    for (const definition of found.definitions ?? []) cssDefinitions.push(definition);
    if (!found.length) continue;
    scannedFiles.push(file);

    const entryPoint = entryPointOf(file);
    for (const declaration of found) {
      declarations.push({ ...declaration, entryPoint: entryPoint.id, kind: entryPoint.kind });
    }
  }

  return summarize(
    declarations,
    scannedFiles,
    cssDefinitions,
    { ref: dsRef, sha: refSha(dsRoot, dsRef) },
    outFile,
  );
}

function summarize(declarations, scannedFiles, cssDefinitions, source, outFile) {
  const usages = declarations.filter((d) => !d.isDefinition);

  const counts = { total: declarations.length, byTier: {}, uniqueByTier: {} };
  for (const tier of ['ref', 'sys', 'comp', 'local']) {
    const subset = usages.filter((d) => d.tier === tier);
    counts.byTier[tier] = subset.length;
    counts.uniqueByTier[tier] = new Set(subset.map((d) => d.token)).size;
  }

  /** Par entry point : la ventilation par tier, et la dette explicite. */
  const byEntryPoint = {};
  for (const declaration of usages) {
    const entry = (byEntryPoint[declaration.entryPoint] ??= {
      kind: declaration.kind,
      files: new Set(),
      byTier: { ref: 0, sys: 0, comp: 0, local: 0 },
      rawRefTokens: new Set(),
      hardcodedFallbacks: 0,
    });
    entry.files.add(declaration.file);
    entry.byTier[declaration.tier]++;
    if (declaration.tier === 'ref') entry.rawRefTokens.add(declaration.token);
    // Un fallback qui pointe vers un autre token est une dégradation gracieuse ;
    // seul un littéral est une valeur en dur cachée dans une référence de token.
    if (declaration.fallback && !declaration.fallbackIsToken) entry.hardcodedFallbacks++;
  }

  const entryPoints = Object.entries(byEntryPoint)
    .map(([id, entry]) => ({
      id,
      kind: entry.kind,
      files: [...entry.files].sort(),
      byTier: entry.byTier,
      rawRefTokens: [...entry.rawRefTokens].sort(),
      hardcodedFallbacks: entry.hardcodedFallbacks,
      // La dette de call sites : primitives brutes, plus les valeurs en dur cachées
      // dans un fallback, qui pèsent plus lourd parce qu'elles sont invisibles.
      debt: entry.byTier.ref + entry.hardcodedFallbacks * 3,
    }))
    .sort((a, b) => b.debt - a.debt || a.id.localeCompare(b.id));

  const byToken = {};
  for (const [index, declaration] of declarations.entries()) {
    if (declaration.isDefinition) continue;
    (byToken[declaration.token] ??= []).push(index);
  }

  const payload = {
    source: { ...source, scannedFiles: scannedFiles.length },
    counts,
    entryPoints,
    byToken,
    cssDefinitions,
    declarations,
  };

  mkdirSync('data', { recursive: true });
  writeFileSync(outFile, JSON.stringify(payload) + '\n');
  return payload;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dsRoot = resolveDsRoot();
  const dsRef = resolveDsRef();
  const { source, counts, entryPoints } = buildUsageIndex({ dsRoot, dsRef });

  console.log(`${dsRoot} @ ${dsRef} (${source.sha}) — ${source.scannedFiles} fichiers\n`);
  for (const tier of ['ref', 'sys', 'comp', 'local']) {
    console.log(
      `  --${tier}-*`.padEnd(12) +
        `${String(counts.byTier[tier]).padStart(5)} usages, ${counts.uniqueByTier[tier]} noms uniques`,
    );
  }

  console.log('\nDette la plus lourde :');
  for (const entry of entryPoints.slice(0, 8)) {
    console.log(
      `  ${entry.id.padEnd(34)} ${String(entry.byTier.ref).padStart(4)} primitives brutes` +
        (entry.hardcodedFallbacks ? `, ${entry.hardcodedFallbacks} fallback(s) en dur` : ''),
    );
  }
  console.log(`\nécrit : ${OUT_FILE}`);
}
