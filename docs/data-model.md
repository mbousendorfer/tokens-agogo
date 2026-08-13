# Modèle de données

Chaque section est écrite quand l'étape correspondante est livrée. Ce document est le contrat entre les scripts de `tools/` et l'app.

## État au 2026-08-13 (étape 0)

Rien n'est encore produit. Les formats ci-dessous sont les cibles fixées par le plan, à confirmer et détailler à leur étape.

| Artefact                           | Produit par                  | Consommé par                     | Étape |
| ---------------------------------- | ---------------------------- | -------------------------------- | ----- |
| `public/ds/tokens.chained.css`     | `build-chained-tokens.mjs`   | l'iframe de preview              | 1     |
| `src/lib/preview/specimens.ts`     | `build-specimens.mjs`        | la preview, la vue Composants    | 2     |
| `data/declarations.json`           | `build-usage-index.mjs`      | la vue Composants, l'explorateur | 3     |
| `figma-snapshots/<fileKey>/*.json` | le plugin Figma              | les scripts d'import             | 4     |
| tokens Style Dictionary générés    | `import-figma-variables.mjs` | le build chaîné, le changeset    | 4     |
| `migration-state.json`             | l'app (mode local)           | l'app, la revue en PR            | 5     |
| `changeset.json` / `changeset.md`  | `emit-changeset.mjs`         | le repo design system            | 8     |

## Invariants déjà fixés

**Nommage des tokens.** La conversion chemin → nom CSS reproduit exactement le transform `name/cti/kebab` de Style Dictionary 3.9.2 : `sys.color.surface.interactive.hovered` → `--sys-color-surface-interactive-hovered`, avec camelCase converti en kebab (`electricBlue` → `electric-blue`). Toute divergence casse la jointure avec le code existant.

**Aucun identifiant Figma hors des snapshots.** Les `VariableID:*` ne servent qu'à résoudre les alias à l'intérieur d'un même export. Partout ailleurs, la jointure se fait par les noms. Voir [ADR 008](decisions/008-reconciliation-par-les-noms.md).

**Stabilité en diff.** Tout JSON commité (snapshots, index, état de migration) doit être écrit avec des clés triées et une indentation constante : un `git diff` doit se lire sans outil.

## Chiffres de référence (`master`, 2026-08-13)

Ces valeurs servent de contrôle aux scripts d'analyse : un écart signale un bug de scan, pas une évolution du design system.

| Mesure                   | Valeur                             |
| ------------------------ | ---------------------------------- |
| Tokens définis           | 155 `ref` · 129 `sys` · 439 `comp` |
| `comp` aliasant un `ref` | 232 sur 439, plus 30 littéraux     |
| `var(--ref-*)`           | 1 884 occurrences, 103 noms        |
| `var(--comp-*)`          | 1 234 occurrences, 404 noms        |
| `var(--sys-*)`           | 104 occurrences, 32 noms           |
