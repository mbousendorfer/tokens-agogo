/**
 * Transforme l'export Figma en tokens cibles, ceux que propose le sélecteur.
 *
 * Les TSV de `figma-export/` sont extraits du fichier Figma via le MCP (`use_figma`),
 * puis commités. Ce script les convertit en noms de tokens CSS et résout les alias
 * jusqu'à leur valeur littérale.
 *
 * La conversion nom Figma -> nom CSS reproduit le transform `name/cti/kebab` de Style
 * Dictionary, pour que les noms générés coïncident avec ceux du design system.
 * La jointure se fait par les noms, jamais par les identifiants Figma (ADR 008).
 *
 * Usage : node tools/build-figma-tokens.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const EXPORT_DIR = 'figma-export';
const OUT_FILE = 'data/figma-tokens.json';

/** Chaque collection Figma devient un tier de tokens CSS. */
const COLLECTIONS = [
  { file: 'reference-tokens.tsv', collection: 'Reference tokens', tier: 'ref' },
  { file: 'system-tokens.tsv', collection: 'System tokens', tier: 'sys' },
  { file: 'component-tokens.tsv', collection: 'Component tokens', tier: 'comp' },
];

/**
 * `Colors/Electric Blue/electric-blue-600` -> `--ref-color-electric-blue-600`.
 *
 * Les segments Figma sont en Title Case ou en kebab ; on normalise en kebab minuscule,
 * et on déduplique le préfixe quand le dernier segment le répète déjà
 * (`Colors/Grey/grey-100` donnerait sinon `color-grey-grey-100`).
 */
export function figmaNameToCss(name, tier) {
  const kebab = (segment) =>
    segment
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[\s_/]+/g, '-')
      .replace(/[()]/g, '')
      .replace(/-+/g, '-')
      .toLowerCase();

  const raw = name.split('/').map(kebab).filter(Boolean);

  // `Colors` est le pluriel de catégorie côté Figma ; côté CSS le design system dit `color`.
  const segments = raw.map((segment, index) =>
    index === 0 && segment === 'colors' ? 'color' : segment,
  );

  const deduped = [];
  for (const segment of segments) {
    const previous = deduped.at(-1);
    // `grey/grey-100` -> `grey-100` : le groupe Figma répète le nom de la ramp.
    if (previous && (segment === previous || segment.startsWith(`${previous}-`))) {
      deduped[deduped.length - 1] = segment;
      continue;
    }
    deduped.push(segment);
  }

  return `--${tier}-${deduped.join('-')}`;
}

function parseTsv(path, tier, collection) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const [name, value = '', accessible = '', scopes = ''] = line.split('\t');
      return {
        figmaName: name,
        name: figmaNameToCss(name, tier),
        tier,
        collection,
        raw: value,
        accessible: accessible || null,
        scopes: scopes ? scopes.split(',') : ['ALL_SCOPES'],
      };
    });
}

/** Résout les chaînes d'alias `@Autre/Nom` jusqu'à la valeur littérale. */
function resolve(tokens) {
  const byFigmaName = new Map(tokens.map((token) => [token.figmaName, token]));

  const valueOf = (token, seen = new Set()) => {
    if (!token || seen.has(token.figmaName)) return null;
    if (!token.raw.startsWith('@')) return token.raw || null;
    seen.add(token.figmaName);
    return valueOf(byFigmaName.get(token.raw.slice(1)), seen);
  };

  return tokens.map((token) => {
    const target = token.raw.startsWith('@') ? byFigmaName.get(token.raw.slice(1)) : null;
    return {
      ...token,
      aliasOf: target ? target.name : null,
      aliasOfFigma: token.raw.startsWith('@') ? token.raw.slice(1) : null,
      value: valueOf(token),
      accessibleValue: token.accessible
        ? valueOf({ figmaName: `${token.figmaName}#a`, raw: token.accessible })
        : null,
    };
  });
}

export function buildFigmaTokens({ outFile = OUT_FILE } = {}) {
  const tokens = COLLECTIONS.flatMap(({ file, tier, collection }) => {
    const path = join(EXPORT_DIR, file);
    return existsSync(path) ? parseTsv(path, tier, collection) : [];
  });

  const resolved = resolve(tokens).sort((a, b) => a.name.localeCompare(b.name));
  const byTier = resolved.reduce((acc, t) => ({ ...acc, [t.tier]: (acc[t.tier] ?? 0) + 1 }), {});

  const payload = {
    source: {
      file: 'V2 Style Guide 2.0 - Tokens',
      fileKey: 'ZXNsdFTc17AM5qk6DZc07A',
      via: 'MCP use_figma',
    },
    counts: { total: resolved.length, byTier },
    // `raw` et `accessible` sont les formes non résolues : elles ont servi au calcul,
    // elles n'ont rien à faire dans le payload consommé par l'app.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tokens: resolved.map(({ raw, accessible, ...token }) => token),
  };

  mkdirSync('data', { recursive: true });
  writeFileSync(outFile, JSON.stringify(payload, null, 2) + '\n');
  return payload;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { counts, tokens } = buildFigmaTokens();
  console.log(`${counts.total} tokens cibles :`, counts.byTier);
  console.log('\nExemples :');
  for (const token of tokens.filter((t) => t.tier === 'sys').slice(0, 6)) {
    console.log(`  ${token.name.padEnd(46)} ${token.aliasOf ?? ''} ${token.value ?? ''}`);
  }
  const unresolved = tokens.filter((t) => !t.value);
  if (unresolved.length) {
    console.log(`\n${unresolved.length} token(s) sans valeur résolue :`);
    for (const token of unresolved.slice(0, 10)) console.log(`  ${token.name}`);
  }
}
