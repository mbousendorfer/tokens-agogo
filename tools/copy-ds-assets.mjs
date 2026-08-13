/**
 * Copie les assets du design system dans `public/ds/`, pour l'iframe de preview.
 *
 * Next ne sert pas de fichiers arbitraires depuis `node_modules` ni depuis un repo
 * voisin : il faut les matérialiser sous `public/`. Le dossier est ignoré par git et
 * régénéré par `pnpm ds:assets`.
 *
 * L'arborescence du design system est **mirroir**, pas aplatie : `font-face.css`
 * référence `../../fonts/averta/…` relativement à lui-même, donc `style/css-ui/` et
 * `fonts/` doivent garder leur position relative pour que les fontes se résolvent.
 *
 * Les icônes ne sont pas commitées dans le design system (elles sont générées au
 * build), on les prend donc dans le package npm `@agorapulse/ui-symbol` — tag
 * `latest` uniquement, jamais `beta` (ADR 001).
 *
 * Usage :
 *   node tools/copy-ds-assets.mjs [--ds-root=...] [--ds-ref=master]
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import {
  listFiles,
  readBinaryAtRef,
  readFileAtRef,
  resolveDsRef,
  resolveDsRoot,
} from './ds-repo.mjs';

const OUT_DIR = 'public/ds';

/** Fichiers texte : chemin dans le design system -> chemin sous `public/ds/`. */
const TEXT_ASSETS = [
  ['libs/ui-theme/assets/style/css-ui/index.css', 'style/css-ui/index.css'],
  ['libs/ui-theme/assets/style/css-ui/font-face.css', 'style/css-ui/font-face.css'],
];

/** Fontes : tout le dossier, en binaire. */
const FONT_DIR = 'libs/ui-theme/assets/fonts';

function write(outDir, relative, contents) {
  const dest = join(outDir, relative);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, contents);
  return dest;
}

/** Le CSS d'icônes vient du package npm : le design system ne le commite pas. */
function copyIcons(outDir) {
  const require = createRequire(import.meta.url);
  let source;
  try {
    source = require.resolve('@agorapulse/ui-symbol/icons/ap-icons.css');
  } catch {
    return null;
  }
  if (!existsSync(source)) return null;

  const dest = join(outDir, 'icons/ap-icons.css');
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(source, dest);
  return dest;
}

export function copyDsAssets({ dsRoot, dsRef, outDir = OUT_DIR }) {
  const written = [];

  for (const [source, relative] of TEXT_ASSETS) {
    written.push(write(outDir, relative, readFileAtRef(dsRoot, dsRef, source)));
  }

  for (const file of listFiles(dsRoot, dsRef, FONT_DIR)) {
    const relative = join('fonts', file.slice(FONT_DIR.length).replace(/^\//, ''));
    written.push(write(outDir, relative, readBinaryAtRef(dsRoot, dsRef, file)));
  }

  const icons = copyIcons(outDir);
  if (icons) written.push(icons);

  return { written, hasIcons: Boolean(icons) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dsRoot = resolveDsRoot();
  const dsRef = resolveDsRef();
  const { written, hasIcons } = copyDsAssets({ dsRoot, dsRef });

  console.log(`${written.length} assets copiés depuis ${dsRoot} @ ${dsRef}`);
  if (!hasIcons) {
    console.warn(
      'Attention : @agorapulse/ui-symbol absent, les icônes ne seront pas rendues.\n' +
        '  pnpm add -D @agorapulse/ui-symbol@latest',
    );
  }
}
