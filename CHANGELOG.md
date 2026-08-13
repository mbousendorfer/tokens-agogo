# Changelog

Une entrée par étape livrée. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

### Ajouter une couleur : résoudre avant de valider

- **Deux façons d'entrer**, parce qu'on arrive avec deux choses différentes en tête.
  _Depuis une couleur que j'ai_ : elle est épinglée telle quelle sur le barreau
  choisi, quitte à se poser hors de l'échelle. _Depuis une teinte_ : rien n'est
  imposé, les huit nuances sont résolues et tombent toutes sur l'échelle. Le
  formulaire ne proposait que la première, et forçait donc une réponse exacte à une
  question qui était souvent « je veux du magenta ».
- Une famille se réduit à **une teinte** : `addFamily` prend désormais une teinte et
  une ancre **facultative**, au lieu d'exiger un hex et un barreau.
- Le formulaire **résout la spec candidate avec le vrai moteur** et montre les huit
  nuances, le contraste 700/200 et son verdict, **avant** de valider. Il commettait
  à l'aveugle : on découvrait le résultat après coup.
- L'aperçu ne dépend **pas du nom** : le nom décide de l'identifiant du token, pas
  d'une seule des huit nuances. L'exiger laissait le formulaire mort à l'ouverture.
- Il annonce la conséquence qu'on ne peut pas deviner : une famille ajoutée entre
  dans la recherche du barreau 200, donc elle peut **déplacer l'échelle de toutes les
  autres**. Le ton suit la mesure — une teinte proche du vert reprend la contrainte
  en ne bougeant L200 que de 8·10⁻⁵, et l'app le dit ainsi.
- Il dit aussi où la couleur donnée se posera : `−0.140 L hors du barreau, le plus
proche de sa clarté est 700`.
- Étiquettes au-dessus des champs, nom du token en direct, `Annuler` explicite, et le
  formulaire vit **sous les ramps** — là où on tend la main — au lieu d'un popover.
- **L'anneau de focus redevient achromatique.** Il était saturé et large de 3 px :
  posé à vingt pixels d'une pastille qu'on essaie de juger, un halo teinté contamine
  la perception de cette pastille. Un outil qui juge la couleur n'a pas le droit
  d'en ajouter une au bord d'un champ.

### La page Palette dit enfin quelque chose

- La page empilait cinq sections sur le même sujet, dont **le même tableau de
  dérivation deux fois** et un générateur entièrement contenu dans l'éditeur. Rien
  ne disait laquelle des deux palettes affichées était la vraie.
- Elle suit maintenant l'ordre de la question : la palette livrée, **la règle et la
  preuve qu'elle la retrouve**, de quoi la déplacer, de quoi mesurer une paire.
- **La preuve est le nouveau cœur de la page** : rejouer les cinq nombres de la spec
  redonne **57 des 66 nuances à l'octet près, 9 à une unité sRGB, aucune au-delà**.
  Les 3 nuances hors barreau sont retrouvées exactement — ce sont les ancres de
  marque, hors échelle par décision. `src/lib/palette-proof.ts`, testé sur le corpus
  réel.
- Le tri du sélecteur remonte les tokens qui rendent exactement la valeur actuelle.

### Le panneau de comparaison

- **La preview devient un panneau docké**, plein hauteur et collant, à droite du
  tableau : on décide à gauche, on regarde à droite, sans que le composant sorte de
  l'écran. Redimensionnable à la poignée, largeur retenue.
  Voir [ADR 012](docs/decisions/012-panneau-de-comparaison.md).
- **Avant / après côte à côte** : la baseline `master` contre les décisions en cours.
  En dessous de 620 px de large, la comparaison passe en haut / bas.
- Les cadres ne se remontent plus : changer de spécimen navigue par
  `location.replace()`, changer d'état ne navigue pas du tout.
- **Correction** : `:hover:not(:disabled)` était lu comme portant deux états et
  produisait `:not()`, un sélecteur invalide — le survol des variantes ne peignait
  rien. La dérivation est passée en logique pure et testée (`src/lib/forced-states.ts`).
- **Le sélecteur de token trouve enfin ce qu'on tape** : plusieurs termes dans
  n'importe quel ordre, ponctuation ignorée (`mermaid` trouve `merm-aid`), recherche
  sur la couleur résolue (`#FF6726`) et sur le token pointé, et le vocabulaire du
  designer traduit vers celui des tokens (`brand` → `orange`, `danger` → `red`).
  Les suggestions passent par le même vocabulaire (`src/lib/token-search.ts`).

### Suivi de branche, générateur, suggestions

- **Sélecteur de branche** dans l'en-tête : les scripts lisant par `git show <ref>:<path>`,
  changer de branche ne touche pas au checkout du design system — on régénère les
  snapshots pour cette ref. C'est ce qui permet de suivre une branche de migration.
- **L'éditeur de palette passe par le solveur** : il édite la spec, le moteur re-résout.
  Une couleur ajoutée tombe sur la même échelle et tient la même contrainte de contraste.
- **Suggestions** en tête du sélecteur, sur le vocabulaire partagé avec le token courant.
- **L'état filtre le tableau** autant que la preview.
- `pnpm ds:emit` : les JSON Style Dictionary générés depuis les variables Figma.
- Changeset unifié : tokens émis, redéfinitions `sys`, call sites réécrits.
- [docs/handover.md](docs/handover.md) — l'état du travail et ce qui reste.

### Refonte — l'app devient un éditeur

Les vues précédentes constataient la dette sans permettre d'en traiter une seule ligne.
Ce n'était pas la demande. Voir [ADR 011](docs/decisions/011-editeur-plutot-que-tableau-de-bord.md).

- **Sélecteur de token** sur chaque déclaration : recherche, tri par pertinence selon la
  propriété CSS, valeur résolue et pastille pour chaque candidat, et repérage des tokens
  qui rendent exactement la même valeur qu'aujourd'hui.
- **Atelier par composant** : les déclarations groupées par état, filtrables sur
  « à traiter » / « décidé », avec la preview qui applique les décisions en direct.
- **Décisions persistées** dans `migration-state.json` (mode local), relues au chargement.
- **Changeset** : la liste des remplacements réellement décidés, groupés par fichier et
  par ligne, exportable en Markdown applicable. Signale les tokens cibles à créer.
- **Plugin Figma supprimé.** Les 348 variables cibles sont extraites via le MCP Figma
  (`use_figma`) et commitées dans `figma-export/` : `Reference` (130), `System` (137),
  `Component` (81), avec leur mode `Accessible`.
- Le sélecteur propose désormais **les vrais tokens Figma**, filtrés par leurs `scopes` —
  un token scopé `TEXT_FILL` ne sera pas proposé sur un `background-color`.

### Étapes 4 à 8 — Figma, alignement, palettes, changeset

- **Plugin Figma maison** (`figma-plugin/`) : exporte les variables _et_ les
  `boundVariables` par variante de composant, que produit aucun export tiers.
  `networkAccess: none`. Sans snapshot, `pnpm ds:figma` écrit un fichier vide et dit
  comment en produire un — l'app n'invente rien.
- **Vue Composants** : 79 composants classés par dette, et pour chacun ses
  déclarations groupées **par état** — la maille à laquelle Figma prescrit. Verdict
  par déclaration ; « conforme » et « à migrer » restent muets tant que la spec Figma
  n'est pas importée.
- **Vue Palettes** : 36 ramps, 117 primitives, luminosité OKLCH, détection des marches
  irrégulières, contraste WCAG 2.x bloquant et APCA (Lc) indicatif. Le module couleur
  est validé contre les valeurs de référence publiées (APCA 106,04 / −107,88).
- **Vue Changeset** : le plan d'opérations ordonné du moins risqué au plus risqué,
  exportable en `changeset.md` lisible par un humain et applicable par un agent.
- **Storybook proxifié** en same-origin sous `/storybook`, pour atteindre les
  composants Angular sans modifier le repo du design system.

### Étape 3 — Index de déclarations

- `pnpm ds:usage` relève chaque déclaration du design system avec son **sélecteur
  résolu, son état, sa propriété CSS** et son token — pas seulement un compteur de
  `var()`. 3 200 déclarations sur 119 fichiers.
- Couverture vérifiée fichier par fichier contre un grep brut : **zéro écart**.
- Vue Tokens : filtre par tier, orphelins, chaîne de résolution, et le détail des
  call sites réels par entry point sur `/tokens/<nom>`.
- Les deux dettes sont affichées séparément — 232 tokens de composant mal aliasés
  (correction en JSON) contre 1 793 usages de primitives brutes (correction en SCSS).
- **21 tokens référencés mais définis nulle part** remontés, avec fichier et ligne :
  des règles qui tombent silencieusement dans le vide dans le design system livré.

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
