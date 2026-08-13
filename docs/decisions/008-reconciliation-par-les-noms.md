# 008 — Réconciliation Figma ↔ code par les noms, jamais par les IDs

- **Date** : 2026-08-13
- **Statut** : accepté

## Contexte

L'API Figma identifie chaque variable par un `VariableID:123:456`, et les alias sont encodés comme `{ type: 'VARIABLE_ALIAS', id: 'VariableID:123:456' }`. C'est l'identifiant naturel, et c'est un piège.

Ces IDs sont **locaux au fichier**. Ils ne survivent ni à une duplication de fichier, ni à une recréation de collection, ni au passage d'un fichier d'exploration à un fichier de production. Une table de correspondance construite sur les IDs se casse silencieusement le jour où le fichier Figma est dupliqué — et le symptôme n'est pas une erreur, c'est un mapping qui pointe ailleurs.

Les **noms** (`color/surface/interactive/hovered`) sont stables : c'est le contrat que les designers maintiennent, et c'est ce qui se transpose en nom de token CSS.

## Décision

Toute jointure entre Figma et le code se fait **par les noms**.

Les IDs sont conservés dans le snapshot, mais uniquement comme clé de jointure **interne au snapshot** : résoudre un alias vers la variable qu'il vise, à l'intérieur du même export. Chaque alias exporté porte donc aussi le nom de sa cible :

```json
{ "$alias": "VariableID:123:456", "$aliasName": "color/surface/default" }
```

Rien en dehors du snapshot ne référence un ID Figma. `migration-state.json` en particulier n'en contient aucun.

La transformation nom Figma → nom de token suit exactement le transform `name/cti/kebab` de Style Dictionary : `color/surface/interactive/hovered` → `sys.color.surface.interactive.hovered` → `--sys-color-surface-interactive-hovered`.

## Conséquences

- Un renommage de variable dans Figma apparaît comme une suppression plus un ajout. C'est correct : un renommage sémantique **est** un changement de contrat, et il doit être vu comme tel.
- Le rapport d'écarts se lit en trois catégories : dans Figma et pas dans le code, dans le code et pas dans Figma, présent des deux côtés avec une valeur ou un alias différent.
- Réimporter deux fois le même snapshot doit produire des JSON identiques. C'est un test.

## Alternatives écartées

- **Jointure par ID avec table de correspondance** — se casse silencieusement à la première duplication de fichier, et le symptôme est un mauvais mapping, pas une erreur.
- **Jointure par valeur** — deux variables partageant la même couleur deviennent indiscernables, et cela contredit frontalement [003](003-migration-par-intention.md).
