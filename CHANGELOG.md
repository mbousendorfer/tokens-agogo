# Changelog

Une entrée par étape livrée. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

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
