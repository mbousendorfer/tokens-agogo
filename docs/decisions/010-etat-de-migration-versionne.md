# 010 — État de migration dans `migration-state.json` versionné

- **Date** : 2026-08-13
- **Statut** : accepté

## Contexte

La migration produit beaucoup de décisions humaines : le verdict retenu pour chaque déclaration, le statut de chaque composant, et surtout la **justification** de chaque exception `comp` conservée.

Ces décisions coûtent cher à prendre et n'ont aucune valeur si elles se perdent. Elles doivent survivre à un changement de machine, être relisibles dans six mois, et pouvoir être discutées.

## Décision

Un fichier `migration-state.json` à la racine, versionné dans git.

Il contient, par composant et par déclaration : le verdict, le token cible, la décision retenue, l'auteur, la date, et la justification quand il s'agit d'une exception. Aucun ID Figma ([008](008-reconciliation-par-les-noms.md)) — uniquement des noms.

L'app le lit au démarrage et l'écrit en mode local. En mode démo, elle l'affiche sans pouvoir le modifier.

## Conséquences

- L'historique des décisions est l'historique git du fichier : qui a décidé quoi, quand, et dans quel commit.
- Les décisions se relisent en pull request, comme du code.
- Le format doit rester lisible et stable en diff : clés triées, indentation constante, une décision par bloc. Un `git diff` doit se comprendre sans outil.
- `docs/migration.md` en donne la lecture narrative — où on en est, ce qui reste — là où le JSON est la source machine.

## Alternatives écartées

- **localStorage** — perdu au premier changement de machine ou vidage de cache, invisible pour les autres, indiscutable en revue.
- **Une base de données** — impose un service et des secrets ([009](009-local-first-et-demo-publique.md)), et sort les décisions du flux de revue de code.
- **Le stocker dans le repo design system** — mélange l'état d'un outil de pilotage avec le produit qu'il pilote, et pollue son historique.
