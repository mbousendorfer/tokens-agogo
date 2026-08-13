/**
 * Lecture et résolution de blocs `:root { --x: … }`.
 *
 * Sert au garde-fou de l'étape 1 : prouver que la feuille chaînée, une fois résolue,
 * donne exactement les mêmes valeurs que la feuille aplatie (ADR 004).
 *
 * La substitution imite fidèlement le navigateur : en CSS, une référence de custom
 * property est résolue au moment du calcul de la valeur, après la cascade — l'ordre
 * de déclaration dans le bloc n'a donc aucune importance.
 */

const DECLARATION = /^\s*(--[a-zA-Z0-9-]+)\s*:\s*(.+?);\s*$/;
const VAR_CALL = /var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([^)]*))?\)/g;

/** Parse un CSS en `Map<nom, valeur brute>`. La dernière déclaration gagne, comme la cascade. */
export function parseDeclarations(css) {
  const out = new Map();
  for (const line of css.split('\n')) {
    const m = line.match(DECLARATION);
    if (m) out.set(m[1], m[2].trim());
  }
  return out;
}

export class ResolutionError extends Error {}

/**
 * Résout une valeur en substituant récursivement ses `var()`.
 *
 * @throws {ResolutionError} référence inconnue sans fallback, ou cycle.
 */
export function resolveValue(name, declarations, seen = new Set()) {
  if (seen.has(name)) {
    throw new ResolutionError(`cycle : ${[...seen, name].join(' -> ')}`);
  }
  const raw = declarations.get(name);
  if (raw === undefined) {
    throw new ResolutionError(`référence inconnue : ${name}`);
  }

  const nextSeen = new Set(seen).add(name);

  return raw.replace(VAR_CALL, (_match, ref, fallback) => {
    if (!declarations.has(ref)) {
      if (fallback !== undefined) return fallback.trim();
      throw new ResolutionError(`${name} référence ${ref}, qui n'est pas défini`);
    }
    return resolveValue(ref, declarations, nextSeen);
  });
}

/** Résout toutes les déclarations. Les erreurs sont collectées, pas jetées. */
export function resolveAll(declarations) {
  const resolved = new Map();
  const errors = [];
  for (const name of declarations.keys()) {
    try {
      resolved.set(name, resolveValue(name, declarations));
    } catch (error) {
      errors.push({ name, message: error.message });
    }
  }
  return { resolved, errors };
}

/** Compare deux jeux de valeurs résolues. */
export function compare(expected, actual) {
  const missing = [...expected.keys()].filter((k) => !actual.has(k));
  const extra = [...actual.keys()].filter((k) => !expected.has(k));
  const different = [];

  for (const [name, value] of expected) {
    if (!actual.has(name)) continue;
    if (actual.get(name) !== value) {
      different.push({ name, expected: value, actual: actual.get(name) });
    }
  }

  return { missing, extra, different, ok: !missing.length && !extra.length && !different.length };
}
