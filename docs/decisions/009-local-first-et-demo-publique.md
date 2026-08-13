# 009 — Local-first, avec une démo publique en lecture seule

- **Date** : 2026-08-13
- **Statut** : accepté

## Contexte

L'app doit lire le repo design system — les JSON de tokens, les `.scss` des composants, le CSS-UI compilé, les stories — et, pour être utile, écrire dedans : les JSON de tokens générés et le changeset.

Elle doit aussi être montrable : un lien qu'on ouvre en réunion sans cloner quoi que ce soit.

Ces deux besoins sont incompatibles dans une seule configuration. Un déploiement public n'a pas accès à `~/code/design-system`, et n'a aucune raison d'avoir un droit d'écriture.

## Décision

Deux modes, une seule interface `DataSource` côté client.

**Mode local** — `DS_REPO_PATH` pointe sur le repo design system. Les Route Handlers lisent les fichiers réels à chaque requête, sur la branche courante du repo, affichée dans l'UI. L'écriture est possible : JSON de tokens, changeset. C'est le mode de travail.

**Mode démo** — pas de `DS_REPO_PATH`. L'app sert des snapshots commités dans `data/`, en lecture seule, avec une bannière explicite. `pnpm sync` régénère ces snapshots depuis le repo local ; on les commit.

## Conséquences

- Tout accès disque passe par une couche unique (`src/server/ds-repo.ts`), jamais par du code de vue.
- Les scripts d'analyse prennent le repo design system en argument (`--ds-root`, défaut `../design-system`) et écrivent leur sortie dans `data/`, qui est commité. La web app reste un consommateur statique.
- La fraîcheur des données de la démo dépend d'un `pnpm sync` manuel. C'est assumé : pour un pilote, la reproductibilité et l'absence de secrets valent mieux que la fraîcheur automatique.
- Aucun secret, aucun backend, aucune base. Le déploiement est statique.
- Ce qui est scannable depuis le package npm public (la couche CSS-UI) reste analysable sans clone du design system, ce qui garde le repo utile pour quelqu'un qui le découvre.

## Alternatives écartées

- **Snapshots uniquement** — simple, mais interdit l'écriture et impose un cycle sync/recharge à chaque itération.
- **Upload de fichiers dans l'UI** — portable, mais manuel à chaque session et sans mémoire entre deux ouvertures.
- **Un backend avec base de données** — permettrait l'édition partagée en temps réel, au prix d'un service, de secrets et d'une authentification, pour un pilote à un ou deux utilisateurs.
