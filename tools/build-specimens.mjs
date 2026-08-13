/**
 * Extrait les spécimens de preview depuis les stories CSS-UI du design system.
 *
 * On n'écrit pas de markup à la main : `apps/web/src/stories/css-ui/` contient déjà
 * le vrai markup `.ap-*`, maintenu par l'équipe, avec ses variantes et ses valeurs par
 * défaut. On l'extrait plutôt que de le répliquer (ADR 006).
 *
 * Les fichiers de stories sont du TypeScript dont les types sont purement statiques :
 * Node 22 les importe nativement après strip des annotations. Pas de parseur maison.
 *
 * Certaines stories déclarent de vrais composants Angular (`@Component`) et ne sont
 * donc pas importables ici. Elles sont sautées et **listées** : un périmètre tronqué
 * en silence se lit comme une couverture complète.
 *
 * Usage :
 *   node tools/build-specimens.mjs [--ds-root=...] [--ds-ref=master]
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { listFiles, readFileAtRef, refSha, resolveDsRef, resolveDsRoot } from './ds-repo.mjs';

const STORIES_PATH = 'apps/web/src/stories/css-ui';
const CACHE_DIR = '.cache/ds-stories';
const OUT_FILE = 'data/specimens.json';

/** `CSS UI/Display/Status (CSS)` -> `{ group: 'Display', component: 'Status' }`. */
function parseTitle(title) {
  const parts = String(title || '').split('/');
  const leaf = (parts.at(-1) || '').replace(/\s*\(CSS\)\s*$/i, '').trim();
  return { group: parts.length > 2 ? parts[1] : 'Autres', component: leaf || 'Sans titre' };
}

function slug(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/** Ne garde des argTypes que ce qui est sérialisable et utile à l'affichage. */
function serializeArgTypes(argTypes = {}) {
  const out = {};
  for (const [name, spec] of Object.entries(argTypes)) {
    if (!spec || typeof spec !== 'object' || spec.table?.disable) continue;
    const control = typeof spec.control === 'string' ? spec.control : spec.control?.type;
    out[name] = {
      ...(control ? { control } : {}),
      ...(Array.isArray(spec.options) ? { options: spec.options } : {}),
      ...(spec.description ? { description: spec.description } : {}),
    };
  }
  return out;
}

/** Le HTML d'une story, en fusionnant les args du meta et ceux de la story. */
function renderStory(meta, story) {
  const render = story.render || meta.render;
  if (typeof render !== 'function') return null;

  const args = { ...meta.args, ...story.args };
  const output = render(args, { args });
  const html = typeof output === 'string' ? output : output?.template;
  if (typeof html !== 'string') return null;

  return { args, html: html.replace(/\n\s*\n/g, '\n').trim() };
}

export async function buildSpecimens({ dsRoot, dsRef, outFile = OUT_FILE }) {
  rmSync(CACHE_DIR, { recursive: true, force: true });
  mkdirSync(CACHE_DIR, { recursive: true });

  // Sans ce marqueur, Node reparse chaque story en cherchant du CommonJS et avertit.
  writeFileSync(join(CACHE_DIR, 'package.json'), '{ "type": "module" }\n');

  const files = listFiles(dsRoot, dsRef, STORIES_PATH).filter((f) => f.endsWith('.stories.ts'));
  for (const file of files) {
    writeFileSync(join(CACHE_DIR, basename(file)), readFileAtRef(dsRoot, dsRef, file));
  }

  const specimens = [];
  const skipped = [];

  for (const file of files) {
    const name = basename(file);
    let mod;
    try {
      mod = await import(pathToFileURL(resolve(CACHE_DIR, name)).href);
    } catch (error) {
      const angular = /Invalid or unexpected token|Cannot find (module|package)/.test(
        error.message,
      );
      skipped.push({
        file,
        reason: angular
          ? 'story Angular : déclare un composant, pas du markup CSS-UI'
          : error.message.split('\n')[0],
      });
      continue;
    }

    const meta = mod.default;
    if (!meta) {
      skipped.push({ file, reason: 'pas de meta exporté par défaut' });
      continue;
    }

    const { group, component } = parseTitle(meta.title);
    const argTypes = serializeArgTypes(meta.argTypes);
    let produced = 0;

    for (const [storyName, story] of Object.entries(mod)) {
      if (storyName === 'default' || !story || typeof story !== 'object') continue;

      const rendered = renderStory(meta, story);
      if (!rendered) continue;

      // Les stories CSS-UI suffixent leur nom par `CSS` pour cohabiter avec les
      // stories Angular du même composant. Le suffixe n'apporte rien ici.
      const label = storyName.replace(/CSS$/, '') || 'Default';

      specimens.push({
        id: `${slug(component)}--${slug(label)}`,
        component,
        group,
        story: label,
        title: meta.title,
        sourceFile: file,
        args: rendered.args,
        argTypes,
        html: rendered.html,
      });
      produced++;
    }

    if (!produced) skipped.push({ file, reason: 'aucune story rendue' });
  }

  specimens.sort((a, b) => a.id.localeCompare(b.id));

  const payload = {
    source: { ref: dsRef, sha: refSha(dsRoot, dsRef), storiesPath: STORIES_PATH },
    counts: { files: files.length, specimens: specimens.length, skipped: skipped.length },
    skipped: skipped.sort((a, b) => a.file.localeCompare(b.file)),
    specimens,
  };

  mkdirSync('data', { recursive: true });
  writeFileSync(outFile, JSON.stringify(payload, null, 2) + '\n');

  return payload;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dsRoot = resolveDsRoot();
  const dsRef = resolveDsRef();
  const { counts, skipped } = await buildSpecimens({ dsRoot, dsRef });

  console.log(`${counts.specimens} spécimens extraits de ${counts.files} fichiers de stories`);
  if (skipped.length) {
    console.log(`\n${skipped.length} fichier(s) sauté(s) :`);
    for (const { file, reason } of skipped) console.log(`  ${basename(file)} — ${reason}`);
  }
  console.log(`\nécrit : ${OUT_FILE}`);
}
