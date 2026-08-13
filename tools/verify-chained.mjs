/**
 * Garde-fou de l'étape 1 : prouver que le build chaîné est fidèle.
 *
 * Deux assertions, dans cet ordre :
 *
 *   1. **Byte-match** — notre build aplati doit être identique, octet pour octet, au
 *      CSS commité dans le design system. Si ce n'est pas le cas, nos transforms ne
 *      reproduisent pas ceux du design system, et tout ce qu'on génère est suspect.
 *
 *   2. **Équivalence après résolution** — la feuille chaînée, une fois ses `var()`
 *      résolus, doit donner exactement les mêmes valeurs que la feuille aplatie.
 *      Un écart signale un cas limite d'`outputReferences` apparu en amont.
 *
 * Ce script a besoin du repo design system : il ne tourne pas en CI, seulement en local.
 * La logique pure qu'il utilise, elle, est testée dans `css-vars.test.mjs`.
 *
 * Usage :
 *   node tools/verify-chained.mjs [--ds-root=...] [--ds-ref=master]
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildChainedTokens } from './build-chained-tokens.mjs';
import { compare, parseDeclarations, resolveAll } from './css-vars.mjs';
import { readFileAtRef, resolveDsRef, resolveDsRoot } from './ds-repo.mjs';

const OUT_DIR = 'public/ds';

const PLATFORMS = [
  { name: 'desktop', committed: 'libs/ui-theme/assets/desktop_variables.css' },
  { name: 'mobile', committed: 'libs/ui-theme/assets/mobile_variables.css' },
];

function checkPlatform({ name, committed }, dsRoot, dsRef) {
  const failures = [];

  const flat = readFileSync(join(OUT_DIR, `${name}.flat.css`), 'utf8');
  const chained = readFileSync(join(OUT_DIR, `${name}.chained.css`), 'utf8');
  const reference = readFileAtRef(dsRoot, dsRef, committed);

  // 1. byte-match
  if (flat !== reference) {
    failures.push(`${name} : notre build aplati diffère du CSS commité dans le design system`);
  }

  // 2. équivalence après résolution
  const flatDecls = parseDeclarations(flat);
  const chainedDecls = parseDeclarations(chained);

  const { resolved, errors } = resolveAll(chainedDecls);
  for (const { name: token, message } of errors) {
    failures.push(`${name} : ${token} — ${message}`);
  }

  const { missing, extra, different } = compare(flatDecls, resolved);
  for (const token of missing) failures.push(`${name} : ${token} absent de la feuille chaînée`);
  for (const token of extra) failures.push(`${name} : ${token} en trop dans la feuille chaînée`);
  for (const d of different) {
    failures.push(`${name} : ${d.name} — aplati ${d.expected}, chaîné résout en ${d.actual}`);
  }

  const chainedCount = [...chainedDecls.values()].filter((v) => v.includes('var(')).length;

  return { failures, tokenCount: flatDecls.size, chainedCount };
}

const dsRoot = resolveDsRoot();
const dsRef = resolveDsRef();

const { sha } = buildChainedTokens({ dsRoot, dsRef });
console.log(`design system : ${dsRoot} @ ${dsRef} (${sha})\n`);

let allFailures = [];
for (const platform of PLATFORMS) {
  const { failures, tokenCount, chainedCount } = checkPlatform(platform, dsRoot, dsRef);
  const status = failures.length ? '✗' : '✓';
  console.log(
    `${status} ${platform.name.padEnd(8)} ${tokenCount} tokens, ${chainedCount} chaînés en var()`,
  );
  allFailures = allFailures.concat(failures);
}

if (allFailures.length) {
  console.error(`\n${allFailures.length} écart(s) :\n`);
  for (const failure of allFailures.slice(0, 40)) console.error(`  ${failure}`);
  if (allFailures.length > 40) console.error(`  … et ${allFailures.length - 40} autres`);
  process.exit(1);
}

console.log(
  '\nLe build chaîné est fidèle : byte-match sur l’aplati, équivalence après résolution.',
);
