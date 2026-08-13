/**
 * Agorapulse Token Export — plugin Figma de tokens-agogo.
 *
 * Exporte deux choses, pas une (ADR 002) :
 *
 *   1. **Les variables** — collections, modes, alias, `scopes`, `codeSyntax`. Elles
 *      génèreront les layers `ref` et `sys` en JSON Style Dictionary.
 *   2. **Les bindings composants** — pour chaque component set, chaque variante,
 *      chaque calque : quelle variable est liée à quelle propriété. C'est ce qui
 *      porte l'intention, et ce qu'aucun export tiers ne produit.
 *
 * Le plugin reste bête : il dumpe, il ne raisonne pas. `valuesByMode` est exporté
 * **non résolu**, et toute la réconciliation vit dans un script Node testable.
 *
 * `networkAccess: none` : il ne peut prouvablement rien exfiltrer.
 *
 * Installation : Figma desktop -> Plugins -> Development -> Import plugin from manifest.
 */

const SCHEMA = 'agorapulse/figma-export/1';

figma.showUI(__html__, { width: 460, height: 320 });

function rgbToHex({ r, g, b }) {
  const channel = (value) =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * Encode une valeur de variable.
 *
 * Un alias porte **aussi le nom** de sa cible : les `VariableID` ne survivent pas à
 * une duplication de fichier, les noms si. Toute jointure en aval se fait sur le nom
 * (ADR 008).
 */
function encodeValue(value, nameById) {
  if (value && value.type === 'VARIABLE_ALIAS') {
    return { $alias: value.id, $aliasName: nameById.get(value.id) || null };
  }
  if (value && typeof value === 'object' && 'r' in value) {
    const hex = rgbToHex(value);
    return value.a !== undefined && value.a < 1 ? { $hex: hex, $alpha: value.a } : { $hex: hex };
  }
  return value;
}

async function exportVariables() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();
  const nameById = new Map(variables.map((v) => [v.id, v.name]));

  return {
    collections: collections.map((collection) => ({
      id: collection.id,
      key: collection.key,
      name: collection.name,
      defaultModeId: collection.defaultModeId,
      modes: collection.modes.map((mode) => ({ modeId: mode.modeId, name: mode.name })),
      variableIds: collection.variableIds,
    })),
    variables: variables
      .map((variable) => ({
        id: variable.id,
        key: variable.key,
        // Chemin slash-délimité : `color/surface/interactive/hovered`.
        name: variable.name,
        collectionId: variable.variableCollectionId,
        resolvedType: variable.resolvedType,
        description: variable.description,
        scopes: variable.scopes,
        codeSyntax: variable.codeSyntax,
        hiddenFromPublishing: variable.hiddenFromPublishing,
        valuesByMode: Object.keys(variable.valuesByMode).reduce((acc, modeId) => {
          acc[modeId] = encodeValue(variable.valuesByMode[modeId], nameById);
          return acc;
        }, {}),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** Les variables liées à un nœud, propriété par propriété. */
function bindingsOf(node, nameById) {
  const bound = node.boundVariables;
  if (!bound) return null;

  const out = {};
  for (const property of Object.keys(bound)) {
    const value = bound[property];
    // `fills`/`strokes` sont des tableaux, le reste est un alias unique.
    const aliases = Array.isArray(value) ? value : [value];
    const names = aliases
      .map((alias) => alias && nameById.get(alias.id))
      .filter((name) => Boolean(name));
    if (names.length) out[property] = names.length === 1 ? names[0] : names;
  }
  return Object.keys(out).length ? out : null;
}

/** Descend un nœud et remonte tous les bindings trouvés, avec leur chemin de calques. */
function walkBindings(node, nameById, path = [], out = []) {
  const here = path.concat(node.name);
  const bindings = bindingsOf(node, nameById);
  if (bindings) out.push({ part: here.slice(1).join(' / ') || node.name, bindings });

  if ('children' in node) {
    for (const child of node.children) walkBindings(child, nameById, here, out);
  }
  return out;
}

async function exportComponentSpecs() {
  const variables = await figma.variables.getLocalVariablesAsync();
  const nameById = new Map(variables.map((v) => [v.id, v.name]));

  // Les variables du fichier de tokens sont distantes ici : les résoudre par leur
  // clé publiée permet de nommer un binding même si la variable vient d'une librairie.
  const components = [];

  for (const page of figma.root.children) {
    await page.loadAsync();
    for (const node of page.children) {
      if (node.type !== 'COMPONENT_SET' && node.type !== 'COMPONENT') continue;

      const variants =
        node.type === 'COMPONENT_SET'
          ? node.children.map((variant) => ({
              name: variant.name,
              properties: variant.variantProperties || null,
              parts: walkBindings(variant, nameById),
            }))
          : [{ name: 'default', properties: null, parts: walkBindings(node, nameById) }];

      components.push({
        id: node.id,
        key: node.key || null,
        name: node.name,
        page: page.name,
        description: node.description || null,
        variants: variants.filter((variant) => variant.parts.length),
      });
    }
  }

  return components.filter((component) => component.variants.length);
}

figma.ui.onmessage = async (message) => {
  try {
    if (message.type === 'export-variables') {
      const payload = await exportVariables();
      figma.ui.postMessage({
        type: 'result',
        name: 'variables',
        json: JSON.stringify(
          {
            $schema: SCHEMA,
            kind: 'variables',
            fileName: figma.root.name,
            ...payload,
          },
          null,
          2,
        ),
        summary: `${payload.variables.length} variables, ${payload.collections.length} collection(s)`,
      });
      return;
    }

    if (message.type === 'export-components') {
      const components = await exportComponentSpecs();
      const bindings = components.reduce(
        (total, component) =>
          total + component.variants.reduce((sum, variant) => sum + variant.parts.length, 0),
        0,
      );
      figma.ui.postMessage({
        type: 'result',
        name: 'components',
        json: JSON.stringify(
          { $schema: SCHEMA, kind: 'components', fileName: figma.root.name, components },
          null,
          2,
        ),
        summary: `${components.length} composants, ${bindings} calque(s) bindé(s)`,
      });
    }
  } catch (error) {
    figma.ui.postMessage({ type: 'error', message: String((error && error.message) || error) });
  }
};
