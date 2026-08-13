# 001 — Baseline `master`

- **Date** : 2026-08-13
- **Statut** : accepté

## Contexte

Une première tentative de migration existe dans le design system : la branche `feature/ds-v3-reference-and-system-token-layers`, publiée sur npm sous le tag `beta` (`@agorapulse/ui-theme@22.0.6-beta.1`). Elle contient une palette V3 et un layer `sys` par rôles, transcrits à la main depuis Figma.

Cette tentative est un travail exploratoire. Elle n'a pas été validée, et son contenu n'est pas une référence fiable — les commentaires de provenance dans ses fichiers signalent eux-mêmes des écarts (« 129 of its 130 variables », un namespace `v3` temporaire posé pour éviter une collision de noms).

## Décision

L'app part de **`master`**, l'état du design system en production. La branche V3 et le package npm `beta` sont ignorés : ni source de données, ni point de comparaison, ni inspiration.

Le but de cette app est de **produire** le nouveau système proprement, pas d'auditer ce qui a déjà été produit.

## Conséquences

- Les chiffres de référence du projet sont ceux de `master` : 155 `ref`, 129 `sys`, 439 `comp` ; 1 884 occurrences de `var(--ref-*)` sur 103 noms uniques ; 1 234 `var(--comp-*)` sur 404 noms ; 104 `var(--sys-*)` sur 32 noms seulement.
- Le layer `sys` de `master` (organisé par famille et état) est à **remplacer**, pas à étendre : le système Figma est organisé par rôle, c'est un autre axe.
- Le garde-fou de l'étape 1 compare notre CSS généré à `desktop_variables.css` **de `master`**.
- Les assets de preview viennent du repo local sur `master`, ou de `@agorapulse/ui-theme@22.0.1` (le tag `latest`, stable) en secours — jamais du `beta`.

## Alternatives écartées

- **Repartir de la branche V3** — elle porte des décisions non validées qu'on reprendrait sans les avoir examinées, et son namespace `v3` est un contournement temporaire dont on hériterait.
- **Utiliser la branche V3 comme point de comparaison** — comparer à un brouillon oriente le résultat vers ce brouillon. La seule référence est Figma.
