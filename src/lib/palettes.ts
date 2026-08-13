import { apcaContrast, contrastRatio, parseHex, toOklch, wcagLevel } from './color';
import { usageCount } from './declarations';
import { targetTokens } from './figma-tokens';

export type Shade = {
  token: string;
  rung: number;
  hex: string;
  lightness: number;
  chroma: number;
  hue: number;
  usages: number;
  /** Écart de luminosité au barreau partagé, en L OKLCH. `null` si la ramp est indépendante. */
  ladderDelta: number | null;
  onWhite: { ratio: number; level: string; lc: number };
  onBlack: { ratio: number; level: string; lc: number };
  /** La couleur de texte qui se lit le mieux sur cette pastille. */
  ink: '#000000' | '#FFFFFF';
};

export type Ramp = {
  name: string;
  label: string;
  shades: Shade[];
  /** Une ramp suit-elle l'échelle commune, ou a-t-elle la sienne ? */
  scale: 'partagée' | 'indépendante';
  /** Le plus grand écart de la ramp à l'échelle commune. */
  maxDelta: number;
};

export type PaletteGridData = {
  rungs: number[];
  ramps: Ramp[];
  /** La luminosité de référence de chaque barreau, médiane des ramps qui la suivent. */
  ladder: Record<number, number>;
  singles: { token: string; label: string; hex: string; usages: number; ink: string }[];
};

const HEX = /^#[0-9a-f]{6}$/i;
const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

/** Au-delà de ce seuil, l'œil voit la marche : on l'affiche. */
const DELTA_THRESHOLD = 0.008;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * La palette de référence, en grille : une ramp par ligne, un barreau par colonne.
 *
 * L'intérêt d'aligner les barreaux, c'est qu'une palette bien construite pose toutes
 * ses ramps sur la **même échelle de luminosité**. On calcule donc cette échelle
 * commune — la médiane des L par barreau — et on affiche l'écart de chaque nuance.
 * Une ramp qui dévie se voit alors immédiatement, colonne par colonne.
 */
export function paletteGrid(): PaletteGridData {
  const buckets = new Map<string, { rung: number; token: string; hex: string }[]>();
  const singles: PaletteGridData['singles'] = [];

  for (const token of targetTokens()) {
    if (token.tier !== 'ref' || !token.value || !HEX.test(token.value)) continue;

    const match = token.name.match(/^--ref-color-(.+)-(\d+)$/);
    if (match) {
      const [, name, rung] = match;
      buckets.set(name, [
        ...(buckets.get(name) ?? []),
        { rung: Number(rung), token: token.name, hex: token.value },
      ]);
    } else if (token.name.startsWith('--ref-color-')) {
      singles.push({
        token: token.name,
        label: token.figmaName.split('/').at(-1) ?? token.name,
        hex: token.value,
        usages: usageCount(token.name),
        ink: inkFor(token.value),
      });
    }
  }

  // Les couleurs à un seul barreau (data, réseaux sociaux) ne forment pas une ramp.
  for (const [name, entries] of [...buckets]) {
    if (entries.length < 3) {
      buckets.delete(name);
      for (const entry of entries) {
        singles.push({
          token: entry.token,
          label: `${name}-${entry.rung}`,
          hex: entry.hex,
          usages: usageCount(entry.token),
          ink: inkFor(entry.hex),
        });
      }
    }
  }

  const rungs = [...new Set([...buckets.values()].flat().map((entry) => entry.rung))].sort(
    (a, b) => a - b,
  );

  // L'échelle commune est celle du jeu de barreaux le plus fréquent : les ramps qui
  // ont plus de barreaux (le gris, ici) ont la leur, et ne doivent pas la tirer.
  const signatures = [...buckets.values()].map((entries) =>
    entries
      .map((e) => e.rung)
      .sort((a, b) => a - b)
      .join(','),
  );
  const modal = signatures
    .map((signature) => ({ signature, count: signatures.filter((s) => s === signature).length }))
    .sort((a, b) => b.count - a.count)[0]?.signature;

  const ladder: Record<number, number> = {};
  for (const rung of rungs) {
    const values = [...buckets.entries()]
      .filter(
        ([, entries]) =>
          entries
            .map((e) => e.rung)
            .sort((a, b) => a - b)
            .join(',') === modal,
      )
      .flatMap(([, entries]) => entries.filter((e) => e.rung === rung))
      .map((entry) => toOklch(parseHex(entry.hex)!).l);
    if (values.length) ladder[rung] = median(values);
  }

  const ramps: Ramp[] = [...buckets.entries()].map(([name, entries]) => {
    const signature = entries
      .map((e) => e.rung)
      .sort((a, b) => a - b)
      .join(',');
    const shared = signature === modal;

    const shades = entries
      .sort((a, b) => a.rung - b.rung)
      .map((entry) => makeShade(entry.token, entry.rung, entry.hex, shared ? ladder : null));

    return {
      name,
      label: name.replace(/-/g, ' '),
      shades,
      scale: shared ? 'partagée' : 'indépendante',
      maxDelta: Math.max(0, ...shades.map((s) => Math.abs(s.ladderDelta ?? 0))),
    };
  });

  // Les ramps les plus fournies d'abord ; le gris ouvre, c'est la colonne vertébrale.
  ramps.sort(
    (a, b) =>
      Number(b.name === 'grey') - Number(a.name === 'grey') ||
      b.shades.length - a.shades.length ||
      a.name.localeCompare(b.name),
  );

  return { rungs, ramps, ladder, singles: singles.sort((a, b) => b.usages - a.usages) };
}

function inkFor(hex: string): '#000000' | '#FFFFFF' {
  const rgb = parseHex(hex)!;
  return contrastRatio(rgb, WHITE) > contrastRatio(rgb, BLACK) ? '#FFFFFF' : '#000000';
}

function makeShade(
  token: string,
  rung: number,
  hex: string,
  ladder: Record<number, number> | null,
): Shade {
  const rgb = parseHex(hex)!;
  const oklch = toOklch(rgb);
  const white = contrastRatio(rgb, WHITE);
  const black = contrastRatio(rgb, BLACK);
  const reference = ladder?.[rung];

  return {
    token,
    rung,
    hex,
    lightness: oklch.l,
    chroma: oklch.c,
    hue: oklch.h,
    usages: usageCount(token),
    ladderDelta:
      reference !== undefined && Math.abs(oklch.l - reference) > DELTA_THRESHOLD
        ? oklch.l - reference
        : null,
    onWhite: { ratio: white, level: wcagLevel(white), lc: apcaContrast(rgb, WHITE) },
    onBlack: { ratio: black, level: wcagLevel(black), lc: apcaContrast(rgb, BLACK) },
    ink: inkFor(hex),
  };
}
