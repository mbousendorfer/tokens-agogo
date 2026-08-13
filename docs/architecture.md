# Architecture

Mis à jour à chaque étape. Ce qui n'existe pas encore est marqué _(à venir)_.

## Vue d'ensemble

```
tokens-agogo/
├── tools/                 scripts Node, sans dépendance à React
│   ├── ds-repo.mjs            lecture du design system par `git show`
│   ├── build-chained-tokens   Style Dictionary + outputReferences
│   ├── verify-chained         le garde-fou
│   ├── copy-ds-assets         CSS-UI, fontes, icônes -> public/ds/
│   ├── build-specimens        stories CSS-UI -> spécimens
│   ├── scss-scan              scanner de déclarations (testé)
│   ├── build-usage-index      l'index des déclarations
│   ├── figma-import           variables et bindings -> tokens (testé)
│   └── build-figma            consomme les snapshots
├── src/app/(app)/         les cinq vues, Tailwind + shadcn
├── src/app/(preview)/     l'iframe, CSS du design system seul
├── src/lib/               logique pure, testée
├── src/server/            accès disque au repo design system
├── figma-plugin/          export variables + bindings
├── figma-snapshots/       exports Figma commités
├── data/                  snapshots servis en mode démo
└── docs/
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

## Étape 2 — la preview

`pnpm ds:sync` enchaîne les trois générateurs : tokens chaînés, assets, spécimens.

### Deux documents racines

`src/app/` porte deux route groups, chacun avec son propre `<html>` :

| Groupe      | Contenu                          | Style                         |
| ----------- | -------------------------------- | ----------------------------- |
| `(app)`     | les cinq vues                    | Tailwind + shadcn             |
| `(preview)` | `/preview`, la cible de l'iframe | le CSS du design system, seul |

Sans les groups, le layout de preview serait **imbriqué** dans celui de l'app — deux `<html>` l'un dans l'autre, et le CSS du design system chargé dans le document principal. C'est exactement ce que l'ADR 005 interdit.

Le layout de preview force `color-scheme: light` : le design system n'a pas de mode sombre, et laisser le navigateur inverser fausserait toute lecture de contraste.

### Les spécimens ne sont pas écrits à la main

`apps/web/src/stories/css-ui/` contient déjà le vrai markup `.ap-*`, maintenu, avec ses variantes. `tools/build-specimens.mjs` l'extrait.

Les fichiers de stories sont du TypeScript dont les types sont purement statiques : **Node 22 les importe nativement**, annotations effacées. Pas de parseur, pas de scanner de template literal — on importe le module, on appelle `meta.render(args)`, on récupère le HTML.

Résultat sur `master` : **101 spécimens, 29 composants, 5 groupes**, extraits de 29 fichiers sur 30. `Tabs.stories.ts` est sauté parce qu'il déclare un vrai composant Angular (`@Component`) et n'est donc pas importable ici. Le fichier sauté est listé dans `data/specimens.json` et affiché dans l'app : un périmètre tronqué en silence se lit comme une couverture complète.

### Le canal d'override

`PreviewFrame` écrit directement dans `iframe.contentDocument` — same-origin, donc ni `postMessage`, ni sérialisation, ni aller-retour. La cible est le `<style id="ds-token-overrides">` vide, déjà en dernier dans le `<head>` du layout de preview : à spécificité égale, il gagne.

**Vérifié dans le navigateur** : injecter `--ref-color-orange-100: #00A000` fait passer le fond du bouton primaire de `rgb(255,103,38)` à `rgb(0,160,0)`, et vider le bloc restaure la valeur d'origine. La chaîne primitive → token de composant → pixel fonctionne sans rebuild.

### Artefacts générés, et commités

`public/ds/` et `data/` sont générés **et versionnés**. Le mode démo n'a pas accès au repo design system ([ADR 009](decisions/009-local-first-et-demo-publique.md)) : ces fichiers sont ses snapshots.

| Fichier                   | Contenu                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `public/ds/*.css`         | tokens chaînés et aplatis, desktop et mobile                   |
| `public/ds/style/css-ui/` | le vrai CSS du design system, arborescence mirroir             |
| `public/ds/fonts/averta/` | les fontes, référencées en relatif par `font-face.css`         |
| `public/ds/icons/`        | le CSS d'icônes, depuis `@agorapulse/ui-symbol` (tag `latest`) |
| `data/tokens.json`        | chaque token : tier, valeur brute, alias, valeur finale        |
| `data/specimens.json`     | les spécimens, plus la liste de ce qui a été sauté             |

L'arborescence des assets est mirroir et non aplatie : `font-face.css` référence `../../fonts/averta/…` relativement à lui-même.

## Étape 3 — l'index de déclarations

`pnpm ds:usage` relève **une déclaration**, pas un `var()` : sélecteur résolu, état, propriété CSS, token, fallback. C'est la forme dont l'alignement a besoin, parce que Figma prescrit à la maille « cette partie, dans cet état ».

Couverture vérifiée fichier par fichier contre un grep brut : **zéro écart** sur 119 fichiers. Y arriver a demandé de traiter quatre cas que le design system contient réellement, chacun couvert par un test — l'interpolation SCSS qui construit des noms de tokens, les `_` dans les custom properties, les maps Sass et les arguments de mixin, et les fallbacks qui sont eux-mêmes des tokens.

## Étape 4 — l'import Figma

`figma-plugin/` exporte les variables **et** les `boundVariables` par variante. `tools/figma-import.mjs` les transforme en noms de tokens (même transform `name/cti/kebab`) et les confronte au code, en joignant **par les noms** ([ADR 008](decisions/008-reconciliation-par-les-noms.md)).

Sans snapshot, `pnpm ds:figma` écrit un fichier vide et explique comment en produire un. L'app affiche alors ce qu'elle ne peut pas savoir plutôt que de le deviner.

## Étapes 5 à 8 — les vues

| Vue        | Ce qu'elle montre                                                            |
| ---------- | ---------------------------------------------------------------------------- |
| Composants | déclarations groupées par état, verdict par déclaration, preview du spécimen |
| Tokens     | chaîne de résolution, call sites réels, les deux dettes, les orphelins       |
| Palettes   | ramps en OKLCH, marches irrégulières, WCAG bloquant + APCA indicatif         |
| Changeset  | le plan d'opérations ordonné par risque, exportable en Markdown              |

Le module couleur (`src/lib/color.ts`) est validé contre les valeurs de référence publiées : 21:1 pour noir sur blanc, APCA 106,04 et −107,88 aux deux polarités, et le 4,54 connu de `#767676` sur blanc.
