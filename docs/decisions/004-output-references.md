# 004 — `outputReferences: true` dans notre build : le navigateur résout, pas nous

- **Date** : 2026-08-13
- **Statut** : accepté

## Contexte

Le design system génère son CSS avec Style Dictionary sans activer `outputReferences`. Le résultat est **aplati** : `--comp-status-green-background-color: #ECF7ED`. La chaîne `ref → sys → comp` n'existe qu'à l'écriture dans les JSON, jamais à l'exécution.

Conséquence pour une app d'édition de tokens : modifier une primitive ne propage rien. Il faudrait soit rebuilder, soit réimplémenter la résolution du graphe de références côté navigateur — donc maintenir un second résolveur, susceptible de diverger de celui de Style Dictionary.

## Décision

tokens-agogo lance **son propre build Style Dictionary** sur les mêmes sources, avec les mêmes transforms (`attribute/cti`, `name/cti/kebab`, `color/hex`, `size/px`), mais avec `outputReferences: true`. Il produit un `tokens.chained.css` où les alias restent des `var()` :

```css
--ref-color-green-10: #ecf7ed;
--sys-color-surface-success: var(--ref-color-green-200);
--comp-status-green-background-color: var(--ref-color-green-10);
```

Modifier une primitive dans un bloc `:root` d'override re-résout nativement toute la descendance, en un seul recalcul de style. Les valeurs finales se relisent avec `getComputedStyle`.

Style Dictionary est **épinglé en 3.9.2**, la version vendorée dans le design system. La v4 renomme `name/cti/kebab` en `name/kebab` et ferait dériver tous les noms de tokens.

## Conséquences

- **Aucun résolveur maison à écrire ni à maintenir.** Pas de risque de divergence avec Style Dictionary.
- Un graphe statique `{ token → aliasOf, dependents[] }` reste nécessaire, mais pour l'UI seulement (panneau d'impact, arbre de dépendances) — jamais pour produire des pixels.
- **Garde-fou obligatoire** : `verify-chained.mjs` charge la feuille chaînée et compare toutes les valeurs calculées à `desktop_variables.css` de `master`. Tout écart signale un cas limite d'`outputReferences` apparu en amont. C'est la garantie centrale du projet, elle tourne à chaque build.
- L'app devient la démonstration grandeur nature de ce qu'`outputReferences: true` apporterait au design system lui-même — prérequis de tout theming runtime futur (mode sombre, densité, marque).

## Vérification préalable

Le corpus `master` a été audité pour les cas qui cassent `outputReferences` : **zéro** valeur multi-références, **zéro** expression mathématique, **une seule** référence interpolée (`comp.avatar.background.shadow`, de la forme `0 0 0 1px {ref.color.grey.10}`), que le formateur de Style Dictionary 3.9.2 gère correctement.

## Alternatives écartées

- **Écrire notre propre résolveur de graphe** — duplique une logique existante et bien testée, et introduit une source permanente de divergence.
- **Rebuilder à chaque édition** — trop lent pour de l'édition interactive, et impose un aller-retour serveur là où la cascade CSS suffit.
- **Demander le changement en amont dans le design system d'abord** — bloquerait le projet sur une PR externe. On le démontre d'abord, on le propose ensuite.
