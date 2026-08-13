import { describe, expect, it } from 'vitest';
import { parseHex, toOklch } from './color';
import {
  addRamp,
  addRung,
  normalizeName,
  removeRamp,
  removeRung,
  renameRamp,
  setShade,
  tokenNameFor,
  type EditableRamp,
} from './palette-edit';

const RAMPS: EditableRamp[] = [
  {
    name: 'grey',
    shades: [
      { rung: 100, hex: '#F9F9FA' },
      { rung: 500, hex: '#A6B1BE' },
      { rung: 800, hex: '#5E6E86' },
    ],
  },
  {
    name: 'orange',
    shades: [
      { rung: 100, hex: '#FFF5F2' },
      { rung: 500, hex: '#FF6726' },
      { rung: 800, hex: '#8E3104' },
    ],
  },
];

const LADDER = { 100: 0.978, 300: 0.88, 500: 0.74, 800: 0.51 };

describe('normalizeName', () => {
  it('met le nom dans la convention des tokens', () => {
    expect(normalizeName('Electric Blue')).toBe('electric-blue');
    expect(normalizeName('  Menthol!  ')).toBe('menthol');
  });
});

describe('renameRamp', () => {
  it('renomme sans toucher aux autres ramps', () => {
    const result = renameRamp(RAMPS, 'orange', 'Brand Orange');
    expect(result.map((r) => r.name)).toEqual(['grey', 'brand-orange']);
    expect(result[0]).toBe(RAMPS[0]);
  });
});

describe('addRamp', () => {
  const result = addRamp(RAMPS, {
    name: 'Teal',
    hex: '#11ABA6',
    anchorRung: 500,
    ladder: LADDER,
  });
  const teal = result.at(-1)!;

  it('crée un barreau par marche de l’échelle', () => {
    expect(teal.name).toBe('teal');
    expect(teal.shades.map((s) => s.rung)).toEqual([100, 300, 500, 800]);
  });

  it('garde la couleur saisie exactement sur son barreau d’ancrage', () => {
    expect(teal.shades.find((s) => s.rung === 500)!.hex).toBe('#11ABA6');
  });

  it('pose les autres barreaux sur la luminosité de l’échelle', () => {
    for (const shade of teal.shades) {
      if (shade.rung === 500) continue;
      const lightness = toOklch(parseHex(shade.hex)!).l;
      expect(Math.abs(lightness - LADDER[shade.rung as keyof typeof LADDER])).toBeLessThan(0.03);
    }
  });

  it('conserve la teinte de la couleur saisie', () => {
    const base = toOklch(parseHex('#11ABA6')!).h;
    for (const shade of teal.shades) {
      expect(Math.abs(toOklch(parseHex(shade.hex)!).h - base)).toBeLessThan(12);
    }
  });
});

describe('addRung', () => {
  it('ajoute la marche à toutes les ramps, parce qu’une échelle est commune', () => {
    const result = addRung(RAMPS, 300);
    for (const ramp of result) {
      expect(ramp.shades.map((s) => s.rung)).toEqual([100, 300, 500, 800]);
    }
  });

  it('interpole la valeur entre ses voisins', () => {
    const grey = addRung(RAMPS, 300)[0];
    const added = toOklch(parseHex(grey.shades[1].hex)!).l;
    const before = toOklch(parseHex('#F9F9FA')!).l;
    const after = toOklch(parseHex('#A6B1BE')!).l;
    expect(added).toBeLessThan(before);
    expect(added).toBeGreaterThan(after);
  });

  it('ne double pas un barreau déjà présent', () => {
    expect(addRung(RAMPS, 500)[0].shades).toHaveLength(3);
  });

  it('peut se limiter à une ramp, pour une échelle indépendante', () => {
    const result = addRung(RAMPS, 300, { only: 'grey' });
    expect(result[0].shades).toHaveLength(4);
    expect(result[1].shades).toHaveLength(3);
  });
});

describe('removeRung / removeRamp / setShade', () => {
  it('retire une marche partout', () => {
    for (const ramp of removeRung(RAMPS, 500)) {
      expect(ramp.shades.map((s) => s.rung)).toEqual([100, 800]);
    }
  });

  it('retire une couleur entière', () => {
    expect(removeRamp(RAMPS, 'orange').map((r) => r.name)).toEqual(['grey']);
  });

  it('change une valeur, en majuscules', () => {
    const result = setShade(RAMPS, 'orange', 500, '#ff0000');
    expect(result[1].shades.find((s) => s.rung === 500)!.hex).toBe('#FF0000');
  });
});

describe('tokenNameFor', () => {
  it('suit la convention du design system', () => {
    expect(tokenNameFor('electric-blue', 600)).toBe('--ref-color-electric-blue-600');
  });
});
