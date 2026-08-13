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

## Étapes suivantes

| Étape | Contenu                                                    |
| ----- | ---------------------------------------------------------- |
| 1     | Build chaîné Style Dictionary + garde-fou `verify-chained` |
| 2     | Preview surface A (iframe CSS-UI) + spécimens              |
| 3     | Index de déclarations (sélecteur, état, propriété, token)  |
| 4     | Import Figma : variables + bindings par variante           |
| 5     | Alignement spec ↔ code, vue Composants                     |
| 6     | Explorateur de tokens, éditeur de palettes                 |
| 7     | Preview surface B (Storybook proxifié)                     |
| 8     | Génération du changeset                                    |
