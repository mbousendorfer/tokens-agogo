/**
 * Consomme les exports du plugin Figma et produit `data/figma.json`.
 *
 * Cherche le snapshot le plus récent de chaque type dans `figma-snapshots/`, aplatit
 * les variables, indexe les bindings composants, et compare le tout aux tokens du
 * design system.
 *
 * S'il n'y a aucun snapshot, le script ne plante pas : il écrit un fichier vide et le
 * dit. L'app affiche alors ce qui manque et comment l'obtenir, plutôt qu'une page
 * cassée ou, pire, des chiffres inventés.
 *
 * Usage :
 *   node tools/build-figma.mjs
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { allTokensFromFile } from './token-file.mjs';
import { diffAgainstTokens, flattenVariables, indexComponentBindings } from './figma-import.mjs';

const SNAPSHOT_DIR = 'figma-snapshots';
const OUT_FILE = 'data/figma.json';

/** Tous les snapshots, le plus récent d'abord (les noms de fichiers sont datés). */
function findSnapshots() {
  if (!existsSync(SNAPSHOT_DIR)) return [];

  const found = [];
  for (const fileKey of readdirSync(SNAPSHOT_DIR, { withFileTypes: true })) {
    if (!fileKey.isDirectory()) continue;
    const dir = join(SNAPSHOT_DIR, fileKey.name);
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        found.push({ fileKey: fileKey.name, file: join(dir, file), content });
      } catch (error) {
        console.warn(`  ignoré : ${join(dir, file)} — ${error.message}`);
      }
    }
  }
  return found.sort((a, b) => b.file.localeCompare(a.file));
}

export function buildFigmaData({ outFile = OUT_FILE } = {}) {
  const snapshots = findSnapshots();
  const latest = (kind) => snapshots.find((s) => s.content?.kind === kind);

  const variablesSnapshot = latest('variables');
  const componentsSnapshot = latest('components');

  const codeTokens = allTokensFromFile();

  const variables = variablesSnapshot ? flattenVariables(variablesSnapshot.content) : [];
  const components = componentsSnapshot ? indexComponentBindings(componentsSnapshot.content) : {};
  const diff = variablesSnapshot
    ? diffAgainstTokens(variables, codeTokens)
    : { matched: [], missingInCode: [], missingInFigma: [], divergent: [] };

  const payload = {
    hasVariables: Boolean(variablesSnapshot),
    hasComponents: Boolean(componentsSnapshot),
    sources: {
      variables: variablesSnapshot
        ? { file: variablesSnapshot.file, fileKey: variablesSnapshot.fileKey }
        : null,
      components: componentsSnapshot
        ? { file: componentsSnapshot.file, fileKey: componentsSnapshot.fileKey }
        : null,
    },
    counts: {
      variables: variables.length,
      components: Object.keys(components).length,
      matched: diff.matched.length,
      missingInCode: diff.missingInCode.length,
      missingInFigma: diff.missingInFigma.length,
      divergent: diff.divergent.length,
    },
    variables,
    components,
    diff,
  };

  mkdirSync('data', { recursive: true });
  writeFileSync(outFile, JSON.stringify(payload, null, 2) + '\n');
  return payload;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const payload = buildFigmaData();

  if (!payload.hasVariables && !payload.hasComponents) {
    console.log('Aucun snapshot Figma dans figma-snapshots/.\n');
    console.log('Pour en produire un :');
    console.log('  1. Figma desktop -> Plugins -> Development -> Import plugin from manifest…');
    console.log('     puis choisir figma-plugin/manifest.json');
    console.log('  2. Ouvrir le fichier de tokens, lancer le plugin, « Exporter les variables »');
    console.log('  3. Déposer le JSON dans figma-snapshots/<fileKey>/<AAAA-MM-JJ>.json');
    console.log('  4. Relancer pnpm ds:figma\n');
    console.log(`écrit : ${OUT_FILE} (vide)`);
    process.exit(0);
  }

  const { counts } = payload;
  console.log(`${counts.variables} variables, ${counts.components} composants bindés\n`);
  console.log(`  conformes          ${counts.matched}`);
  console.log(`  absents du code    ${counts.missingInCode}`);
  console.log(`  absents de Figma   ${counts.missingInFigma}`);
  console.log(`  valeurs divergentes ${counts.divergent}`);
  console.log(`\nécrit : ${OUT_FILE}`);
}
