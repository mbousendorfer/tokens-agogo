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
  // La collection Reference n'a qu'un mode : sa 3e colonne est le scope, pas une
  // seconde valeur. La lire comme les autres ferait passer `CORNER_RADIUS` pour une
  // variante « Accessible ».
  { file: 'reference-tokens.tsv', collection: 'Reference tokens', tier: 'ref', modes: 1 },
  { file: 'system-tokens.tsv', collection: 'System tokens', tier: 'sys', modes: 2 },
  { file: 'component-tokens.tsv', collection: 'Component tokens', tier: 'comp', modes: 2 },
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

function parseTsv(path, tier, collection, modes) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const columns = line.split('\t');
      const [name, value = ''] = columns;
      const accessible = modes === 2 ? (columns[2] ?? '') : '';
      const scopes = modes === 2 ? (columns[3] ?? '') : (columns[2] ?? '');
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

/**
 * L'unité d'une valeur, déduite du scope Figma du token de référence.
 *
 * Les tokens `sys` et `comp` sont presque tous marqués `ALL_SCOPES` : c'est au bout
 * de la chaîne d'alias, sur la primitive, que Figma dit vraiment de quoi il s'agit.
 * Un `radius/control` qui alias `Border Radius/border-radius-md` hérite donc de
 * `CORNER_RADIUS`, et s'affiche en pixels.
 */
const UNIT_BY_SCOPE = {
  CORNER_RADIUS: 'px',
  GAP: 'px',
  WIDTH_HEIGHT: 'px',
  FONT_SIZE: 'px',
  LINE_HEIGHT: 'px',
  PARAGRAPH_SPACING: 'px',
  LETTER_SPACING: 'px',
  STROKE_FLOAT: 'px',
  FONT_WEIGHT: '',
  FONT_FAMILY: '',
  OPACITY: '',
};

/**
 * Le groupe sous lequel ranger le token, exactement comme le panneau Variables de
 * Figma : tout le chemin sauf le dernier segment.
 *
 * `color/text/interactive/active/default` -> `color / text / interactive / active`.
 * C'est le vocabulaire des designers, pas une taxonomie réinventée ici.
 */
function groupOf(figmaName) {
  const parts = figmaName.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join(' / ') : '—';
}

/** Le dernier segment : ce que Figma affiche dans la colonne Name. */
function leafOf(figmaName) {
  return figmaName.split('/').at(-1);
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

  /** Descend la chaîne d'alias jusqu'à la primitive, pour lire son scope. */
  const rootOf = (token, seen = new Set()) => {
    if (!token || seen.has(token.figmaName)) return null;
    if (!token.raw.startsWith('@')) return token;
    seen.add(token.figmaName);
    return rootOf(byFigmaName.get(token.raw.slice(1)), seen);
  };

  return tokens.map((token) => {
    const target = token.raw.startsWith('@') ? byFigmaName.get(token.raw.slice(1)) : null;
    const root = rootOf(token);
    const scope = (root?.scopes ?? []).find((s) => s in UNIT_BY_SCOPE);
    const value = valueOf(token);

    // Les durées de Figma sont en secondes ; en CSS on les lit en millisecondes.
    const isTiming = token.figmaName.startsWith('motion/timing');
    const unit = isTiming ? 'ms' : (UNIT_BY_SCOPE[scope] ?? '');

    return {
      ...token,
      group: groupOf(token.figmaName),
      leaf: leafOf(token.figmaName),
      unit,
      /*
        Ce que Figma affiche dans la colonne de valeur : le token pointé quand il y
        en a un, la valeur littérale sinon. Jamais la couleur résolue — un token qui
        alias `Colors/Grey/grey-1000` se lit comme tel, pas comme `#344563`.
      */
      display: target
        ? target.name
        : value == null
          ? null
          : isTiming
            ? `${Math.round(Number(value) * 1000)}ms`
            : /^-?[\d.]+$/.test(String(value))
              ? `${value}${unit}`
              : String(value),
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
  const tokens = COLLECTIONS.flatMap(({ file, tier, collection, modes }) => {
    const path = join(EXPORT_DIR, file);
    return existsSync(path) ? parseTsv(path, tier, collection, modes) : [];
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
  for (const token of tokens.filter((t) => t.tier === 'sys').slice(0, 8)) {
    console.log(`  ${token.leaf.padEnd(22)} ${String(token.display).padEnd(30)} ${token.group}`);
  }
  const unresolved = tokens.filter((t) => !t.value);
  if (unresolved.length) {
    console.log(`\n${unresolved.length} token(s) sans valeur résolue :`);
    for (const token of unresolved.slice(0, 10)) console.log(`  ${token.name}`);
  }
}
