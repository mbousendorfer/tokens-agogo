# 003 — La migration se pilote par l'intention, pas par le rapprochement de valeurs

- **Date** : 2026-08-13
- **Statut** : accepté

## Contexte

Un premier cadrage de ce projet proposait un moteur de correspondance par valeur : pour chaque token V2, trouver le token de la nouvelle palette dont la couleur est identique, ou le plus proche en ΔE. C'est une erreur de cadrage, corrigée avant la première ligne de code.

Ce que Figma redéfinit, ce sont des **rôles sémantiques** : `surface`, `text`, `border`, `icon`, `link`, `data`, chacun décliné par état. Une déclaration CSS doit utiliser le token qui décrit ce qu'elle fait, pas celui qui produit la couleur la plus proche de l'existant.

Le rendu final ressemblera souvent à l'actuel. Ce n'est pas un objectif, et ce n'est jamais le critère.

## Décision

L'unité de décision est la **déclaration CSS**, et la question posée est : « que dit Figma sur cette partie de ce composant dans cet état ? »

L'app produit pour chaque déclaration l'un de ces quatre verdicts :

| Verdict          | Signification                                                                        |
| ---------------- | ------------------------------------------------------------------------------------ |
| **conforme**     | le code utilise déjà le token prescrit                                               |
| **à migrer**     | Figma prescrit un token, le code en utilise un autre — la cible est connue           |
| **non spécifié** | aucun binding Figma correspondant — décision manuelle, assistée mais pas automatique |
| **exception**    | divergence assumée et justifiée, qui matérialise un token `comp` conservé            |

Le diff visuel existe, mais il arrive **après** la décision : c'est un outil de relecture et de détection de régression, jamais un critère de choix.

## Conséquences

- La migration se pilote **composant par composant depuis la spec Figma**, pas token par token depuis une table de correspondance.
- L'index de code doit capturer le **sélecteur, l'état et la propriété CSS** de chaque déclaration, pas seulement le nom du token. Un simple compteur de `var()` ne suffit pas.
- La vue Composants est la vue principale de l'app ; tout le reste existe pour la rendre possible.
- Aucun calcul de ΔE, de plus proche voisin ou de distance colorimétrique n'entre dans la décision. Les outils colorimétriques (OKLCH, WCAG, APCA) servent à l'édition de palette et à l'accessibilité, pas au mapping.
- Le nombre de déclarations « non spécifié » restant après alignement est une métrique utile : il indique ce que Figma devrait spécifier et ne spécifie pas encore.

## Alternatives écartées

- **Correspondance par valeur exacte puis ΔE** — produirait une migration qui préserve le rendu et rate le but. Sur `master`, seules 35 des 117 couleurs ont un équivalent exact dans la nouvelle palette, ce qui rendait de toute façon l'approche majoritairement approximative.
- **Inférence automatique du rôle depuis la propriété CSS seule** — `background-color` → `surface` est un indice, pas une réponse : une surface d'erreur, interactive ou par défaut partagent la même propriété. L'inférence n'intervient qu'en assistance sur les cas « non spécifié ».
