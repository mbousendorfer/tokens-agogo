import { parseHex } from './color';
import { allTokens, type Token } from './tokens';

export type Candidate = {
  name: string;
  tier: string;
  value: string | null;
  /** Vrai si ce token rend exactement la même chose que le token actuel. */
  sameValue: boolean;
  /** Score de pertinence pour la propriété CSS de la déclaration. Plus haut = plus proche. */
  relevance: number;
};

/**
 * Le rôle qu'une propriété CSS suggère.
 *
 * C'est un **ordre de tri**, jamais une décision. Une surface d'erreur, une surface
 * interactive et une surface par défaut partagent toutes `background-color` : la
 * propriété rétrécit la liste, elle ne choisit pas (ADR 003, ADR 011).
 */
const ROLE_HINTS: { pattern: RegExp; roles: string[] }[] = [
  { pattern: /^color$/, roles: ['text', 'content', 'color'] },
  { pattern: /background/, roles: ['surface', 'background', 'bg'] },
  { pattern: /^border(-(top|right|bottom|left))?-color$/, roles: ['border', 'stroke'] },
  { pattern: /^border/, roles: ['border', 'radius'] },
  { pattern: /^outline/, roles: ['border', 'focus'] },
  { pattern: /^fill$|^stroke$/, roles: ['icon', 'color'] },
  { pattern: /^(padding|margin|gap|inset|top|right|bottom|left)/, roles: ['spacing'] },
  { pattern: /^(width|height|min-|max-)/, roles: ['size', 'height', 'width'] },
  { pattern: /^font-size$/, roles: ['size', 'font'] },
  { pattern: /^font-weight$/, roles: ['weight', 'font'] },
  { pattern: /^font-family$/, roles: ['family', 'font'] },
  { pattern: /^line-height$/, roles: ['line-height', 'font'] },
  { pattern: /^border-radius$/, roles: ['radius'] },
  { pattern: /^transition|^animation/, roles: ['motion', 'transition'] },
];

function rolesFor(property: string | null): string[] {
  if (!property) return [];
  for (const { pattern, roles } of ROLE_HINTS) if (pattern.test(property)) return roles;
  return [];
}

/** Une valeur est-elle du même genre qu'une autre ? Une couleur ne remplace pas un espacement. */
function sameKind(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const kind = (value: string) =>
    parseHex(value)
      ? 'color'
      : /^-?\d/.test(value)
        ? 'dimension'
        : /^(rgba?|hsla?)\(/.test(value)
          ? 'color'
          : 'other';
  return kind(a) === kind(b);
}

/**
 * Les tokens proposables pour remplacer celui d'une déclaration.
 *
 * Ordonnés par : tier sémantique d'abord, puis pertinence pour la propriété CSS, puis
 * identité de valeur. Un token qui rend exactement la même chose est signalé — c'est
 * une information utile pour relire, pas un critère de choix.
 */
export function candidatesFor({
  property,
  currentValue,
  preferredTiers = ['sys', 'comp', 'ref'],
}: {
  property: string | null;
  currentValue: string | null;
  preferredTiers?: string[];
}): Candidate[] {
  const roles = rolesFor(property);
  const tokens: Token[] = allTokens().filter((token) => preferredTiers.includes(token.tier));

  return tokens
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
        value: token.value,
        sameValue: Boolean(
          currentValue && token.value && token.value.toLowerCase() === currentValue.toLowerCase(),
        ),
        relevance,
        kindMatch: sameKind(token.value, currentValue),
      };
    })
    .filter((candidate) => !currentValue || candidate.kindMatch || candidate.relevance > 0)
    .sort(
      (a, b) =>
        preferredTiers.indexOf(a.tier) - preferredTiers.indexOf(b.tier) ||
        b.relevance - a.relevance ||
        Number(b.sameValue) - Number(a.sameValue) ||
        a.name.localeCompare(b.name),
    )
    .map(({ name, tier, value, sameValue, relevance }) => ({
      name,
      tier,
      value,
      sameValue,
      relevance,
    }));
}
