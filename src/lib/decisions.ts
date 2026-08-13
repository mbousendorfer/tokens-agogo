/**
 * Les décisions de migration : pour une déclaration donnée, le token retenu.
 *
 * Rien n'est écrit dans le design system tant qu'on n'a pas exporté. Les décisions
 * s'accumulent, se relisent, et se versionnent dans `migration-state.json` (ADR 010).
 */

export type Decision = {
  /** Identifie la déclaration de façon stable : fichier, ligne, token remplacé. */
  file: string;
  line: number;
  from: string;
  /** Le token retenu, ou `null` pour une exception assumée. */
  to: string | null;
  /** Obligatoire pour une exception : pourquoi le code diverge volontairement. */
  note?: string;
  component: string;
  property: string | null;
  states: string[];
  decidedAt: string;
};

export type MigrationState = {
  $schema: 'tokens-agogo/migration-state/1';
  updatedAt: string | null;
  decisions: Decision[];
};

export const EMPTY_STATE: MigrationState = {
  $schema: 'tokens-agogo/migration-state/1',
  updatedAt: null,
  decisions: [],
};

/** La clé d'une déclaration. Fichier + ligne + token remplacé la rendent unique. */
export function decisionKey(file: string, line: number, from: string): string {
  return `${file}:${line}:${from}`;
}

/** Les décisions indexées par clé, pour un accès direct depuis les vues. */
export function indexDecisions(state: MigrationState): Map<string, Decision> {
  return new Map(
    state.decisions.map((decision) => [
      decisionKey(decision.file, decision.line, decision.from),
      decision,
    ]),
  );
}

/**
 * Sérialise l'état en JSON stable en diff : décisions triées, indentation constante.
 * Un `git diff` doit se lire sans outil.
 */
export function serializeState(state: MigrationState): string {
  const decisions = [...state.decisions].sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.from.localeCompare(b.from),
  );
  return JSON.stringify({ ...state, decisions }, null, 2) + '\n';
}
