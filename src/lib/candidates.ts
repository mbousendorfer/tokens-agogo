import { parseHex } from './color';
import { scopeMatches, targetTokens, type FigmaToken } from './figma-tokens';

export type Candidate = {
  name: string;
  tier: string;
  group: string;
  /** Ce que Figma affiche : le token pointé, ou la valeur littérale avec son unité. */
  display: string | null;
  value: string | null;
  /** Valeur dans le mode `Accessible` de Figma, quand elle diffère. */
  accessibleValue: string | null;
  /** Ce token rend-il exactement ce que la déclaration rend aujourd'hui ? */
  sameValue: boolean;
  relevance: number;
};

/**
 * Le rôle qu'une propriété CSS suggère, pour trier les candidats.
 *
 * C'est un **ordre de lecture**, jamais une décision. Une surface d'erreur, une surface
 * interactive et une surface par défaut partagent toutes `background-color` : la
 * propriété rétrécit la liste, elle ne choisit pas (ADR 003, ADR 011).
 */
const ROLE_HINTS: { pattern: RegExp; roles: string[] }[] = [
  { pattern: /^color$/, roles: ['text', 'content'] },
  { pattern: /background/, roles: ['surface', 'background'] },
  { pattern: /^border(-(top|right|bottom|left))?-color$|^outline/, roles: ['border'] },
  { pattern: /^border-radius$/, roles: ['radius'] },
  { pattern: /^fill$|^stroke$/, roles: ['icon'] },
  { pattern: /^(padding|margin|gap|inset|top|right|bottom|left)/, roles: ['spacing'] },
  { pattern: /^(width|height|min-|max-)/, roles: ['height', 'size'] },
  { pattern: /^font-size$/, roles: ['font-size', 'size'] },
  { pattern: /^font-weight$/, roles: ['font-weight', 'weight'] },
  { pattern: /^font-family$/, roles: ['font-family'] },
  { pattern: /^line-height$/, roles: ['line-height', 'height'] },
  { pattern: /^transition|^animation/, roles: ['motion', 'timing', 'easing'] },
];

function rolesFor(property: string | null): string[] {
  if (!property) return [];
  for (const { pattern, roles } of ROLE_HINTS) if (pattern.test(property)) return roles;
  return [];
}

/** Une couleur ne remplace pas un espacement : on compare le genre des valeurs. */
function kindOf(value: string | null): string | null {
  if (!value) return null;
  if (parseHex(value) || /^(rgba?|hsla?)\(/.test(value)) return 'color';
  if (/^-?[\d.]+(px|rem|em|%)?$/.test(value)) return 'dimension';
  return 'other';
}

/**
 * Les tokens proposables pour une déclaration.
 *
 * Les candidats viennent des **tokens Figma** — la cible — pas des tokens actuels du
 * design system. On filtre sur le genre de valeur et sur les `scopes` déclarés dans
 * Figma, puis on trie : sémantique d'abord, puis pertinence pour la propriété CSS.
 */
export function candidatesFor({
  property,
  currentValue,
}: {
  property: string | null;
  currentValue: string | null;
}): Candidate[] {
  const roles = rolesFor(property);
  const currentKind = kindOf(currentValue);
  const tierOrder = ['sys', 'comp', 'ref'];

  const scored = targetTokens()
    .filter((token: FigmaToken) => {
      if (!scopeMatches(token, property)) return false;
      if (!currentKind) return true;
      const kind = kindOf(token.value);
      return kind === null || kind === currentKind;
    })
    .map((token) => {
      const segments = token.name.slice(2).split('-');
      const relevance = roles.reduce(
        (score, role, index) =>
          segments.includes(role) || token.name.includes(`-${role}-`)
            ? score + (roles.length - index)
            : score,
        0,
      );

      return {
        name: token.name,
        tier: token.tier,
        group: token.group,
        display: token.display,
        value: token.value,
        accessibleValue: token.accessibleValue,
        sameValue: Boolean(
          currentValue && token.value && token.value.toLowerCase() === currentValue.toLowerCase(),
        ),
        relevance,
      };
    });

  /*
    Le rendu identique passe devant la pertinence.

    Un token qui rend **exactement** ce que la déclaration rend aujourd'hui rend le
    remplacement invisible à l'écran : c'est ce qui rend la migration relisible en
    bloc, et c'est un fait mesuré, pas une ressemblance estimée. Ce n'est ni un ΔE ni
    un plus proche voisin — c'est de l'identité — donc l'ADR 003 tient : on ne classe
    toujours pas par proximité de couleurs, et le choix reste celui de l'intention.
  */
  return scored.sort(
    (a, b) =>
      tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier) ||
      Number(b.sameValue) - Number(a.sameValue) ||
      b.relevance - a.relevance ||
      a.name.localeCompare(b.name),
  );
}
