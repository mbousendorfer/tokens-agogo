import baseline from '../../spec/palette.baseline.json';
import { solvePalette } from './color-lab/engine/solve';
import type { PaletteSolution, PaletteSpec, SolvedRung } from './color-lab/engine/types';

/**
 * Le générateur de palette, repris d'`agorapulse-color-lab`.
 *
 * La différence avec ce que j'avais écrit tient en un mot : ici les nuances sont
 * **résolues**, pas choisies. L'échelle se dérive d'ancres réelles — `L700` vient de
 * la luminosité de l'ancre purple, `L500` de la moyenne des deux ancres de marque —
 * et le barreau 200 est trouvé par bissection, comme le plus clair qui tienne encore
 * `contrast(700, 200) ≥ cible` sur **toutes** les familles. La contrainte
 * d'accessibilité pilote l'échelle, au lieu d'être constatée après coup.
 *
 * Ma version interpolait entre des valeurs existantes avec un affaiblissement de
 * chroma inventé : elle ne garantissait rien.
 *
 * La spec (`spec/palette.baseline.json`) est la seule vérité écrite à la main ; tout
 * le reste en découle.
 */
export const BASELINE_SPEC = baseline as unknown as PaletteSpec;

export type { PaletteSolution, PaletteSpec, SolvedRung };

export function solve(spec: PaletteSpec = BASELINE_SPEC): PaletteSolution {
  return solvePalette(spec);
}

export type GeneratedRamp = {
  family: string;
  rungs: { rung: number; hex: string; L: number; C: number; H: number }[];
};

/** La solution mise à la forme de la grille : une famille par ligne, un barreau par colonne. */
export function generatedRamps(solution: PaletteSolution): GeneratedRamp[] {
  const byFamily = new Map<string, SolvedRung[]>();
  for (const rung of solution.rungs.values()) {
    byFamily.set(rung.family, [...(byFamily.get(rung.family) ?? []), rung]);
  }

  return [...byFamily.entries()]
    .map(([family, rungs]) => ({
      family,
      rungs: rungs
        .sort((a, b) => a.rung - b.rung)
        .map(({ rung, hex, L, C, H }) => ({ rung, hex, L, C, H })),
    }))
    .sort(
      (a, b) =>
        Number(b.family === 'grey') - Number(a.family === 'grey') ||
        a.family.localeCompare(b.family),
    );
}

/**
 * Ce que le moteur a déduit, et sur quoi il s'est appuyé.
 *
 * Une palette générée sans son raisonnement n'est pas relisible : on affiche donc la
 * famille qui a contraint le barreau 200 et la marge qu'il lui reste.
 */
export function derivation(solution: PaletteSolution) {
  const { derived } = solution;
  return [
    {
      step: 'L700',
      value: derived.L700.toFixed(4),
      why: 'la luminosité de l’ancre purple — le fait qui commande toute l’échelle',
    },
    {
      step: 'L500',
      value: derived.L500.toFixed(4),
      why: 'la moyenne des deux ancres de marque, qui tombent donc toutes deux hors échelle',
    },
    {
      step: 'L200',
      value: derived.L200.toFixed(4),
      why: `résolu, pas choisi : le plus clair qui tienne le contraste 700/200 — ${derived.rung200Witness} est la famille contraignante`,
    },
    {
      step: 'pas bas',
      value: derived.lowStep.toFixed(4),
      why: '(L500 − L700) divisé — donne 600 et 800',
    },
    {
      step: 'pas haut',
      value: derived.highStep.toFixed(4),
      why: '(L200 − L500) divisé — donne 300 et 400',
    },
  ];
}
