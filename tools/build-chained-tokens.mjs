/**
 * Regénère le CSS des tokens du design system, mais avec `outputReferences: true`.
 *
 * Le design system livre un CSS aplati : `--comp-status-green-background-color: #ECF7ED`.
 * La chaîne ref -> sys -> comp n'existe qu'à l'écriture dans les JSON, jamais à
 * l'exécution. Une app qui édite des tokens ne peut donc rien propager.
 *
 * On relance Style Dictionary sur les mêmes sources, avec les mêmes transforms, en
 * activant `outputReferences`. Les alias restent des `var()`, et c'est le navigateur
 * qui résout — pas nous (ADR 004).
 *
 * Usage :
 *   node tools/build-chained-tokens.mjs [--ds-root=...] [--ds-ref=master]
 */
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { materialize, refSha, resolveDsRef, resolveDsRoot } from './ds-repo.mjs';

const require = createRequire(import.meta.url);
const StyleDictionary = require('style-dictionary');

const TOKENS_PATH = 'libs/ui-theme/src/tokens';
const CACHE_DIR = '.cache/ds-tokens';
const OUT_DIR = 'public/ds';

/**
 * Transforms repris à l'identique de `libs/ui-theme/src/desktop_config.js`.
 * Toute divergence changerait les noms de tokens et casserait la jointure avec le code.
 * `style-dictionary` est épinglé en 3.9.2 : la v4 renomme `name/cti/kebab` en `name/kebab`.
 */
const TRANSFORMS = ['attribute/cti', 'name/cti/kebab', 'color/hex', 'size/px'];

/** Le design system génère deux plateformes ; leur seule différence tient en 3 déclarations. */
const PLATFORMS = [
  { name: 'desktop', extraSource: 'system/desktop/*.json' },
  { name: 'mobile', extraSource: 'system/mobile/*.json' },
];

function sourcesFor(extraSource) {
  return [
    join(CACHE_DIR, 'reference/*.json'),
    join(CACHE_DIR, 'system/*.json'),
    join(CACHE_DIR, extraSource),
    join(CACHE_DIR, 'components/*.json'),
  ];
}

/** Style Dictionary 3.x écrit directement sur la console, sans option de verbosité. */
function silenced(fn) {
  const log = console.log;
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = log;
  }
}

export function buildChainedTokens({ dsRoot, dsRef, outDir = OUT_DIR }) {
  rmSync(CACHE_DIR, { recursive: true, force: true });
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const files = materialize(dsRoot, dsRef, TOKENS_PATH, CACHE_DIR);
  const sha = refSha(dsRoot, dsRef);

  const written = [];
  for (const { name, extraSource } of PLATFORMS) {
    for (const outputReferences of [true, false]) {
      const suffix = outputReferences ? 'chained' : 'flat';
      const destination = `${name}.${suffix}.css`;

      silenced(() =>
        StyleDictionary.extend({
          source: sourcesFor(extraSource),
          platforms: {
            [name]: {
              transformGroup: 'css',
              transforms: TRANSFORMS,
              buildPath: `${outDir}/`,
              files: [
                {
                  format: 'css/variables',
                  destination,
                  options: { showFileHeader: false, outputReferences },
                },
              ],
            },
          },
        }).buildPlatform(name),
      );

      written.push(join(outDir, destination));
    }
  }

  writeFileSync(
    join(outDir, 'source.json'),
    JSON.stringify({ ref: dsRef, sha, tokenFiles: files.length }, null, 2) + '\n',
  );

  return { sha, tokenFileCount: files.length, written };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dsRoot = resolveDsRoot();
  const dsRef = resolveDsRef();
  const { sha, tokenFileCount, written } = buildChainedTokens({ dsRoot, dsRef });

  console.log(`design system : ${dsRoot} @ ${dsRef} (${sha})`);
  console.log(`sources       : ${tokenFileCount} fichiers de tokens`);
  for (const file of written) console.log(`écrit         : ${file}`);
}
