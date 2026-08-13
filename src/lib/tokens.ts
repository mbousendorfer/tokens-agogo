import data from '../../data/tokens.json';

/**
 * `autre` vient de Style Dictionary (un token hors des trois préfixes), `local` du
 * scanner (une custom property déclarée dans une feuille de style, hors système).
 */
export type Tier = 'ref' | 'sys' | 'comp' | 'local' | 'autre';

export type Token = {
  name: string;
  tier: Tier;
  /** La valeur telle qu'émise en chaîné : soit un littéral, soit un ou des `var()`. */
  raw: string;
  /** Le token visé quand la valeur est un alias pur, sinon `null`. */
  aliasOf: string | null;
  references: string[];
  /** La valeur finale, telle que le design system la livre aujourd'hui. */
  value: string | null;
};

export type TokenData = {
  source: { ref: string; sha: string };
  counts: { total: number; byTier: Record<string, number> };
  tokens: Token[];
};

export const tokenData = data as TokenData;

export function allTokens(): Token[] {
  return tokenData.tokens;
}

const HEX = /^#[0-9a-f]{3,8}$/i;

/** Les primitives de couleur : le point d'entrée naturel pour voir la cascade agir. */
export function colorPrimitives(): Token[] {
  return tokenData.tokens.filter((t) => t.tier === 'ref' && t.value && HEX.test(t.value));
}

/** `--ref-color-electric-blue-100` -> `electric-blue`. Sert à regrouper une ramp. */
export function rampOf(token: Token): string | null {
  const match = token.name.match(/^--ref-color-(.+?)-(\d+)$/);
  return match ? match[1] : null;
}

/** Combien de tokens dépendent de celui-ci, directement ou non. */
export function dependentCount(name: string): number {
  const dependents = new Set<string>();
  const queue = [name];

  while (queue.length) {
    const current = queue.pop()!;
    for (const token of tokenData.tokens) {
      if (token.references.includes(current) && !dependents.has(token.name)) {
        dependents.add(token.name);
        queue.push(token.name);
      }
    }
  }
  return dependents.size;
}
