# 012 — La preview est un panneau docké, en avant / après

- **Date** : 2026-08-13
- **Statut** : accepté

## Contexte

La preview était une iframe de 220 px de haut posée sous le tableau de déclarations. Trois problèmes, qui sont le même :

- Les composants larges — `infobox`, `table`, `datepicker`, `select` — n'y tiennent pas. On voyait un coin.
- Elle défile avec la page. Dès qu'on descend dans le tableau, la ligne qu'on décide et le composant qu'elle peint ne sont plus à l'écran ensemble.
- Elle ne montrait **qu'un** rendu : celui avec les décisions appliquées. Or la question qu'on se pose en décidant n'est pas « à quoi ça ressemble », c'est « qu'est-ce que ça change ».

Décider sans voir ce qu'on change, c'est décider sur le nom du token. C'est exactement ce que l'atelier était censé remplacer ([ADR 011](011-editeur-plutot-que-tableau-de-bord.md)).

## Décision

**La preview devient un panneau docké à droite du tableau, plein hauteur, redimensionnable, qui montre le composant avant et après.**

- « Avant » rend la baseline `master`, sans aucun override. « Après » applique les décisions en cours. Le troisième mode n'affiche que l'un des deux, en pleine largeur.
- Le panneau est **collant** : le tableau défile, le composant reste.
- Le sélecteur de spécimen et celui d'état vivent dans le panneau, avec ce qu'ils pilotent. L'état choisi continue de filtrer le tableau — on regarde un état, on traite les déclarations de cet état.
- La largeur se règle à la poignée et se retient (`localStorage`). En dessous de 620 px, la comparaison passe en haut / bas : deux colonnes plus étroites qu'un `datepicker` ne comparent rien.

Le modèle est le dock de `agorapulse-color-lab`, qui a résolu le même problème.

### Trois conséquences techniques qui ne sont pas des détails

**Les deux cadres restent montés en permanence**, y compris quand un seul est visible. Rebooter une iframe reparse tout le CSS du design system et ses masques d'icônes, et perd la position de défilement. À deux cadres, c'est le double.

**Changer de spécimen navigue par `location.replace()`**, jamais en réaffectant l'attribut `src`. Une navigation d'iframe par attribut empile une entrée dans l'historique du **parent** : le bouton Précédent du navigateur se mettait à rejouer les spécimens un par un au lieu de quitter la page.

**Changer d'état ne navigue pas du tout.** L'état forcé est un attribut `data-force` posé sur le `<html>` du cadre, que les règles dérivées reconnaissent comme ancêtre. Un attribut plutôt qu'une classe parce que ce `<html>` est rendu par React : l'hydratation réconcilie ce qu'elle rend — `lang`, `class` — et laisse intact un attribut qu'elle n'a jamais écrit. Le document de preview porte `suppressHydrationWarning` : ces deux nœuds sont pilotés de l'extérieur, et l'écart est voulu.

## Conséquences

- Le tableau et la vue CSS deviennent les deux onglets de la colonne d'édition. On décide à gauche, on regarde à droite.
- Le panneau se replie ; fermé, il rend toute la largeur au tableau.
- En dessous de `lg`, le panneau repasse sous le tableau, à hauteur fixe : un dock latéral sur un écran étroit ne laisse de place ni à l'un ni à l'autre.
- Un défaut est apparu en construisant la comparaison, et il était antérieur : la dérivation des états forçables traitait `:hover:not(:disabled)` comme portant **deux** états, produisait `:not()` — invalide, jeté en silence par le navigateur — et le survol des variantes ne peignait rien. La dérivation est passée en logique pure et testée (`src/lib/forced-states.ts`), avec le comptage des pseudo-classes au seul premier niveau du sélecteur.

## Alternatives écartées

- **Une modale plein écran** — elle cache le tableau, donc elle interdit de décider en regardant. Le geste utile est « je change ce token et je vois », pas « j'ouvre, je regarde, je ferme ».
- **Un panneau flottant en `position: fixed`** — il aurait fallu réserver sa place dans la vue centrée à coups de marge. Un `sticky` dans une rangée flex fait la même chose en CSS pur, et suit le `max-width` de la vue sans le connaître.
- **Un curseur de fondu entre avant et après** — joli, et illisible : on compare deux états d'un composant, pas deux photos. Côte à côte, les deux sont lisibles en même temps.
