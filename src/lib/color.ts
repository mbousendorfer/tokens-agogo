/**
 * Outils colorimétriques : OKLCH, contraste WCAG 2.x, et APCA.
 *
 * Ils servent à **éditer une palette** et à contrôler son accessibilité. Ils ne servent
 * jamais à choisir un token : la migration se pilote par l'intention, pas par la
 * ressemblance des couleurs (ADR 003).
 */

export type Rgb = { r: number; g: number; b: number };
export type Oklch = { l: number; c: number; h: number };

export function parseHex(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const value = match[1];
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** sRGB -> linéaire, la transformation qui précède tout calcul de luminance. */
function toLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function fromLinear(value: number): number {
  const channel = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return channel * 255;
}

// ---------------------------------------------------------------- WCAG 2.x

export function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

/** Le ratio WCAG 2.x, de 1:1 à 21:1. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

export type WcagLevel = 'AAA' | 'AA' | 'AA large' | 'échec';

/** Le niveau atteint. `large` vaut pour du texte ≥ 18,66 px gras ou ≥ 24 px. */
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA large';
  return 'échec';
}

// ---------------------------------------------------------------- APCA

const APCA = {
  trc: 2.4,
  r: 0.2126729,
  g: 0.7151522,
  b: 0.072175,
  normBg: 0.56,
  normTxt: 0.57,
  revTxt: 0.62,
  revBg: 0.65,
  blackThreshold: 0.022,
  blackClamp: 1.414,
  loClip: 0.1,
  deltaYmin: 0.0005,
  scale: 1.14,
  offset: 0.027,
};

function apcaLuminance({ r, g, b }: Rgb): number {
  return (
    APCA.r * (r / 255) ** APCA.trc + APCA.g * (g / 255) ** APCA.trc + APCA.b * (b / 255) ** APCA.trc
  );
}

/**
 * Le contraste APCA (Lc), entre -108 et +106.
 *
 * Le signe porte la polarité : positif pour du texte sombre sur fond clair, négatif
 * pour l'inverse. Contrairement au ratio WCAG, APCA n'est pas symétrique — c'est le
 * point : l'œil ne perçoit pas les deux sens de la même façon.
 */
export function apcaContrast(text: Rgb, background: Rgb): number {
  const clamp = (y: number) =>
    y > APCA.blackThreshold ? y : y + (APCA.blackThreshold - y) ** APCA.blackClamp;

  const textY = clamp(apcaLuminance(text));
  const bgY = clamp(apcaLuminance(background));

  if (Math.abs(bgY - textY) < APCA.deltaYmin) return 0;

  if (bgY > textY) {
    const sapc = (bgY ** APCA.normBg - textY ** APCA.normTxt) * APCA.scale;
    return (sapc < APCA.loClip ? 0 : sapc - APCA.offset) * 100;
  }

  const sapc = (bgY ** APCA.revBg - textY ** APCA.revTxt) * APCA.scale;
  return (sapc > -APCA.loClip ? 0 : sapc + APCA.offset) * 100;
}

/** Ce qu'un Lc autorise, d'après les seuils APCA. */
export function apcaUsage(lc: number): string {
  const absolute = Math.abs(lc);
  if (absolute >= 90) return 'tout texte';
  if (absolute >= 75) return 'texte courant ≥ 15 px';
  if (absolute >= 60) return 'texte ≥ 18 px';
  if (absolute >= 45) return 'gros titres, éléments non textuels';
  if (absolute >= 30) return 'éléments décoratifs seulement';
  return 'insuffisant';
}

// ---------------------------------------------------------------- OKLCH

/** sRGB -> Oklab -> OKLCH. `l` est dans [0,1], `h` en degrés. */
export function toOklch(rgb: Rgb): Oklch {
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const chroma = Math.sqrt(okA * okA + okB * okB);
  const hue = chroma < 1e-6 ? 0 : ((Math.atan2(okB, okA) * 180) / Math.PI + 360) % 360;

  return { l: okL, c: chroma, h: hue };
}

export function fromOklch({ l, c, h }: Oklch): Rgb {
  const radians = (h * Math.PI) / 180;
  const okA = c * Math.cos(radians);
  const okB = c * Math.sin(radians);

  const lCube = (l + 0.3963377774 * okA + 0.2158037573 * okB) ** 3;
  const mCube = (l - 0.1055613458 * okA - 0.0638541728 * okB) ** 3;
  const sCube = (l - 0.0894841775 * okA - 1.291485548 * okB) ** 3;

  return {
    r: fromLinear(4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube),
    g: fromLinear(-1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube),
    b: fromLinear(-0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube),
  };
}

/**
 * Les écarts de luminosité entre rungs consécutifs d'une ramp.
 *
 * Une ramp régulière a des écarts proches. Les valeurs aberrantes signalent une marche
 * trop haute ou trop plate — ce que l'œil voit et que le hex ne dit pas.
 */
export function rampSteps(hexes: string[]): { step: number; deviation: number }[] {
  const lightness = hexes.map((hex) => parseHex(hex)).map((rgb) => (rgb ? toOklch(rgb).l : null));

  const steps: number[] = [];
  for (let i = 1; i < lightness.length; i++) {
    const previous = lightness[i - 1];
    const current = lightness[i];
    steps.push(previous != null && current != null ? Math.abs(previous - current) : 0);
  }

  const mean = steps.reduce((sum, step) => sum + step, 0) / (steps.length || 1);
  return steps.map((step) => ({ step, deviation: mean ? (step - mean) / mean : 0 }));
}
