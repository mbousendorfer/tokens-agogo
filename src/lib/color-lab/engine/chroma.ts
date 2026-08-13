/**
 * Chroma assignment for the chromatic families.
 *
 * Two regimes, and the boundary between them is the single correction that was
 * applied to the "everything at the gamut" instruction:
 *
 *  - Dark end (500-800): push to `factor x Cmax`. This is what makes the brand
 *    colours saturated.
 *  - Light end (100-400): a shared ABSOLUTE ceiling. Necessary because the
 *    sRGB gamut balloons in light greens and cyans — unguarded, green-300 came
 *    out at C 0.258 while green-500 sits at 0.203, i.e. a 300 more saturated
 *    than its own 500, in fluorescent green. That is a defect, not a style.
 *
 * The envelope is absolute rather than a fraction of C500 because a
 * proportional envelope penalises hues whose 500 is narrow: it turned yellow
 * into tan (#e1cba5, #d1ab69). Absolute is what gives the light end its
 * cross-family harmony, to within 1.14-1.30x.
 */

import { cmaxFor } from '../color/cmax';
import type { ChromaticSpec, FamilySpec } from './types';

export interface ChromaResult {
  C: number;
  /** True when the sRGB boundary, not the envelope or the factor, decided. */
  gamutLimited: boolean;
}

/**
 * Back-solve a family's gamut fraction from an anchor.
 *
 * Purple is not "set soft" by choice: #6554c0 simply sits at 57.1% of its own
 * gamut, and matching the anchor forces every purple rung 500-800 to that
 * fraction. Deriving it here rather than hardcoding 0.571 means the number
 * stays correct if the anchor ever moves.
 */
export function deriveChromaFactor(anchorL: number, anchorC: number, hue: number): number {
  const cmax = cmaxFor(anchorL, hue);
  if (cmax <= 0) return 0;
  return anchorC / cmax;
}

/** Chroma for a dark-end rung (500-800). */
export function darkEndChroma(L: number, family: FamilySpec, spec: ChromaticSpec): ChromaResult {
  const factor = family.chromaFactor ?? spec.chromaFactor;
  const cmax = cmaxFor(L, family.hue);
  return { C: factor * cmax, gamutLimited: factor >= 1 };
}

/**
 * Chroma for a light-end rung (100-400).
 *
 * `c500` caps the result so a tint can never out-saturate its own brand rung.
 * That is what keeps menthol-400 in line: the envelope's 0.136 is above
 * menthol's own C500, so the cap, not the envelope, decides.
 *
 * Note the purple factor deliberately does NOT apply here. Applying it would
 * make purple-100/200 roughly 3x less chromatic than their neighbours and
 * effectively neutral, breaking the light end's shared harmony.
 */
export function lightEndChroma(
  L: number,
  envelopeIndex: 0 | 1 | 2 | 3,
  family: FamilySpec,
  spec: ChromaticSpec,
  c500: number,
): ChromaResult {
  const envelope = spec.lightEnvelope[envelopeIndex];
  const cmax = cmaxFor(L, family.hue) * spec.chromaFactor;
  const capped = Math.min(envelope, c500);
  if (cmax < capped) return { C: cmax, gamutLimited: true };
  return { C: capped, gamutLimited: false };
}
