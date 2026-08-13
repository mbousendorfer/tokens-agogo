# 011 — L'app est un éditeur, pas un tableau de bord

- **Date** : 2026-08-13
- **Statut** : accepté
- **Supersede** : [007](007-plugin-figma-maison.md)

## Contexte

Les étapes 3 à 8 ont produit des vues qui **constatent** : dette par composant, call sites, verdicts, plan d'opérations. Tout est juste, et tout est en lecture seule.

Ce n'était pas la demande. Depuis le premier échange : « une web app qui me permet de modifier facilement les variables CSS utilisées par les composants ». Le travail de migration, c'est parcourir les déclarations d'un composant et **choisir le nouveau token pour chacune**. Un tableau de bord qui affiche 1 793 call sites sans permettre d'en traiter un seul ne fait pas ce travail : il le décrit.

Le plugin Figma allait dans le même sens — de l'outillage autour d'un atelier qui n'existait pas.

## Décision

**Le cœur de l'app est le sélecteur de token.** Pour chaque déclaration d'un composant — propriété, état, sélecteur, token actuel — on choisit le token cible. Tout le reste sert cet écran ou n'existe pas.

- Les décisions s'accumulent, rien n'est écrit dans le design system tant qu'on n'a pas exporté.
- Le changeset devient la liste des décisions prises, pas une analyse générée.
- **Plus de plugin Figma.** Les variables cibles sont récupérées via le MCP Figma et commitées comme données ; l'app propose cette liste.

## Conséquences

- Les vues Tokens et Palettes restent, mais comme surfaces de consultation autour de l'atelier — pas comme livrable principal.
- Le sélecteur porte toute la qualité de l'outil : recherche, tri par pertinence selon la propriété CSS, valeur résolue et pastille pour chaque candidat, et l'écart de rendu affiché **après** le choix.
- La suggestion par propriété (`background-color` → `surface`) est un **ordre de tri**, jamais une décision automatique. Voir [ADR 003](003-migration-par-intention.md).
- L'export produit le changeset des décisions réellement prises.

## Alternatives écartées

- **Écrire directement dans le repo design system à chaque choix** — plus direct, mais on perd la relecture d'ensemble avant d'appliquer, et un clic malheureux modifie le design system.
- **Garder le plugin Figma** — le MCP suffit à récupérer les variables, et un plugin est une pièce de plus à installer et à maintenir pour un besoin ponctuel.
