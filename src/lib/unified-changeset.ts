import type { Decision, MigrationState } from './decisions';
import type { OverrideState, TokenOverride } from './token-overrides';

/**
 * Le changeset unique.
 *
 * Trois natures de décision cohabitent dans cette app, et elles ne s'appliquent ni au
 * même endroit ni au même prix :
 *
 *   1. les redéfinitions `sys` — un alias qui change, en JSON, sans toucher un composant ;
 *   2. les tokens émis depuis Figma — des fichiers à déposer ;
 *   3. les décisions de composant — des `var()` réécrits dans des feuilles de style.
 *
 * Les livrer séparément obligerait à reconstituer l'ordre à la main. Ici elles
 * convergent, ordonnées du moins risqué au plus risqué.
 */
export type UnifiedChangeset = {
  steps: {
    order: number;
    title: string;
    rationale: string;
    touches: string;
    risk: 'nul' | 'faible' | 'moyen';
    operations: string[];
  }[];
  totals: { overrides: number; decisions: number; files: number };
};

export function unifiedChangeset({
  decisions,
  overrides,
  emittedFiles = [],
}: {
  decisions: MigrationState;
  overrides: OverrideState;
  emittedFiles?: string[];
}): UnifiedChangeset {
  const byFile = new Map<string, Decision[]>();
  for (const decision of decisions.decisions) {
    if (!decision.to) continue;
    byFile.set(decision.file, [...(byFile.get(decision.file) ?? []), decision]);
  }

  return {
    steps: [
      {
        order: 1,
        title: 'Déposer les tokens générés depuis Figma',
        rationale:
          'Les layers `ref` et `sys` émis depuis les variables Figma, en syntaxe Style Dictionary. Additif : rien de ce qui existe n’est retiré, et le CSS regénéré reste vérifiable par le garde-fou.',
        touches: 'les JSON de tokens',
        risk: 'nul',
        operations: emittedFiles.map((file) => `déposer ${file}`),
      },
      {
        order: 2,
        title: 'Appliquer les redéfinitions sémantiques',
        rationale:
          'Chaque redéfinition change vers quelle primitive pointe un token `sys`. Aucun composant n’est touché, aucun call site ne bouge — mais tout ce qui en dépend suit d’un coup.',
        touches: 'les JSON de tokens',
        risk: 'faible',
        operations: overrides.overrides.map(
          (override: TokenOverride) =>
            `${override.token} : ${override.from ?? '(littéral)'} → ${override.to}`,
        ),
      },
      {
        order: 3,
        title: 'Réécrire les call sites décidés',
        rationale:
          'Composant par composant, ligne par ligne. C’est la seule étape qui demande d’éditer des feuilles de style et de relire le rendu — d’où sa place en dernier.',
        touches: 'les feuilles de style des composants',
        risk: 'moyen',
        operations: [...byFile.entries()].flatMap(([file, items]) =>
          items
            .sort((a, b) => a.line - b.line)
            .map((item) => `${file}:${item.line} — ${item.from} → ${item.to}`),
        ),
      },
    ],
    totals: {
      overrides: overrides.overrides.length,
      decisions: decisions.decisions.filter((decision) => decision.to).length,
      files: emittedFiles.length,
    },
  };
}

/** Le changeset en Markdown : relisible par un humain, applicable par un agent. */
export function unifiedMarkdown(
  changeset: UnifiedChangeset,
  source: { ref: string; sha: string },
): string {
  const { steps, totals } = changeset;
  const total = totals.overrides + totals.decisions + totals.files;
  if (!total) return '# Changeset\n\nAucune décision prise pour l’instant.\n';

  const lines = [
    '# Changeset — migration des tokens du Design System',
    '',
    `Baseline \`${source.ref}\` @ \`${source.sha}\`.`,
    `${totals.files} fichier(s) de tokens, ${totals.overrides} redéfinition(s) sémantique(s), ${totals.decisions} call site(s).`,
    '',
    'Les étapes sont ordonnées du moins risqué au plus risqué. Après chacune,',
    '`npm run generate-tokens:ui-theme` doit produire un CSS cohérent et Storybook',
    'démarrer sans régression visuelle.',
    '',
  ];

  for (const step of steps) {
    lines.push(`## ${step.order}. ${step.title}`, '');
    lines.push(`_${step.touches} · risque ${step.risk}_`, '', step.rationale, '');
    if (!step.operations.length) {
      lines.push('_Rien à faire._', '');
      continue;
    }
    for (const operation of step.operations) lines.push(`- ${operation}`);
    lines.push('');
  }

  return lines.join('\n');
}
