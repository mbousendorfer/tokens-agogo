/**
 * Transforme un export du plugin Figma en tokens Style Dictionary, et confronte le
 * résultat à ce que le design system contient déjà.
 *
 * C'est ce script qui remplace la transcription manuelle, dont les fichiers du design
 * system gardent la trace : « Transcribed from the Figma collection `System Tokens`…
 * Read 2026-08-05 ».
 *
 * Toute jointure se fait **par les noms**, jamais par les `VariableID` (ADR 008).
 */

/** `color/surface/interactive/hovered` -> `['color','surface','interactive','hovered']`. */
export function pathFromFigmaName(name) {
  return String(name)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/**
 * Reproduit le transform `name/cti/kebab` de Style Dictionary : chemin joint par des
 * tirets, camelCase converti en kebab. `electricBlue` -> `electric-blue`.
 */
export function tokenToCssName(path) {
  return (
    '--' +
    path
      .map((segment) =>
        segment
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .replace(/[\s_]+/g, '-')
          .toLowerCase(),
      )
      .join('-')
  );
}

/** Le nom CSS d'une variable Figma, sous un tier donné. */
export function cssNameFor(figmaName, tier) {
  return tokenToCssName([tier, ...pathFromFigmaName(figmaName)]);
}

/**
 * Aplatit un export de variables en une entrée par variable et par mode.
 *
 * Un mode est une dimension à part entière : `defaultModeId` donne le mode principal,
 * les autres sont conservés pour plus tard (thème, densité) plutôt que d'être écrasés.
 */
export function flattenVariables(snapshot) {
  const collections = new Map(snapshot.collections.map((c) => [c.id, c]));
  const out = [];

  for (const variable of snapshot.variables) {
    const collection = collections.get(variable.collectionId);
    if (!collection) continue;

    const modeName = (modeId) =>
      collection.modes.find((mode) => mode.modeId === modeId)?.name ?? modeId;

    for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
      out.push({
        collection: collection.name,
        mode: modeName(modeId),
        isDefaultMode: modeId === collection.defaultModeId,
        name: variable.name,
        path: pathFromFigmaName(variable.name),
        type: variable.resolvedType,
        scopes: variable.scopes ?? [],
        description: variable.description || null,
        aliasOf:
          value && typeof value === 'object' && '$aliasName' in value ? value.$aliasName : null,
        value: normalizeValue(value),
      });
    }
  }

  return out;
}

function normalizeValue(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  if ('$hex' in value) {
    return value.$alpha !== undefined ? { hex: value.$hex, alpha: value.$alpha } : value.$hex;
  }
  if ('$aliasName' in value) return null;
  return value;
}

/**
 * Confronte les variables Figma aux tokens du design system.
 *
 * Trois catégories, et pas de quatrième : ce qui manque au code, ce qui manque à
 * Figma, et ce qui diverge. Le reste est conforme.
 */
export function diffAgainstTokens(figmaVariables, codeTokens, { tier = 'sys' } = {}) {
  const byCssName = new Map(codeTokens.map((token) => [token.name, token]));

  const missingInCode = [];
  const divergent = [];
  const matched = [];

  const expected = new Set();

  for (const variable of figmaVariables.filter((v) => v.isDefaultMode)) {
    const cssName = cssNameFor(variable.name, tier);
    expected.add(cssName);

    const token = byCssName.get(cssName);
    if (!token) {
      missingInCode.push({ figmaName: variable.name, cssName, value: variable.value });
      continue;
    }

    const figmaValue = typeof variable.value === 'string' ? variable.value.toUpperCase() : null;
    const codeValue = token.value ? token.value.toUpperCase() : null;

    if (figmaValue && codeValue && figmaValue !== codeValue) {
      divergent.push({ figmaName: variable.name, cssName, figma: figmaValue, code: codeValue });
    } else {
      matched.push({ figmaName: variable.name, cssName });
    }
  }

  const missingInFigma = codeTokens
    .filter((token) => token.tier === tier && !expected.has(token.name))
    .map((token) => ({ cssName: token.name, value: token.value }));

  return { matched, missingInCode, missingInFigma, divergent };
}

/**
 * Indexe les bindings composants par composant, variante et calque.
 *
 * C'est la grille que la vue d'alignement confronte au code : variante x partie x
 * propriété -> variable prescrite.
 */
export function indexComponentBindings(snapshot, { tier = 'sys' } = {}) {
  const index = {};

  for (const component of snapshot.components ?? []) {
    const variants = {};

    for (const variant of component.variants ?? []) {
      const parts = {};
      for (const part of variant.parts ?? []) {
        const properties = {};
        for (const [property, names] of Object.entries(part.bindings ?? {})) {
          const list = Array.isArray(names) ? names : [names];
          properties[property] = list.map((name) => ({
            figmaName: name,
            cssName: cssNameFor(name, tier),
          }));
        }
        if (Object.keys(properties).length) parts[part.part] = properties;
      }
      if (Object.keys(parts).length) {
        variants[variant.name] = { properties: variant.properties ?? null, parts };
      }
    }

    if (Object.keys(variants).length) {
      index[component.name] = { key: component.key, page: component.page, variants };
    }
  }

  return index;
}
