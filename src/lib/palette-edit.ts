import { fromOklch, parseHex, toHex, toOklch } from './color';

export type EditableShade = { rung: number; hex: string };
export type EditableRamp = { name: string; shades: EditableShade[] };

/**
 * L'édition de palette, en fonctions pures.
 *
 * Toutes les opérations demandées dans le cadrage : renommer une couleur, en ajouter
 * une, ajouter ou retirer un barreau, changer une valeur. Elles vivent hors de React
 * pour être testables — une palette est un objet de données avant d'être un écran.
 */

/** Renomme une ramp. Le nom fait partie du contrat des tokens : c'est une opération lourde. */
export function renameRamp(ramps: EditableRamp[], from: string, to: string): EditableRamp[] {
  const clean = normalizeName(to);
  return ramps.map((ramp) => (ramp.name === from ? { ...ramp, name: clean } : ramp));
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/**
 * Ajoute une couleur en la posant sur une échelle existante.
 *
 * On ne demande qu'une teinte de base et le barreau qu'elle occupe : le reste est
 * déduit en gardant la teinte et la chroma, et en adoptant la luminosité de chaque
 * barreau de l'échelle. C'est ce qui fait qu'une nouvelle couleur s'accorde d'emblée
 * au reste de la palette au lieu de flotter à côté.
 */
export function addRamp(
  ramps: EditableRamp[],
  {
    name,
    hex,
    anchorRung,
    ladder,
  }: { name: string; hex: string; anchorRung: number; ladder: Record<number, number> },
): EditableRamp[] {
  const rgb = parseHex(hex);
  if (!rgb) return ramps;

  const base = toOklch(rgb);
  const rungs = Object.keys(ladder)
    .map(Number)
    .sort((a, b) => a - b);

  const shades = rungs.map((rung) => ({
    rung,
    hex:
      rung === anchorRung
        ? hex.toUpperCase()
        : toHex(fromOklch({ l: ladder[rung], c: chromaAt(base, ladder[rung]), h: base.h })),
  }));

  return [...ramps, { name: normalizeName(name), shades }];
}

/**
 * La chroma tenable à une luminosité donnée.
 *
 * Aux extrémités, une chroma constante sort du gamut sRGB et se fait écrêter — le
 * barreau 100 vire au gris sale, le 800 se sature n'importe comment. On la réduit
 * donc vers les extrêmes, proportionnellement à la distance au milieu de l'échelle.
 */
function chromaAt(base: { c: number; h: number }, lightness: number): number {
  const falloff = 1 - Math.abs(lightness - 0.55) / 0.55;
  return base.c * Math.max(0.15, falloff);
}

/**
 * Ajoute un barreau à toutes les ramps qui suivent l'échelle commune.
 *
 * Un barreau n'appartient pas à une couleur : c'est une marche de l'échelle. L'ajouter
 * à une seule ramp casserait l'alignement que la grille sert justement à montrer.
 */
export function addRung(
  ramps: EditableRamp[],
  rung: number,
  { only }: { only?: string } = {},
): EditableRamp[] {
  return ramps.map((ramp) => {
    if (only && ramp.name !== only) return ramp;
    if (ramp.shades.some((shade) => shade.rung === rung)) return ramp;

    const sorted = [...ramp.shades].sort((a, b) => a.rung - b.rung);
    const before = [...sorted].reverse().find((shade) => shade.rung < rung);
    const after = sorted.find((shade) => shade.rung > rung);

    // Sans voisin des deux côtés, on prolonge la ramp plutôt que d'interpoler.
    const hex = interpolate(
      before?.hex,
      after?.hex,
      before && after ? ratio(before.rung, after.rung, rung) : 0.5,
    );

    return { ...ramp, shades: [...ramp.shades, { rung, hex }].sort((a, b) => a.rung - b.rung) };
  });
}

function ratio(from: number, to: number, at: number): number {
  return (at - from) / (to - from);
}

/** Interpole en OKLCH, pas en sRGB : c'est la seule façon d'obtenir une marche régulière. */
function interpolate(from: string | undefined, to: string | undefined, t: number): string {
  const a = from ? parseHex(from) : null;
  const b = to ? parseHex(to) : null;
  if (!a && !b) return '#808080';
  if (!a) return to!.toUpperCase();
  if (!b) return from!.toUpperCase();

  const start = toOklch(a);
  const end = toOklch(b);
  return toHex(
    fromOklch({
      l: start.l + (end.l - start.l) * t,
      c: start.c + (end.c - start.c) * t,
      // On passe par le plus court chemin sur la roue, sinon un rouge traverse le vert.
      h: start.h + shortestHueDelta(start.h, end.h) * t,
    }),
  );
}

function shortestHueDelta(from: number, to: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return delta;
}

export function removeRung(ramps: EditableRamp[], rung: number, { only }: { only?: string } = {}) {
  return ramps.map((ramp) =>
    only && ramp.name !== only
      ? ramp
      : { ...ramp, shades: ramp.shades.filter((shade) => shade.rung !== rung) },
  );
}

export function setShade(ramps: EditableRamp[], name: string, rung: number, hex: string) {
  return ramps.map((ramp) =>
    ramp.name === name
      ? {
          ...ramp,
          shades: ramp.shades.map((shade) =>
            shade.rung === rung ? { ...shade, hex: hex.toUpperCase() } : shade,
          ),
        }
      : ramp,
  );
}

export function removeRamp(ramps: EditableRamp[], name: string): EditableRamp[] {
  return ramps.filter((ramp) => ramp.name !== name);
}

/** Le nom CSS d'une nuance, dans la convention du design system. */
export function tokenNameFor(ramp: string, rung: number): string {
  return `--ref-color-${ramp}-${rung}`;
}
