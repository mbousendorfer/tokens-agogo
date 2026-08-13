import { danglingTokens, declarationData, tokenRows } from './declarations';
import { alignableComponents } from './alignment';

/**
 * Le plan d'opérations à appliquer sur le repo du design system.
 *
 * Ordonné, et l'ordre n'est pas cosmétique : chaque étape est indépendamment livrable
 * et vérifiable, et les moins risquées passent d'abord. Re-pointer les tokens de
 * composant ne touche aucun composant — c'est du JSON — tandis que réécrire les call
 * sites demande d'éditer des feuilles de style et de relire le rendu.
 */
export type Operation = {
  kind: 'supprimer-token' | 'definir-token' | 'repointer-token' | 'reecrire-call-sites';
  token?: string;
  target?: string;
  component?: string;
  detail: string;
  files?: string[];
  count: number;
};

export type ChangesetStep = {
  order: number;
  title: string;
  rationale: string;
  touches: string;
  risk: 'nul' | 'faible' | 'moyen';
  operations: Operation[];
};

export function buildChangeset(): { steps: ChangesetStep[]; totals: Record<string, number> } {
  const rows = tokenRows();
  const dangling = danglingTokens();

  const orphans = rows.filter((row) => row.orphan);
  const misAliased = rows.filter((row) => row.tier === 'comp' && row.aliasOf?.startsWith('--ref-'));
  const components = alignableComponents().filter((component) => component.debt > 0);

  const steps: ChangesetStep[] = [
    {
      order: 1,
      title: 'Supprimer les tokens définis et jamais consommés',
      rationale:
        'Aucun call site : la suppression ne peut rien changer à l’écran, donc elle ne demande aucune revue visuelle. C’est le gain le moins cher de toute la migration.',
      touches: 'les JSON de tokens uniquement',
      risk: 'nul',
      operations: orphans.map((token) => ({
        kind: 'supprimer-token' as const,
        token: token.name,
        detail: `${token.name} — défini, jamais utilisé`,
        count: 1,
      })),
    },
    {
      order: 2,
      title: 'Corriger les tokens référencés mais définis nulle part',
      rationale:
        'Ces règles tombent silencieusement dans le vide dans le design system livré. Chacune est soit un token à définir, soit une faute de frappe à corriger.',
      touches: 'les JSON de tokens et quelques feuilles de style',
      risk: 'faible',
      operations: dangling.map(({ token, usages, files }) => ({
        kind: 'definir-token' as const,
        token,
        detail: `${token} — ${usages} usage(s) sans définition`,
        files,
        count: usages,
      })),
    },
    {
      order: 3,
      title: 'Re-pointer les tokens de composant vers la couche sémantique',
      rationale:
        'Ces tokens aliasent une primitive au lieu d’un token sémantique. La correction est une édition de JSON : aucun composant n’est touché, aucun call site ne bouge, et le CSS généré reste vérifiable par le garde-fou.',
      touches: 'les JSON de tokens uniquement',
      risk: 'faible',
      operations: misAliased.map((token) => ({
        kind: 'repointer-token' as const,
        token: token.name,
        target: token.aliasOf ?? undefined,
        detail: `${token.name} → aujourd’hui ${token.aliasOf}, à repointer vers un token sémantique`,
        count: token.usages,
      })),
    },
    {
      order: 4,
      title: 'Réécrire les call sites de primitives brutes',
      rationale:
        'Composant par composant, en suivant la spec Figma. C’est la seule étape qui demande d’éditer des feuilles de style et de relire le rendu — d’où sa place en dernier.',
      touches: 'les feuilles de style des composants',
      risk: 'moyen',
      operations: components.map((component) => ({
        kind: 'reecrire-call-sites' as const,
        component: component.id,
        detail: `${component.id} — ${component.debt} usage(s) de primitives brutes`,
        count: component.debt,
      })),
    },
  ];

  return {
    steps,
    totals: {
      orphelins: orphans.length,
      indefinis: dangling.length,
      malAlias: misAliased.length,
      callSites: components.reduce((sum, component) => sum + component.debt, 0),
    },
  };
}

/** Le changeset en Markdown : lisible par un humain, applicable par un agent. */
export function changesetMarkdown(): string {
  const { steps, totals } = buildChangeset();
  const { source } = declarationData;

  const lines = [
    '# Changeset — migration des tokens du Design System',
    '',
    `Généré par tokens-agogo depuis \`${source.ref}\` @ \`${source.sha}\`.`,
    '',
    'Les étapes sont ordonnées du moins risqué au plus risqué. Chacune est indépendamment livrable et vérifiable : après chaque étape, `npm run generate-tokens:ui-theme` doit produire un CSS cohérent et Storybook démarrer sans régression.',
    '',
    '| # | Étape | Touche | Risque | Opérations |',
    '| - | ----- | ------ | ------ | ---------- |',
    ...steps.map(
      (step) =>
        `| ${step.order} | ${step.title} | ${step.touches} | ${step.risk} | ${step.operations.length} |`,
    ),
    '',
  ];

  for (const step of steps) {
    lines.push(`## ${step.order}. ${step.title}`, '', step.rationale, '');
    if (!step.operations.length) {
      lines.push('_Rien à faire._', '');
      continue;
    }
    for (const operation of step.operations) {
      lines.push(`- ${operation.detail}`);
      for (const file of operation.files ?? []) lines.push(`  - \`${file}\``);
    }
    lines.push('');
  }

  lines.push(
    '## Récapitulatif',
    '',
    `- ${totals.orphelins} tokens orphelins à supprimer`,
    `- ${totals.indefinis} tokens référencés sans définition`,
    `- ${totals.malAlias} tokens de composant à repointer`,
    `- ${totals.callSites} usages de primitives brutes à réécrire`,
    '',
  );

  return lines.join('\n');
}
