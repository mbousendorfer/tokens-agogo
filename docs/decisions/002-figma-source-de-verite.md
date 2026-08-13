# 002 — Figma source de vérité, variables **et** bindings composants

- **Date** : 2026-08-13
- **Statut** : accepté

## Contexte

Le design system est aujourd'hui alimenté par transcription manuelle depuis Figma. Les fichiers de tokens portent des commentaires du type « Transcribed from the Figma collection `System Tokens`… Read 2026-08-05 ». Rien ne détecte une dérive entre ce que Figma dit et ce que le code fait.

Deux fichiers Figma portent l'information, et ils ne disent pas la même chose :

- `V2 Style Guide 2.0 - Tokens` (`ZXNsdFTc17AM5qk6DZc07A`) — les variables : palette et rôles sémantiques.
- `V2 Atoms` (`GfIlJ7SMEljrkIjyo94c0R`) et `V2 Molecules` (`iu4GbBju893YBLchQBRIi8`) — les composants, et surtout **quelle variable est liée à quelle propriété de quelle partie, dans quel état**.

## Décision

Figma est la source de vérité. L'app importe **deux choses**, pas une :

1. **Les variables** — collections, modes, alias, `scopes`, `codeSyntax` → génèrent les JSON Style Dictionary des layers `ref` et `sys`.
2. **Les bindings composants** — pour chaque component set, chaque variante, chaque calque : le `boundVariables` qui dit quelle variable est liée à `fills`, `strokes`, `cornerRadius`, `itemSpacing`, la typographie.

L'app ne décide jamais à la place de Figma. Quand Figma ne dit rien, l'app le signale comme « non spécifié » plutôt que de deviner silencieusement.

## Conséquences

- L'import Figma est en deux scripts distincts, avec deux formats de snapshot.
- La seconde extraction (bindings) est ce qui rend possible la vue principale de l'app. Sans elle, il ne reste qu'une table de correspondance de tokens, ce qui n'est pas le sujet — voir [003](003-migration-par-intention.md).
- Aucun export Figma tiers ne produit les `boundVariables` par variante, d'où [007](007-plugin-figma-maison.md).
- Les snapshots sont commités : le `git diff` entre deux snapshots est le changelog Figma.

## Alternatives écartées

- **Le code comme source de vérité, Figma se réaligne** — inverse le sens du travail de design déjà fait et condamne à refaire la transcription à l'envers.
- **N'importer que les variables** — suffit à générer les tokens, mais laisse entière la question « quel token pour cette déclaration ? », qui est le vrai travail.
