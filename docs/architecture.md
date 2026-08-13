# Architecture

Mis à jour à chaque étape. Ce qui n'existe pas encore est marqué _(à venir)_.

## Vue d'ensemble

```
tokens-agogo/
├── tools/                 scripts Node, sans dépendance à React      (à venir)
├── src/app/               Next.js App Router
├── src/lib/               logique pure, testée                        (à venir)
├── src/server/            accès disque au repo design system          (à venir)
├── figma-plugin/          export variables + bindings                 (à venir)
├── figma-snapshots/       exports Figma commités                      (à venir)
├── data/                  snapshots servis en mode démo               (à venir)
├── docs/
└── migration-state.json   décisions de migration                      (à venir)
```

## Principes

**Deux mondes CSS qui ne se touchent jamais.** L'app est stylée par Tailwind et shadcn. Le design system est stylé par ses propres tokens et sa couche CSS-UI. Cette dernière émet des sélecteurs de balises globaux qui entrent en collision frontale avec le preflight Tailwind, donc elle vit exclusivement dans une iframe. Voir [ADR 005](decisions/005-isolation-iframe.md).

**La logique métier ne connaît pas React.** Parsing, graphe de tokens, index de déclarations, alignement Figma ↔ code : tout est en TypeScript pur sous `src/lib/`, testable sans navigateur. Les composants consomment, ils ne calculent pas.

**Une seule porte vers le disque.** Tout accès au repo design system passe par `src/server/`, jamais depuis un composant. C'est ce qui permet aux deux modes de partager la même interface côté client. Voir [ADR 009](decisions/009-local-first-et-demo-publique.md).

**Le navigateur résout le graphe de tokens.** On ne réimplémente pas Style Dictionary : on le relance avec `outputReferences: true` et on laisse la cascade CSS faire la résolution. Voir [ADR 004](decisions/004-output-references.md).

## Étape 0 — ce qui existe

Le squelette Next.js, la chaîne d'outils et la documentation.

| Élément       | Choix                                                                |
| ------------- | -------------------------------------------------------------------- |
| Framework     | Next.js 16, App Router, `src/` dir, alias `@/*`                      |
| UI            | shadcn/ui, base Radix, preset Nova, thème par variables CSS          |
| Style         | Tailwind 4 (`src/app/globals.css`)                                   |
| Tests         | Vitest, environnement `node`, cible `src/**/*.test.ts` et `tools/**` |
| Format / lint | Prettier (plugin Tailwind) + ESLint `eslint-config-next`             |
| Gestionnaire  | pnpm                                                                 |
| CI            | GitHub Actions : format, lint, typecheck, test, build                |

`CLAUDE.md` pointe vers `AGENTS.md`, qui porte les règles projet — dont la plus importante : **ce repo n'applique pas le design system Agorapulse à sa propre interface, il l'inspecte.**

## Étape 1 — le build chaîné

`pnpm ds:build` regénère le CSS des tokens du design system en activant `outputReferences`, ce que le design system ne fait pas. `pnpm ds:verify` prouve que cette regénération est fidèle.

### Comment on lit le design system

La baseline est `master`, qui n'est pas forcément la branche sortie dans le repo local. `tools/ds-repo.mjs` lit donc par `git show <ref>:<path>`, jamais par le système de fichiers : les scripts sont indépendants de l'état du checkout, et changer de branche dans le design system ne change rien ici.

Style Dictionary lit des globs sur disque, donc les tokens de la ref sont d'abord matérialisés dans `.cache/ds-tokens/` (ignoré par git).

### Ce que produit `pnpm ds:build`

| Fichier                         | Contenu                                                |
| ------------------------------- | ------------------------------------------------------ |
| `public/ds/desktop.chained.css` | les alias restent des `var()` — la feuille qu'on édite |
| `public/ds/desktop.flat.css`    | l'aplati, pour le byte-match                           |
| `public/ds/mobile.*.css`        | idem pour la plateforme mobile                         |
| `public/ds/source.json`         | la ref et le sha lus, pour tracer l'origine            |

Les transforms sont repris à l'identique de `libs/ui-theme/src/desktop_config.js` : `attribute/cti`, `name/cti/kebab`, `color/hex`, `size/px`. `style-dictionary` est épinglé en **3.9.2** — la v4 renomme `name/cti/kebab` et ferait dériver tous les noms.

### Le garde-fou

`pnpm ds:verify` fait deux assertions :

1. **Byte-match** — notre build aplati doit être identique, octet pour octet, au CSS commité dans le design system. Si ça diverge, nos transforms ne reproduisent pas les siens et tout ce qu'on génère est suspect.
2. **Équivalence après résolution** — la feuille chaînée, ses `var()` résolus, doit donner exactement les mêmes valeurs que l'aplatie.

Ce script a besoin du repo design system : il tourne en local, pas en CI. La logique pure qu'il utilise (`tools/css-vars.mjs`) est, elle, couverte par des tests sur fixtures qui tournent partout.

### Résultat mesuré (`master` @ `abd1c4df`, 2026-08-13)

```
✓ desktop  723 tokens, 527 chaînés en var()
✓ mobile   723 tokens, 527 chaînés en var()
```

Byte-match exact sur les deux plateformes, et équivalence après résolution.

**Vérifié aussi dans un vrai navigateur**, ce qui est la seule preuve qui compte : en chargeant les deux feuilles dans deux hôtes et en comparant `getComputedStyle` sur les 723 tokens, **aucun écart**. Un seul token demande une explication — `--comp-select-two-line-height` vaut `unset`, un mot-clé CSS qui fait calculer la propriété à vide ; le comportement est identique des deux côtés, donc ce n'est pas un écart.

La conclusion pratique : `outputReferences: true` passe sur ce corpus. Modifier une primitive dans un bloc `:root` d'override propagera nativement à ses 527 descendants, sans rebuild et sans résolveur maison.

## Étapes suivantes

| Étape | Contenu                                                   |
| ----- | --------------------------------------------------------- |
| 2     | Preview surface A (iframe CSS-UI) + spécimens             |
| 3     | Index de déclarations (sélecteur, état, propriété, token) |
| 4     | Import Figma : variables + bindings par variante          |
| 5     | Alignement spec ↔ code, vue Composants                    |
| 6     | Explorateur de tokens, éditeur de palettes                |
| 7     | Preview surface B (Storybook proxifié)                    |
| 8     | Génération du changeset                                   |
