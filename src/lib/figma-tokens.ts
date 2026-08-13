import data from '../../data/figma-tokens.json';

/**
 * Les tokens **cibles** : ceux définis dans Figma, extraits via le MCP et commités.
 *
 * C'est dans cette liste que le sélecteur propose. Les tokens du design system
 * (`data/tokens.json`) décrivent l'existant ; ceux-ci décrivent où l'on va.
 */
export type FigmaToken = {
  figmaName: string;
  name: string;
  tier: 'ref' | 'sys' | 'comp';
  collection: string;
  aliasOf: string | null;
  aliasOfFigma: string | null;
  value: string | null;
  /** Valeur dans le mode `Accessible` de Figma, quand elle diffère du mode par défaut. */
  accessibleValue: string | null;
  scopes: string[];
};

export type FigmaTokenData = {
  source: { file: string; fileKey: string; via: string };
  counts: { total: number; byTier: Record<string, number> };
  tokens: FigmaToken[];
};

export const figmaTokenData = data as FigmaTokenData;

export function targetTokens(): FigmaToken[] {
  return figmaTokenData.tokens;
}

/**
 * Les scopes Figma disent à quoi une variable est destinée. Croisés avec la propriété
 * CSS d'une déclaration, ils écartent les candidats hors sujet — un token scopé
 * `TEXT_FILL` n'a rien à faire sur un `background-color`.
 */
const SCOPE_BY_PROPERTY: { pattern: RegExp; scopes: string[] }[] = [
  { pattern: /^color$/, scopes: ['TEXT_FILL', 'ALL_FILLS'] },
  { pattern: /background/, scopes: ['FRAME_FILL', 'SHAPE_FILL', 'ALL_FILLS'] },
  { pattern: /^border(-(top|right|bottom|left))?-color$|^outline/, scopes: ['STROKE_COLOR'] },
  { pattern: /^border-radius$/, scopes: ['CORNER_RADIUS'] },
  { pattern: /^(padding|margin|gap|inset)/, scopes: ['GAP'] },
  { pattern: /^(width|height|min-|max-)/, scopes: ['WIDTH_HEIGHT'] },
  { pattern: /^font-size$/, scopes: ['FONT_SIZE'] },
  { pattern: /^font-weight$/, scopes: ['FONT_WEIGHT'] },
  { pattern: /^font-family$/, scopes: ['FONT_FAMILY'] },
  { pattern: /^line-height$/, scopes: ['LINE_HEIGHT'] },
];

/** Le token est-il déclaré compatible avec cette propriété CSS, d'après ses scopes ? */
export function scopeMatches(token: FigmaToken, property: string | null): boolean {
  if (!property) return true;
  if (token.scopes.includes('ALL_SCOPES')) return true;

  const entry = SCOPE_BY_PROPERTY.find(({ pattern }) => pattern.test(property));
  if (!entry) return true;
  return entry.scopes.some((scope) => token.scopes.includes(scope));
}
