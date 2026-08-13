# Agorapulse Token Export

Plugin Figma de tokens-agogo. Il extrait ce qu'aucun export tiers ne produit : les **bindings de variables par variante de composant**.

## Pourquoi un plugin maison

L'API REST Variables de Figma est réservée aux plans Enterprise, et Agorapulse est sur un plan Organization. L'API Plugin, elle, n'a aucune restriction de plan — voir [ADR 007](../docs/decisions/007-plugin-figma-maison.md).

Les exports tiers savent sortir les variables, mais pas les `boundVariables` de chaque calque de chaque variante. Or c'est exactement ce qui porte l'intention : « le fond de ce bouton, dans cet état, doit être `color/surface/interactive/hovered` ».

`networkAccess: none` — le plugin ne peut prouvablement rien envoyer nulle part. L'export est un téléchargement local déclenché par un clic.

## Installation

Figma desktop → **Plugins** → **Development** → **Import plugin from manifest…** → choisir `figma-plugin/manifest.json`.

Pas de publication, pas de revue Figma. Quinze secondes.

## Utilisation

| Fichier Figma                                  | Bouton                 | Produit                 |
| ---------------------------------------------- | ---------------------- | ----------------------- |
| [V2 Style Guide 2.0 - Tokens][tokens]          | Exporter les variables | `figma-variables.json`  |
| [V2 Atoms][atoms] et [V2 Molecules][molecules] | Exporter les bindings  | `figma-components.json` |

Déposer les fichiers obtenus dans `figma-snapshots/<fileKey>/<date>.json` et les commiter : le `git diff` entre deux snapshots **est** le changelog Figma, sans API ni webhook.

Puis :

```bash
pnpm ds:figma
```

## Ce que le plugin ne fait pas

Il dumpe, il ne raisonne pas. `valuesByMode` sort **non résolu**, et toute la réconciliation vit dans `tools/import-figma.mjs` — un script Node testable, diffable et relisible en pull request.

Un point de conception qui compte : chaque alias porte **aussi le nom** de sa cible (`$aliasName`). Les `VariableID` ne survivent ni à une duplication de fichier ni à une recréation de collection ; les noms si. Toute jointure en aval se fait sur le nom ([ADR 008](../docs/decisions/008-reconciliation-par-les-noms.md)).

[tokens]: https://www.figma.com/design/ZXNsdFTc17AM5qk6DZc07A/
[atoms]: https://www.figma.com/design/GfIlJ7SMEljrkIjyo94c0R/
[molecules]: https://www.figma.com/design/iu4GbBju893YBLchQBRIi8/
