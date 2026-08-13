import { parseHex } from './color';
import { generatedRamps, solve, type PaletteSpec } from './generator';
import { paletteGrid } from './palettes';
import { normalize } from './token-search';

export type ShadeComparison = {
  token: string;
  family: string;
  rung: number;
  /** La valeur livrée par Figma. */
  real: string;
  /** La valeur que la règle produit. */
  solved: string;
  /** Le plus grand écart par canal sRGB. `0` = identique à l'octet près. */
  drift: number;
  /** Écart de la valeur réelle au barreau partagé, en L OKLCH. `null` si sur l'échelle. */
  ladderDelta: number | null;
};

export type PaletteProof = {
  comparisons: ShadeComparison[];
  /** Nuances que la règle retrouve exactement. */
  exact: number;
  /** Nuances que la règle retrouve à l'arrondi près (≤ 2 unités sRGB). */
  rounded: number;
  /** Nuances que la règle ne retrouve pas. */
  missed: ShadeComparison[];
  /** Nuances hors du barreau commun — les exceptions assumées. */
  offLadder: ShadeComparison[];
  /** Nuances livrées par Figma que la règle ne produit pas du tout. */
  unsolved: string[];
};

/** Au-delà, ce n'est plus de l'arrondi : les deux palettes disent autre chose. */
const ROUNDING = 2;

/**
 * Confronter la palette livrée à la règle qui prétend la produire.
 *
 * C'est ce qui fait tenir la page ensemble. Sans cette comparaison, on affiche deux
 * palettes côte à côte sans dire laquelle est vraie : celle que Figma livre, et celle
 * qu'un solveur invente. Avec elle, il n'y en a qu'une — la règle **retrouve** la
 * palette réelle, et l'écart mesuré dit jusqu'où on peut lui faire confiance.
 *
 * Deux axes, qu'il ne faut pas confondre :
 *
 * - **la fidélité** — la valeur résolue contre la valeur livrée, canal par canal ;
 * - **la régularité** — la valeur livrée contre le barreau commun.
 *
 * Une nuance peut être hors échelle et parfaitement fidèle : les ancres de marque le
 * sont par construction, la spec les place elle-même hors barreau. Confondre les deux
 * ferait passer une exception voulue pour une erreur de dérivation.
 */
export function paletteProof(spec?: PaletteSpec): PaletteProof {
  const real = new Map<string, { token: string; hex: string; ladderDelta: number | null }>();
  for (const ramp of paletteGrid().ramps) {
    for (const shade of ramp.shades) {
      real.set(`${normalize(ramp.name)}-${shade.rung}`, {
        token: shade.token,
        hex: shade.hex,
        ladderDelta: shade.ladderDelta,
      });
    }
  }

  const comparisons: ShadeComparison[] = [];
  const seen = new Set<string>();

  for (const ramp of generatedRamps(solve(spec))) {
    for (const rung of ramp.rungs) {
      const key = `${normalize(ramp.family)}-${rung.rung}`;
      const match = real.get(key);
      if (!match) continue;
      seen.add(key);

      comparisons.push({
        token: match.token,
        family: ramp.family,
        rung: rung.rung,
        real: match.hex,
        solved: rung.hex,
        drift: channelDrift(match.hex, rung.hex),
        ladderDelta: match.ladderDelta,
      });
    }
  }

  comparisons.sort(
    (a, b) => b.drift - a.drift || a.family.localeCompare(b.family) || a.rung - b.rung,
  );

  return {
    comparisons,
    exact: comparisons.filter((entry) => entry.drift === 0).length,
    rounded: comparisons.filter((entry) => entry.drift > 0 && entry.drift <= ROUNDING).length,
    missed: comparisons.filter((entry) => entry.drift > ROUNDING),
    offLadder: comparisons.filter((entry) => entry.ladderDelta !== null),
    unsolved: [...real.entries()]
      .filter(([key]) => !seen.has(key))
      .map(([, entry]) => entry.token)
      .sort(),
  };
}

/** Le plus grand écart par canal, en unités sRGB. */
function channelDrift(a: string, b: string): number {
  const left = parseHex(a);
  const right = parseHex(b);
  if (!left || !right) return Number.POSITIVE_INFINITY;
  return Math.max(
    Math.abs(left.r - right.r),
    Math.abs(left.g - right.g),
    Math.abs(left.b - right.b),
  );
}
