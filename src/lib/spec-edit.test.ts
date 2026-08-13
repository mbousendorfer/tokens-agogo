import { describe, expect, it } from 'vitest';
import { contrastRatio, parseHex } from './color';
import { BASELINE_SPEC, generatedRamps, solve } from './generator';
import {
  addFamily,
  hueOfHex,
  normalizeId,
  removeFamily,
  renameFamily,
  setAnchor,
  setExtraDarkRungs,
} from './spec-edit';

describe('normalizeId', () => {
  it('produit un identifiant de token', () => {
    expect(normalizeId('Electric Blue')).toBe('electricBlue');
    expect(normalizeId('  Teal !')).toBe('teal');
  });
});

describe('addFamily — la couleur ajoutée est résolue, pas posée à côté', () => {
  const spec = addFamily(BASELINE_SPEC, {
    name: 'Teal',
    hue: hueOfHex('#11ABA6'),
    anchor: { rung: 500, hex: '#11ABA6' },
  });
  const ramps = generatedRamps(solve(spec));
  const teal = ramps.find((ramp) => ramp.family === 'teal');

  it('entre dans la spec avec les autres', () => {
    expect(spec.chromatic.families).toHaveLength(BASELINE_SPEC.chromatic.families.length + 1);
    expect(teal).toBeDefined();
  });

  it('reçoit tous les barreaux de l’échelle commune', () => {
    const reference = ramps.find((ramp) => ramp.family === 'orange')!;
    expect(teal!.rungs.map((r) => r.rung)).toEqual(reference.rungs.map((r) => r.rung));
  });

  it('se pose sur la même échelle de luminosité', () => {
    const reference = ramps.find((ramp) => ramp.family === 'orange')!;
    for (const rung of teal!.rungs) {
      const twin = reference.rungs.find((r) => r.rung === rung.rung)!;
      expect(Math.abs(rung.L - twin.L)).toBeLessThan(0.06);
    }
  });

  it('tient la contrainte de contraste qui fonde le solveur', () => {
    const dark = teal!.rungs.find((r) => r.rung === 700)!;
    const light = teal!.rungs.find((r) => r.rung === 200)!;
    expect(contrastRatio(parseHex(dark.hex)!, parseHex(light.hex)!)).toBeGreaterThanOrEqual(4.45);
  });

  it('garde exactement la couleur épinglée sur son barreau', () => {
    expect(teal!.rungs.find((r) => r.rung === 500)!.hex.toUpperCase()).toBe('#11ABA6');
  });

  it('refuse un doublon', () => {
    expect(addFamily(spec, { name: 'Teal', hue: 0 })).toBe(spec);
  });
});

describe('addFamily sans ancre — une famille se réduit à une teinte', () => {
  const hue = hueOfHex('#C2185B');
  const spec = addFamily(BASELINE_SPEC, { name: 'Magenta', hue });
  const magenta = generatedRamps(solve(spec)).find((ramp) => ramp.family === 'magenta')!;

  it('résout les huit nuances sans qu’aucune couleur soit imposée', () => {
    expect(spec.chromatic.families.at(-1)!.anchors).toEqual({});
    expect(magenta.rungs).toHaveLength(8);
  });

  it('les pose toutes sur l’échelle commune', () => {
    const reference = generatedRamps(solve(spec)).find((ramp) => ramp.family === 'orange')!;
    for (const rung of magenta.rungs) {
      const twin = reference.rungs.find((r) => r.rung === rung.rung)!;
      // Sans ancre, plus rien ne tire une nuance hors de son barreau : l'écart
      // restant tient à la chroma, pas à la clarté.
      expect(Math.abs(rung.L - twin.L)).toBeLessThan(0.035);
    }
  });

  it('garde la teinte demandée', () => {
    expect(spec.chromatic.families.at(-1)!.hue).toBeCloseTo(hue, 6);
  });
});

describe('renameFamily', () => {
  it('suit le renommage jusque dans les références de dérivation', () => {
    const spec = renameFamily(BASELINE_SPEC, 'purple', 'Violet');
    expect(spec.chromatic.families.some((f) => f.id === 'violet')).toBe(true);
    expect(spec.chromatic.rung700From.startsWith('violet.')).toBe(true);
    // La palette reste résoluble : la dérivation ne pointe pas dans le vide.
    expect(() => solve(spec)).not.toThrow();
  });
});

describe('setAnchor / setExtraDarkRungs / removeFamily', () => {
  it('épingler une couleur déplace la nuance résolue', () => {
    const spec = setAnchor(BASELINE_SPEC, 'green', 600, '#0A8F2C');
    const green = generatedRamps(solve(spec)).find((r) => r.family === 'green')!;
    expect(green.rungs.find((r) => r.rung === 600)!.hex.toUpperCase()).toBe('#0A8F2C');
  });

  it('étendre l’extrémité sombre ajoute des barreaux à toutes les familles', () => {
    const base = generatedRamps(solve(BASELINE_SPEC))[1].rungs.length;
    const spec = setExtraDarkRungs(BASELINE_SPEC, 2);
    expect(generatedRamps(solve(spec))[1].rungs.length).toBe(base + 2);
  });

  it('retirer une famille la retire de la solution', () => {
    const spec = removeFamily(BASELINE_SPEC, 'menthol');
    expect(generatedRamps(solve(spec)).some((r) => r.family === 'menthol')).toBe(false);
  });
});
