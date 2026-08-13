import { hexToOklch } from './color-lab/color/oklab';
import type { FamilySpec, PaletteSpec } from './color-lab/engine/types';

/**
 * L'édition de la **spec**, pas d'une liste de couleurs.
 *
 * C'est la différence qui compte : une couleur ajoutée ici entre dans la dérivation.
 * Elle est résolue sous les mêmes contraintes que les autres — même échelle de
 * luminosité, même contrainte de contraste sur le barreau 200 — au lieu d'être
 * interpolée à côté d'elles.
 *
 * Une famille se réduit à trois faits : sa teinte, ce qu'elle épingle, et la part du
 * gamut où son extrémité sombre se pose. Tout le reste est calculé.
 */

export function normalizeId(name: string): string {
  const clean = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();
  const [first, ...rest] = clean.split(' ');
  return [first?.toLowerCase() ?? '', ...rest.map((w) => w[0].toUpperCase() + w.slice(1))].join('');
}

/**
 * Ajoute une famille à partir d'une couleur et du barreau qu'elle occupe.
 *
 * La teinte vient du hex : c'est le seul paramètre libre d'une famille. L'ancre
 * épingle la couleur donnée sur son barreau, et le solveur en déduit les autres.
 */
export function addFamily(
  spec: PaletteSpec,
  { name, hex, anchorRung }: { name: string; hex: string; anchorRung: number },
): PaletteSpec {
  const id = normalizeId(name);
  if (!id || spec.chromatic.families.some((family) => family.id === id)) return spec;

  const family: FamilySpec = {
    id,
    label: name.trim(),
    hue: hexToOklch(hex).H,
    // `null` = suivre le facteur global. Seule une famille dont l'ancre l'impose
    // devrait le surcharger, et ce facteur se dérive alors, il ne se choisit pas.
    chromaFactor: null,
    anchors: { [anchorRung]: hex.toUpperCase() },
  };

  return {
    ...spec,
    chromatic: { ...spec.chromatic, families: [...spec.chromatic.families, family] },
  };
}

export function removeFamily(spec: PaletteSpec, id: string): PaletteSpec {
  return {
    ...spec,
    chromatic: {
      ...spec.chromatic,
      families: spec.chromatic.families.filter((family) => family.id !== id),
    },
  };
}

/** Renomme une famille. L'identifiant sert de préfixe de token : c'est un contrat. */
export function renameFamily(spec: PaletteSpec, id: string, label: string): PaletteSpec {
  const nextId = normalizeId(label);
  if (!nextId) return spec;

  return {
    ...spec,
    chromatic: {
      ...spec.chromatic,
      families: spec.chromatic.families.map((family) =>
        family.id === id ? { ...family, id: nextId, label: label.trim() } : family,
      ),
      // Les références au barreau d'ancrage suivent le renommage, sinon la
      // dérivation pointerait dans le vide.
      rung700From: spec.chromatic.rung700From.replace(new RegExp(`^${id}\\.`), `${nextId}.`),
      rung500From: spec.chromatic.rung500From.map((ref) =>
        ref.replace(new RegExp(`^${id}\\.`), `${nextId}.`),
      ) as [string, string],
    },
  };
}

/** Épingle une couleur sur un barreau, ou retire l'épingle si `hex` est nul. */
export function setAnchor(
  spec: PaletteSpec,
  id: string,
  rung: number,
  hex: string | null,
): PaletteSpec {
  return {
    ...spec,
    chromatic: {
      ...spec.chromatic,
      families: spec.chromatic.families.map((family) => {
        if (family.id !== id) return family;
        const anchors = { ...family.anchors };
        if (hex) anchors[rung] = hex.toUpperCase();
        else delete anchors[rung];
        return { ...family, anchors };
      }),
    },
  };
}

/**
 * Étend ou raccourcit l'échelle par son extrémité sombre.
 *
 * C'est la seule extension que les contraintes tolèrent : l'intervalle 500→700 n'est
 * pas subdivisible, insérer un barreau dedans remonterait le 700 et casserait le
 * contraste du vert. Le moteur le documente, l'app ne le propose donc pas.
 */
export function setExtraDarkRungs(spec: PaletteSpec, count: number): PaletteSpec {
  return {
    ...spec,
    chromatic: { ...spec.chromatic, extraDarkRungs: Math.max(0, Math.floor(count)) },
  };
}
