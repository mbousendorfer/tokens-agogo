/**
 * Les redéfinitions de tokens sémantiques.
 *
 * Un token `sys` dit vers quelle primitive il pointe. Redéfinir ce pointage — faire
 * lire `--ref-color-grey-900` à `--sys-color-text-secondary` plutôt que `grey-800`
 * — change d'un coup tout ce qui en dépend. C'est l'opération la plus puissante de la
 * migration, et la plus dangereuse : d'où la portée affichée avant de valider.
 *
 * Comme les décisions de composant, rien n'est écrit dans le design system : les
 * redéfinitions s'accumulent et partent dans le changeset (ADR 011).
 */
export type TokenOverride = {
  /** Le token sémantique redéfini, en nom CSS. */
  token: string;
  /** La primitive vers laquelle il pointe aujourd'hui. */
  from: string | null;
  /** La primitive retenue. */
  to: string;
  changedAt: string;
};

export type OverrideState = {
  $schema: 'tokens-agogo/token-overrides/1';
  updatedAt: string | null;
  overrides: TokenOverride[];
};

export const EMPTY_OVERRIDES: OverrideState = {
  $schema: 'tokens-agogo/token-overrides/1',
  updatedAt: null,
  overrides: [],
};

export function serializeOverrides(state: OverrideState): string {
  const overrides = [...state.overrides].sort((a, b) => a.token.localeCompare(b.token));
  return JSON.stringify({ ...state, overrides }, null, 2) + '\n';
}

/**
 * La portée d'une redéfinition : tout ce qui en dépend, directement ou non.
 *
 * Un `sys` est lu par des `comp`, qui sont lus par des composants. Changer la
 * primitive d'un `sys` remonte toute cette chaîne — le compte doit être visible
 * **avant** de valider, pas découvert après.
 */
export function blastRadius(
  token: string,
  tokens: { name: string; aliasOf: string | null }[],
  usageCount: (name: string) => number,
): { dependents: string[]; callSites: number } {
  const dependents = new Set<string>();
  const queue = [token];

  while (queue.length) {
    const current = queue.pop()!;
    for (const candidate of tokens) {
      if (candidate.aliasOf === current && !dependents.has(candidate.name)) {
        dependents.add(candidate.name);
        queue.push(candidate.name);
      }
    }
  }

  const callSites = [token, ...dependents].reduce((sum, name) => sum + usageCount(name), 0);
  return { dependents: [...dependents].sort(), callSites };
}
