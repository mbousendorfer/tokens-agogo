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

/** La teinte d'un hex, en degrés OKLCh — le seul paramètre libre d'une famille. */
export function hueOfHex(hex: string): number {
  return hexToOklch(hex).H;
}

/**
 * Ajoute une famille.
 *
 * Une famille se réduit à **une teinte**. Le reste se dérive : l'échelle de
 * luminosité est commune, la chroma suit le facteur global, et chaque nuance tombe
 * là où la contrainte de contraste la met.
 *
 * L'ancre est donc facultative, et les deux cas répondent à deux questions
 * différentes :
 *
 * - **avec ancre** — « j'ai cette couleur, je la veux telle quelle sur ce barreau ».
 *   Elle est épinglée à l'octet près, et se retrouve hors de l'échelle commune si sa
 *   clarté ne correspond pas à celle du barreau. C'est un choix, pas un accident.
 * - **sans ancre** — « je veux cette teinte ». Les huit nuances sont résolues, donc
 *   toutes sur l'échelle, et aucune ne vaut exactement la couleur de départ.
 *
 * Exiger une ancre forçait la première réponse à une question qui était souvent la
 * seconde, et livrait une famille dont un barreau ment sur l'échelle.
 */
export function addFamily(
  spec: PaletteSpec,
  {
    name,
    hue,
    anchor,
  }: { name: string; hue: number; anchor?: { rung: number; hex: string } | null },
): PaletteSpec {
  const id = normalizeId(name);
  if (!id || spec.chromatic.families.some((family) => family.id === id)) return spec;

  const family: FamilySpec = {
    id,
    label: name.trim(),
    hue,
    // `null` = suivre le facteur global. Seule une famille dont l'ancre l'impose
    // devrait le surcharger, et ce facteur se dérive alors, il ne se choisit pas.
    chromaFactor: null,
    anchors: anchor ? { [anchor.rung]: anchor.hex.toUpperCase() } : {},
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
