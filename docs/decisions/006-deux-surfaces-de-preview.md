# 006 — Deux surfaces de preview : CSS-UI et Storybook proxifié

- **Date** : 2026-08-13
- **Statut** : accepté

## Contexte

L'exigence est de prévisualiser les **vrais** composants du design system, pas des répliques.

La couche CSS-UI (`libs/ui-theme/assets/style/css-ui/`) est du vrai CSS du design system, pilotée de bout en bout par les mêmes `var(--comp-*)` que les composants Angular, sur du markup ordinaire (`<button class="ap-button primary orange">`). Elle est utilisable telle quelle dans une page React.

Mais elle ne couvre pas tout : 37 partials pour 56 entry points. Le Storybook du design system sert 330 stories, dont environ un tiers seulement pour CSS-UI. Les composants les plus lourds en dette de tokens — `nav-selector`, `select`, `paginator`, `autocomplete`, `datepicker` — sont côté Angular.

## Décision

Deux surfaces, complémentaires.

**Surface A — CSS-UI dans l'iframe `/preview`.** Voir [005](005-isolation-iframe.md). Couvre les composants CSS-UI, sans aucune dépendance à un serveur externe.

**Surface B — le Storybook du design system.** `design.agorapulse.com` ne renvoie ni `X-Frame-Options` ni `frame-ancestors` : il est embeddable.

- **En local** : un rewrite Next.js `/storybook/*` → `localhost:6006` le rend **same-origin**, ce qui permet d'injecter `tokens.chained.css` et le bloc d'overrides directement dans son `<head>`. **Aucune modification du repo design system.** C'est le chemin par défaut.
- **Sur la démo déployée** : cross-origin, donc il faudrait un décorateur `postMessage` d'environ 25 lignes dans `apps/web/.storybook/preview.ts` — additif, inerte sans message, origines en allowlist. Optionnel, à proposer en PR seulement si on veut les composants Angular sur la démo publique.

## Conséquences

- La surface A se construit en premier : elle est autonome et suffit à valider toute la chaîne d'édition de tokens.
- La surface B demande un Storybook lancé en local (`ng run web:storybook`, port 6006). L'app doit le détecter et se dégrader proprement s'il est absent.
- Les spécimens de la surface A ne s'écrivent pas à la main : `apps/web/src/stories/css-ui/` contient 31 fichiers de vrai markup `.ap-*` littéral, avec leurs `args` et `argTypes` — donc les états (`hover`, `disabled`, variantes) que la vue d'audit doit montrer. On les extrait.
- Une limite connue de la surface B sur la démo publique : le Storybook déployé charge un `desktop_variables.css` aplati, donc un override ne propage qu'au token modifié. Le chemin local, lui, sert notre feuille chaînée.

## Alternatives écartées

- **Répliques HTML/React des composants** — l'exigence était explicitement les vrais composants, et une réplique dérive dès la première évolution du design system.
- **Angular Elements** — compiler les 89 composants Angular en custom elements imposerait un runtime Angular, Angular Material, le CDK et sept autres pairs dans le bundle Next, plus le marshalling manuel des signal inputs. Des semaines de travail pour moins que ce que la surface B donne en deux jours.
- **Une seule surface CSS-UI** — laisserait hors de portée les composants qui portent le plus de dette.
