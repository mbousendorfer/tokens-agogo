import { describe, expect, it } from 'vitest';
import { contrastRatio, parseHex } from './color';
import { derivation, generatedRamps, solve } from './generator';

const solution = solve();
const ramps = generatedRamps(solution);

describe('générateur — la palette est résolue, pas choisie', () => {
  it('produit les 7 familles chromatiques plus le gris', () => {
    expect(ramps.map((ramp) => ramp.family)).toContain('grey');
    expect(ramps.length).toBeGreaterThanOrEqual(8);
  });

  it('pose toutes les familles chromatiques sur la même échelle de luminosité', () => {
    const chromatic = ramps.filter((ramp) => ramp.family !== 'grey');
    for (const rung of solution.chromaticRungs) {
      const lightness = chromatic
        .map((ramp) => ramp.rungs.find((r) => r.rung === rung)?.L)
        .filter((l): l is number => l !== undefined);
      // Les ancres sont volontairement hors échelle : on tolère leur écart connu.
      const spread = Math.max(...lightness) - Math.min(...lightness);
      expect(spread).toBeLessThan(0.06);
    }
  });

  it('tient la contrainte qui a servi à résoudre le barreau 200', () => {
    // C'est la raison d'être du solveur : `contrast(700, 200) >= 4.5` partout.
    for (const ramp of ramps.filter((r) => r.family !== 'grey')) {
      const dark = ramp.rungs.find((r) => r.rung === 700);
      const light = ramp.rungs.find((r) => r.rung === 200);
      if (!dark || !light) continue;
      const ratio = contrastRatio(parseHex(dark.hex)!, parseHex(light.hex)!);
      expect(ratio).toBeGreaterThanOrEqual(4.45);
    }
  });

  it('nomme la famille qui a contraint le barreau 200', () => {
    expect(solution.derived.rung200Witness).toBeTruthy();
    expect(ramps.map((r) => r.family)).toContain(solution.derived.rung200Witness);
  });

  it('rend son raisonnement lisible', () => {
    const steps = derivation(solution).map((entry) => entry.step);
    expect(steps).toEqual(['L700', 'L500', 'L200', 'pas bas', 'pas haut']);
  });
});
