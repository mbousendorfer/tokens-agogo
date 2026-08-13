# Journal des décisions (ADR)

Un fichier par décision structurante, numéroté et daté.

**Règle : un ADR ne se réécrit pas.** S'il est remis en cause, on en écrit un nouveau qui le supersede, et on ajoute une ligne `Superseded par NNN` en tête de l'ancien. Le journal doit rester lisible comme une histoire, y compris ses erreurs.

Format : contexte, décision, conséquences, alternatives écartées.

| #                                                | Décision                                                                    | Statut     |
| ------------------------------------------------ | --------------------------------------------------------------------------- | ---------- |
| [001](001-baseline-master.md)                    | Baseline `master` — la tentative précédente est écartée                     | accepté    |
| [002](002-figma-source-de-verite.md)             | Figma source de vérité, pour les variables **et** les bindings composants   | accepté    |
| [003](003-migration-par-intention.md)            | La migration se pilote par l'intention, pas par le rapprochement de valeurs | accepté    |
| [004](004-output-references.md)                  | `outputReferences: true` dans notre build — le navigateur résout, pas nous  | accepté    |
| [005](005-isolation-iframe.md)                   | Isolation du CSS du design system par iframe same-origin                    | accepté    |
| [006](006-deux-surfaces-de-preview.md)           | Deux surfaces de preview : CSS-UI et Storybook proxifié                     | accepté    |
| [007](007-plugin-figma-maison.md)                | Plugin Figma maison pour extraire les `boundVariables` par variante         | superseded |
| [008](008-reconciliation-par-les-noms.md)        | Réconciliation Figma ↔ code par les noms, jamais par les IDs                | accepté    |
| [009](009-local-first-et-demo-publique.md)       | Local-first + démo publique en lecture seule                                | accepté    |
| [010](010-etat-de-migration-versionne.md)        | État de migration dans `migration-state.json` versionné                     | accepté    |
| [011](011-editeur-plutot-que-tableau-de-bord.md) | L'app est un éditeur, pas un tableau de bord                                | accepté    |
| [012](012-panneau-de-comparaison.md)             | La preview est un panneau docké, en avant / après                           | accepté    |
