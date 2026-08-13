import { describe, expect, it } from 'vitest';
import {
  apcaContrast,
  contrastRatio,
  fromOklch,
  parseHex,
  rampSteps,
  toHex,
  toOklch,
  wcagLevel,
} from './color';

const rgb = (hex: string) => parseHex(hex)!;

describe('parseHex / toHex', () => {
  it('lit les formes longues et courtes', () => {
    expect(parseHex('#FF6726')).toEqual({ r: 255, g: 103, b: 38 });
    expect(parseHex('fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('refuse ce qui n’est pas une couleur', () => {
    expect(parseHex('rgba(0,0,0,.5)')).toBeNull();
  });

  it('fait l’aller-retour', () => {
    expect(toHex(rgb('#FF6726'))).toBe('#FF6726');
  });
});

describe('contrastRatio', () => {
  it('donne 21:1 entre noir et blanc', () => {
    expect(contrastRatio(rgb('#000000'), rgb('#FFFFFF'))).toBeCloseTo(21, 5);
  });

  it('donne 1:1 pour une couleur avec elle-même', () => {
    expect(contrastRatio(rgb('#FF6726'), rgb('#FF6726'))).toBeCloseTo(1, 5);
  });

  it('est symétrique', () => {
    const a = contrastRatio(rgb('#344563'), rgb('#FFFFFF'));
    const b = contrastRatio(rgb('#FFFFFF'), rgb('#344563'));
    expect(a).toBeCloseTo(b, 10);
  });

  it('place #767676 sur blanc juste au-dessus du seuil AA', () => {
    // La valeur de référence connue pour ce gris est 4,54:1.
    expect(contrastRatio(rgb('#767676'), rgb('#FFFFFF'))).toBeCloseTo(4.54, 2);
  });
});

describe('wcagLevel', () => {
  it('classe selon les seuils', () => {
    expect(wcagLevel(21)).toBe('AAA');
    expect(wcagLevel(4.6)).toBe('AA');
    expect(wcagLevel(3.2)).toBe('AA large');
    expect(wcagLevel(2)).toBe('échec');
  });
});

describe('apcaContrast', () => {
  it('donne les valeurs de référence noir/blanc', () => {
    // Valeurs publiées par APCA-W3 pour les deux polarités extrêmes.
    expect(apcaContrast(rgb('#000000'), rgb('#FFFFFF'))).toBeCloseTo(106.04, 1);
    expect(apcaContrast(rgb('#FFFFFF'), rgb('#000000'))).toBeCloseTo(-107.88, 1);
  });

  it('n’est pas symétrique, contrairement au ratio WCAG', () => {
    const normal = apcaContrast(rgb('#344563'), rgb('#FFFFFF'));
    const reverse = apcaContrast(rgb('#FFFFFF'), rgb('#344563'));
    expect(Math.abs(normal)).not.toBeCloseTo(Math.abs(reverse), 1);
  });

  it('renvoie 0 quand les deux couleurs sont identiques', () => {
    expect(apcaContrast(rgb('#FF6726'), rgb('#FF6726'))).toBe(0);
  });
});

describe('toOklch / fromOklch', () => {
  it('donne une luminosité maximale et une chroma nulle pour le blanc', () => {
    const white = toOklch(rgb('#FFFFFF'));
    expect(white.l).toBeCloseTo(1, 3);
    expect(white.c).toBeCloseTo(0, 3);
  });

  it('donne une luminosité nulle pour le noir', () => {
    expect(toOklch(rgb('#000000')).l).toBeCloseTo(0, 3);
  });

  it('fait l’aller-retour sans dérive visible', () => {
    for (const hex of ['#FF6726', '#178DFE', '#344563', '#11B43A']) {
      expect(toHex(fromOklch(toOklch(rgb(hex))))).toBe(hex);
    }
  });
});

describe('rampSteps', () => {
  it('signale une marche irrégulière', () => {
    // Une ramp dont l'avant-dernier pas est beaucoup plus grand que les autres.
    const steps = rampSteps(['#FFFFFF', '#EEEEEE', '#DDDDDD', '#333333']);
    expect(steps).toHaveLength(3);
    expect(steps.at(-1)!.deviation).toBeGreaterThan(1);
  });

  it('donne des écarts proches de zéro sur une ramp régulière', () => {
    const steps = rampSteps(['#FFFFFF', '#BFBFBF', '#7F7F7F', '#3F3F3F']);
    for (const { deviation } of steps) expect(Math.abs(deviation)).toBeLessThan(0.35);
  });
});
