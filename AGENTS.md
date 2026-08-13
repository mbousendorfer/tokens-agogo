<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tokens à gogo — règles projet

## Ce repo n'applique pas le Design System Agorapulse à sa propre interface

**C'est la règle la plus importante.** Cette app **inspecte** le design system Agorapulse ; elle n'en est pas un consommateur.

- L'interface de l'app est en **Tailwind + shadcn/ui**. On n'y utilise jamais `ap-*`, `.ap-*`, `--ref-*`, `--sys-*` ni `--comp-*`.
- Le CSS du design system est chargé **uniquement** dans l'iframe de preview (`src/app/preview/`), jamais dans le layout principal. Il émet des sélecteurs de balises globaux qui cassent le preflight Tailwind. Voir [ADR 005](docs/decisions/005-isolation-iframe.md).
- Si la skill `design-guidelines` se déclenche et pousse les conventions du design system sur du code shadcn : ne pas la suivre, c'est un faux positif.

Les tokens du design system sont ici des **données**, pas des styles.

## Méthode de travail

- **Commits successifs, petits et atomiques.** Chaque commit laisse le repo cohérent. Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`).
- **`pnpm ci` avant de pousser, et vérifier le run après.** Le vert local ne prouve pas le vert en CI : `.next/` traîne en local et masque les types générés manquants. Un `rm -rf .next` avant `pnpm ci` reproduit un checkout frais.
- **La doc s'écrit avec le code, pas après.** Un commit qui introduit un comportement embarque sa doc.
- **Une décision structurante = un ADR** dans `docs/decisions/`, écrit au moment où elle est prise. Un ADR ne se réécrit jamais : s'il devient faux, un nouvel ADR le supersede.
- Une étape n'est finie que quand code, tests, doc et changelog sont à jour.

## Invariants à ne pas casser

- **Baseline `master`.** La branche `feature/ds-v3-…` du design system et le package npm `@agorapulse/ui-theme@beta` sont une tentative précédente, écartée. Ni source, ni référence. Le tag `latest` (22.0.1) est le seul acceptable en secours. Voir [ADR 001](docs/decisions/001-baseline-master.md).
- **La migration se pilote par l'intention, pas par la ressemblance des couleurs.** Pas de ΔE, pas de plus proche voisin dans le choix d'un token. Les outils colorimétriques servent à l'édition de palette et à l'accessibilité. Voir [ADR 003](docs/decisions/003-migration-par-intention.md).
- **Jointure Figma ↔ code par les noms, jamais par les IDs.** Voir [ADR 008](docs/decisions/008-reconciliation-par-les-noms.md).
- **`style-dictionary` reste épinglé en 3.9.2.** La v4 renomme `name/cti/kebab` et ferait dériver tous les noms de tokens.
- **La logique métier ne connaît pas React.** Parsing, graphe, index, alignement : TypeScript pur sous `src/lib/`, testé sans navigateur.
- **Un seul accès disque**, via `src/server/`. Jamais depuis un composant.
- **Tout JSON commité est stable en diff** : clés triées, indentation constante.

## Lecture d'entrée

`docs/decisions/` d'abord, puis `docs/architecture.md`. Le plan complet du projet est résumé dans le README.
