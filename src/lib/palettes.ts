import { apcaContrast, contrastRatio, parseHex, rampSteps, toOklch, wcagLevel } from './color';
import { usageCount } from './declarations';
import { allTokens } from './tokens';

export type Rung = {
  token: string;
  rung: string;
  hex: string;
  lightness: number;
  chroma: number;
  usages: number;
  /** Écart relatif du pas qui mène à ce rung, par rapport au pas moyen de la ramp. */
  stepDeviation: number | null;
  onWhite: { ratio: number; level: string; lc: number };
};

export type Ramp = {
  name: string;
  rungs: Rung[];
  /** Une ramp est irrégulière dès qu'un pas s'écarte de plus de 60 % de la moyenne. */
  irregular: boolean;
};

const HEX = /^#[0-9a-f]{6}$/i;
const WHITE = { r: 255, g: 255, b: 255 };

/**
 * Regroupe les primitives de couleur en ramps.
 *
 * Le nom d'une ramp est tout ce qui précède le dernier segment numérique :
 * `--ref-color-electric-blue-100` -> `electric-blue`, rung `100`. Les couleurs sans
 * rung (les réseaux sociaux, `white`) sont rassemblées à part.
 */
export function palettes(): { ramps: Ramp[]; singles: Rung[] } {
  const buckets = new Map<string, { rung: string; token: string; hex: string }[]>();
  const singles: Rung[] = [];

  for (const token of allTokens()) {
    if (token.tier !== 'ref' || !token.value || !HEX.test(token.value)) continue;

    const match = token.name.match(/^--ref-color-(.+)-(\d+)$/);
    if (match) {
      const [, name, rung] = match;
      buckets.set(name, [
        ...(buckets.get(name) ?? []),
        { rung, token: token.name, hex: token.value },
      ]);
    } else if (token.name.startsWith('--ref-color-')) {
      singles.push(makeRung(token.name, '', token.value, null));
    }
  }

  const ramps: Ramp[] = [];
  for (const [name, entries] of buckets) {
    // Les deux palettes du design system numérotent à l'envers l'une de l'autre :
    // on trie par luminosité décroissante pour que la lecture reste la même.
    const sorted = entries.sort((a, b) => {
      const la = toOklch(parseHex(a.hex)!).l;
      const lb = toOklch(parseHex(b.hex)!).l;
      return lb - la;
    });

    const steps = rampSteps(sorted.map((entry) => entry.hex));
    const rungs = sorted.map((entry, index) =>
      makeRung(entry.token, entry.rung, entry.hex, index === 0 ? null : steps[index - 1].deviation),
    );

    ramps.push({
      name,
      rungs,
      irregular: steps.some((step) => Math.abs(step.deviation) > 0.6),
    });
  }

  return {
    ramps: ramps.sort((a, b) => b.rungs.length - a.rungs.length || a.name.localeCompare(b.name)),
    singles: singles.sort((a, b) => a.token.localeCompare(b.token)),
  };
}

function makeRung(token: string, rung: string, hex: string, stepDeviation: number | null): Rung {
  const rgb = parseHex(hex)!;
  const oklch = toOklch(rgb);
  const ratio = contrastRatio(rgb, WHITE);

  return {
    token,
    rung,
    hex,
    lightness: oklch.l,
    chroma: oklch.c,
    usages: usageCount(token),
    stepDeviation,
    onWhite: {
      ratio,
      level: wcagLevel(ratio),
      lc: apcaContrast(rgb, WHITE),
    },
  };
}

export type ContrastPair = {
  text: string;
  background: string;
  textHex: string;
  backgroundHex: string;
  ratio: number;
  level: string;
  lc: number;
};

/**
 * Les paires texte/surface du système qui échouent en WCAG AA.
 *
 * On ne teste que ce que le design system associe réellement — les tokens de texte
 * contre les tokens de surface — plutôt que le produit cartésien de la palette, qui
 * remonterait des centaines de paires que personne n'affiche jamais.
 */
export function failingPairs(): ContrastPair[] {
  const tokens = allTokens().filter((t) => t.value && HEX.test(t.value));
  const texts = tokens.filter((t) => /--(sys|comp)-.*(text|color|content)/.test(t.name));
  const surfaces = tokens.filter((t) => /--(sys|comp)-.*(surface|background|bg)/.test(t.name));

  const pairs: ContrastPair[] = [];
  for (const text of texts) {
    for (const background of surfaces) {
      const ratio = contrastRatio(parseHex(text.value!)!, parseHex(background.value!)!);
      if (ratio >= 4.5) continue;
      pairs.push({
        text: text.name,
        background: background.name,
        textHex: text.value!,
        backgroundHex: background.value!,
        ratio,
        level: wcagLevel(ratio),
        lc: apcaContrast(parseHex(text.value!)!, parseHex(background.value!)!),
      });
    }
  }

  return pairs.sort((a, b) => a.ratio - b.ratio);
}
