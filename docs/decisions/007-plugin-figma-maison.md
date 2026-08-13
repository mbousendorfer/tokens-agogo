# 007 — Plugin Figma maison pour extraire les `boundVariables` par variante

- **Date** : 2026-08-13
- **Statut** : accepté

## Contexte

L'app a besoin de deux extractions Figma ([002](002-figma-source-de-verite.md)) : les variables, et les bindings par variante de composant.

Les variables sont faciles à obtenir — plusieurs chemins existent. Les **bindings** le sont beaucoup moins : il faut parcourir chaque component set de `V2 Atoms` et `V2 Molecules`, chaque variante, chaque calque, et lire `boundVariables` pour savoir quelle variable est liée à `fills`, `strokes`, `cornerRadius`, `itemSpacing` ou à la typographie.

L'API REST Variables de Figma est réservée aux plans Enterprise (« you must have a Full seat in an Enterprise org ») et Agorapulse est sur un plan Organization. Conséquence unique : **pas de pull automatique en CI**. L'API Plugin, elle, n'a aucune restriction de plan.

## Décision

Un plugin Figma maison, versionné dans `figma-plugin/`, avec `networkAccess: { allowedDomains: ["none"] }` — il ne peut prouvablement rien exfiltrer, ce qui compte pour un repo public.

Il exporte deux choses :

1. les variables : collections, modes, alias, `scopes`, `codeSyntax`, `description`, avec `valuesByMode` **non résolu** ;
2. les bindings : `composant → variante → partie → propriété → variable`.

La logique de réconciliation reste **hors du plugin**, dans un script Node testable et diffable. Le plugin reste bête : il dumpe, il ne raisonne pas.

Installation : Figma desktop → Plugins → Development → Import plugin from manifest. Pas de publication, pas de revue Figma.

## Chemins complémentaires

- **MCP Figma** (`use_figma`) exécute du JS Plugin API dans le fichier ouvert, sans restriction de plan. Utile pour explorer et pour des syncs ponctuelles. Limites : le retour transite par le contexte de l'agent, donc pagination obligatoire sur ~750 variables ; Figma desktop doit être ouvert ; pas exécutable en CI.
- **`get_variable_defs`** renvoie les variables bindées à un nœud **sélectionné** — parfait pour inspecter un composant à la main, inadapté à une extraction exhaustive.
- **Un export tiers** (le plugin `variables-import-export` de Figma, format W3C DTCG) suffit à débloquer les variables au jour 1, mais ne produit pas les bindings.

## Conséquences

- Le plugin est le chemin sérieux, pas une option de confort.
- Les snapshots vivent dans `figma-snapshots/<fileKey>/<date>.json` et sont commités : le `git diff` entre deux snapshots est le changelog Figma, sans API ni webhook.
- Les `scopes` sont préservés, ce que la plupart des exports tiers perdent. Croisés avec la propriété CSS des call sites, ils produisent des constats du type « ce token est scopé `TEXT_FILL` mais sert de `background-color` à 4 endroits ».

## Alternatives écartées

- **Un plugin tiers seul** — instabilité de format hors de notre contrôle, perte des modes / `scopes` / `codeSyntax`, et surtout aucun accès aux `boundVariables` par variante. Un plugin tiers a par ailleurs un accès complet en lecture au fichier, sans `networkAccess` auditable.
- **L'API REST** — indisponible sur le plan de l'organisation.
- **Le MCP comme pipeline** — ergonomique en exploration, mais le coût en contexte et l'obligation d'avoir Figma desktop ouvert le disqualifient comme chemin principal.
