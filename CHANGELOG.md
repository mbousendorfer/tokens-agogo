# Changelog

Une entrée par étape livrée. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

### Étape 2 — Preview et spécimens

- Route `/preview` dans son propre route group, avec son `<html>` : le CSS du design
  system ne touche jamais le document de l'app.
- `pnpm ds:assets` copie le vrai CSS-UI, les fontes Averta et le CSS d'icônes sous
  `public/ds/`, en gardant l'arborescence mirroir pour que les fontes se résolvent.
- `pnpm ds:specimens` extrait **101 spécimens sur 29 composants** depuis les stories
  CSS-UI du design system, en important les fichiers TypeScript directement — Node 22
  efface les annotations, donc aucun parseur maison. `Tabs.stories.ts` est sauté
  (composant Angular) et listé, dans le JSON comme dans l'app.
- `PreviewFrame` injecte les overrides de tokens dans l'iframe same-origin. Vérifié :
  changer `--ref-color-orange-100` fait passer le bouton primaire de `rgb(255,103,38)`
  à `rgb(0,160,0)`, sans rebuild.
- La vue Composants devient utilisable : 29 composants, preview des vrais spécimens,
  et édition des primitives de couleur avec le nombre de dépendants.
- `data/tokens.json` décrit chaque token — tier, valeur brute, alias, valeur finale.
- `public/ds/` et `data/` sont commités : ce sont les snapshots du mode démo.

### Étape 1 — Build chaîné et garde-fou

- `pnpm ds:build` regénère le CSS des tokens avec `outputReferences: true` : les alias
  restent des `var()`, donc le navigateur résout la chaîne `ref → sys → comp`.
- `pnpm ds:verify` prouve la fidélité du build — byte-match exact contre le CSS commité
  dans le design system, puis équivalence après résolution. 723 tokens, 527 chaînés,
  aucun écart sur desktop et mobile.
- Vérifié en plus dans un vrai navigateur : `getComputedStyle` donne des valeurs
  identiques pour les 723 tokens entre la feuille aplatie et la feuille chaînée.
- `tools/ds-repo.mjs` lit le design system par `git show`, donc la baseline `master`
  reste lisible quelle que soit la branche sortie localement.
- `tools/css-vars.mjs` (parsing et résolution de `var()`) couvert par 11 tests sur fixtures,
  qui tournent en CI sans le repo design system.

### Étape 0 — Fondations

- Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui (base Radix, preset Nova), pnpm.
- Vitest, Prettier, ESLint, CI GitHub Actions (format, lint, typecheck, test, build).
- Les dix ADR de cadrage, écrits avant la première ligne de moteur.
- `docs/` : architecture, modèle de données, journal de migration.
