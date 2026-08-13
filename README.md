# Tokens à gogo

Cockpit de migration des design tokens du Design System Agorapulse.

Le design system passe d'une architecture `ref → comp` à `ref → sys → comp(exceptions)`. Les rôles sémantiques et la palette sont définis dans Figma ; le code, lui, utilise encore 1 884 fois une primitive brute. Cette app sert à faire le trajet proprement : générer le nouveau système depuis Figma, confronter chaque composant à sa spec, prévisualiser sur les vrais composants, et produire un changeset applicable sur le repo du design system.

> **Ce n'est pas un renommage.** Chaque déclaration CSS doit utiliser le token qui décrit son **intention** — une surface interactive survolée, une bordure d'erreur — pas celui dont la couleur ressemble le plus à l'actuelle. Voir [ADR 003](docs/decisions/003-migration-par-intention.md).

## Démarrer

```bash
pnpm install
pnpm dev
```

L'app tourne dans deux modes.

### Mode local (mode de travail)

Lit le repo du design system sur disque, et peut y écrire.

```bash
echo 'DS_REPO_PATH=/Users/<vous>/code/design-system' > .env.local
pnpm dev
```

Le repo doit être sur `master` — la baseline du projet ([ADR 001](docs/decisions/001-baseline-master.md)). L'app affiche la branche qu'elle lit.

Pour la preview des composants Angular, lancer aussi le Storybook du design system :

```bash
cd ~/code/design-system && ng run web:storybook   # port 6006
```

### Mode démo (déployé)

Sans `DS_REPO_PATH`, l'app sert les snapshots commités dans `data/`, en lecture seule.

```bash
pnpm sync    # régénère data/ depuis le repo local, à commiter
```

## Scripts

| Commande         | Effet                                                    |
| ---------------- | -------------------------------------------------------- |
| `pnpm dev`       | serveur de développement                                 |
| `pnpm build`     | build de production                                      |
| `pnpm test`      | tests Vitest                                             |
| `pnpm typecheck` | `tsc --noEmit`                                           |
| `pnpm lint`      | ESLint                                                   |
| `pnpm format`    | Prettier en écriture                                     |
| `pnpm ds:sync`   | regénère tout : tokens, assets, spécimens, index, Figma  |
| `pnpm ds:build`  | regénère le CSS des tokens avec `outputReferences: true` |
| `pnpm ds:verify` | prouve que ce build est fidèle au CSS du design system   |
| `pnpm ds:usage`  | relève chaque déclaration du design system               |
| `pnpm ds:figma`  | consomme les snapshots du plugin Figma                   |
| `pnpm check`     | la chaîne CI complète, à lancer avant de pousser         |

Les scripts `ds:*` ont besoin du repo design system (`DS_REPO_PATH`, ou `--ds-root=`). Ils lisent `master` par défaut, quelle que soit la branche sortie localement — passer `--ds-ref=` pour en lire une autre.

## Documentation

| Fichier                                      | Contenu                                             |
| -------------------------------------------- | --------------------------------------------------- |
| [docs/decisions/](docs/decisions/)           | les ADR — pourquoi l'app est faite comme ça         |
| [docs/architecture.md](docs/architecture.md) | comment elle est construite                         |
| [docs/data-model.md](docs/data-model.md)     | forme des tokens, snapshots Figma, index, changeset |
| [docs/migration.md](docs/migration.md)       | où en est la migration du design system             |
| [CHANGELOG.md](CHANGELOG.md)                 | une entrée par étape livrée                         |

## Les cinq vues

| Vue            | Ce qu'elle sert à faire                                                   |
| -------------- | ------------------------------------------------------------------------- |
| Vue d'ensemble | où en est la migration                                                    |
| Composants     | ce que Figma prescrit face à ce que le code fait, **état par état**       |
| Tokens         | chaîne de résolution, call sites réels, les deux dettes, les tokens morts |
| Palettes       | ramps en OKLCH, régularité des marches, contraste WCAG et APCA            |
| Changeset      | le plan d'opérations, ordonné du moins risqué au plus risqué, exportable  |

## Importer les specs Figma

Le plugin `figma-plugin/` extrait les variables **et** les bindings par variante de composant — voir son [README](figma-plugin/README.md). Sans snapshot, l'app le dit et n'invente rien.

## Périmètre

Figma reste la source de vérité. Cette app ne remplace pas Figma : elle réalise la migration technique et garde le code aligné sur le design.

## Liens

- Design System — [github.com/agorapulse/design](https://github.com/agorapulse/design) · [Storybook](https://design.agorapulse.com)
- Figma — [Tokens](https://www.figma.com/design/ZXNsdFTc17AM5qk6DZc07A/) · [V2 Atoms](https://www.figma.com/design/GfIlJ7SMEljrkIjyo94c0R/) · [V2 Molecules](https://www.figma.com/design/iu4GbBju893YBLchQBRIi8/)
