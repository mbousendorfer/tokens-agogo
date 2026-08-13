/**
 * Émet les JSON Style Dictionary des layers `ref` et `sys` depuis les variables Figma.
 *
 * C'est ce qui remplace la transcription à la main dont le design system garde la
 * trace dans ses commentaires (« Transcribed from the Figma collection `System
 * Tokens`… Read 2026-08-05 »).
 *
 * Les alias sont émis en syntaxe Style Dictionary (`{ref.color.grey.1000}`), pas en
 * valeurs résolues : c'est ce qui permet à `outputReferences` de produire une chaîne
 * `var()` à l'autre bout, et c'est la forme que le design system attend.
 *
 * Usage : node tools/emit-style-dictionary.mjs [--out=dist/tokens]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const TOKENS_FILE = 'data/figma-tokens.json';
const DEFAULT_OUT = 'dist/tokens';

/**
 * Reconstruit le chemin Style Dictionary depuis le nom Figma, pas depuis le nom CSS.
 *
 * Le nom CSS est aplati par des tirets : `--ref-color-electric-blue-600` ne dit plus
 * où sont les frontières. Le chemin Figma, lui, les porte encore.
 */
function sdPathFor(token) {
  const kebabToCamel = (segment) =>
    segment.toLowerCase().replace(/-([a-z0-9])/g, (_m, c) => c.toUpperCase());

  const raw = token.figmaName.split('/').map((segment) => segment.trim().replace(/\s+/g, '-'));

  // Le dédoublonnage doit passer AVANT le camelCase : après, `grey-1000` est devenu
  // `grey1000` et le préfixe répété n'est plus reconnaissable.
  const deduped = [];
  for (const segment of raw) {
    const previous = deduped.at(-1);
    if (previous && segment.toLowerCase().startsWith(previous.toLowerCase() + '-')) {
      deduped.push(segment.slice(previous.length + 1));
      continue;
    }
    deduped.push(segment);
  }

  const cased = deduped.map((segment) =>
    // Un segment purement numérique reste tel quel : c'est un barreau.
    /^\d+$/.test(segment) ? segment : kebabToCamel(segment),
  );

  const head = cased[0]?.toLowerCase() === 'colors' ? ['color', ...cased.slice(1)] : cased;
  return [token.tier, ...head];
}

/** Le chemin d'un alias en syntaxe Style Dictionary : `{ref.color.grey.1000}`. */
function referenceFor(target, byCssName) {
  const token = byCssName.get(target);
  return token ? `{${sdPathFor(token).join('.')}}` : null;
}

function setIn(tree, path, value) {
  let node = tree;
  for (const segment of path.slice(0, -1)) {
    node[segment] ??= {};
    node = node[segment];
  }
  node[path.at(-1)] = value;
}

export function emitStyleDictionary({ out = DEFAULT_OUT } = {}) {
  const data = JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));
  const byCssName = new Map(data.tokens.map((token) => [token.name, token]));

  /** Un fichier par tier et par catégorie, comme le design system les range. */
  const files = new Map();

  for (const token of data.tokens) {
    const path = sdPathFor(token);
    const category = path[1] ?? 'divers';
    const folder =
      token.tier === 'ref' ? 'reference' : token.tier === 'sys' ? 'system' : 'components';
    const file = join(out, folder, `${category}.json`);

    const value = token.aliasOf
      ? (referenceFor(token.aliasOf, byCssName) ?? token.value)
      : token.value;
    if (value == null) continue;

    const tree = files.get(file) ?? {};
    setIn(tree, path, {
      value,
      // Les `scopes` Figma disent à quoi la variable est destinée : on les garde en
      // commentaire, c'est ce qui permettra plus tard de refuser un token de texte
      // sur un fond.
      ...(token.scopes?.length && !token.scopes.includes('ALL_SCOPES')
        ? { comment: `scopes: ${token.scopes.join(', ')}` }
        : {}),
    });
    files.set(file, tree);
  }

  const written = [];
  for (const [file, tree] of files) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(tree, null, 4) + '\n');
    written.push(file);
  }

  return { written: written.sort(), tokens: data.tokens.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const flag = process.argv.find((a) => a.startsWith('--out='))?.slice('--out='.length);
  const { written, tokens } = emitStyleDictionary({ out: flag ?? DEFAULT_OUT });

  console.log(`${tokens} variables Figma -> ${written.length} fichiers Style Dictionary\n`);
  for (const file of written) console.log(`  ${file}`);
  console.log(
    '\nÀ copier dans libs/ui-theme/src/tokens/ du design system, puis `npm run generate-tokens:ui-theme`.',
  );
}
