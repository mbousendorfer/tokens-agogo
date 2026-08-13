# État de la migration

Lecture narrative de la migration du design system. La source machine est `migration-state.json`.

## Où on en est

**Rien n'est migré.** L'outil est en construction ; le design system est intact sur `master`.

## Le point de départ (`master`, mesuré le 2026-08-13)

| Mesure                                          | Valeur                                       |
| ----------------------------------------------- | -------------------------------------------- |
| Tokens définis                                  | 155 `ref` · 129 `sys` · 439 `comp`           |
| `comp` qui aliasent un `ref` au lieu d'un `sys` | 232 sur 439, plus 30 en dur                  |
| `var(--ref-*)` bruts dans le code               | 1 884 occurrences, 103 noms                  |
| `var(--comp-*)`                                 | 1 234 occurrences, 404 noms                  |
| `var(--sys-*)`                                  | 104 occurrences, **32 noms sur 129 définis** |

Trois choses à retenir de ces chiffres :

1. **Le layer `sys` actuel est presque mort et de toute façon inadapté.** 97 de ses 129 tokens ne sont jamais utilisés, et il est organisé par famille et état (`main`, `accent`, `error`…) là où Figma organise par rôle (`surface`, `text`, `border`, `icon`, `link`, `data`). Ce sont deux axes différents : on substitue, on ne renomme pas.

2. **La dette a deux visages, et ils ne coûtent pas la même chose.** 232 tokens `comp` mal aliasés se corrigent **en éditant des JSON, sans toucher un seul composant**. Les 1 884 call sites bruts, eux, demandent d'éditer des `.scss`. Le premier chantier est bien moins risqué et doit passer en premier.

3. **La couche `comp` ne peut pas disparaître d'un coup.** 404 noms `--comp-*` sont consommés par les composants Angular et la couche CSS-UI. Il faut d'abord les re-pointer vers `sys`, ensuite seulement réécrire les call sites.

## Le séquencement prévu

| #   | Étape                                                            | Touche                         |
| --- | ---------------------------------------------------------------- | ------------------------------ |
| 1   | Générer `ref` et `sys` depuis les variables Figma                | ajoute des JSON, ne casse rien |
| 2   | Re-pointer les 439 `comp` vers `sys`                             | **JSON uniquement**            |
| 3   | Réécrire les 1 884 call sites `--ref-*`, composant par composant | les `.scss`                    |
| 4   | Retirer l'ancien layer `sys` et réduire `comp` aux exceptions    | JSON + nettoyage               |

## Anomalies repérées en chemin

- **21 tokens référencés mais définis nulle part** — ni par Style Dictionary, ni par une feuille de style. Ces règles tombent silencieusement dans le vide. La liste complète, avec fichier et ligne, est dans la vue Tokens de l'app. Les plus parlants :
  - `--ref-line-height-sm` (8 usages) et sept autres primitives inexistantes : `--ref-border-radius-lg`, `--ref-border-radius-xs`, `--ref-font-weight-standard`, `--ref-line-height-xs`, `--ref-color-electric-blue-85`, `--ref-color-electric-blue-30`, `--ref-color-grey-15`, `--ref-color-grey-90` ;
  - les cinq `--comp-input-text-counter-*` d'`input.component.scss` ;
  - les quatre `--comp-snackbar-{info,warning}-*`, dont `components/snackbar.json` ne définit que les variantes `success` et `error` ;
  - `--sys-color-accent-default` et `--sys-color-border-color-default` dans `_helpers.scss` ;
  - **`--ref-color-twitter-100--ref-color-tiktok-default-100`** (`social-button.component.scss:537`) — deux noms de tokens concaténés par erreur.

  Attention en les traitant : le design system déclare aussi des custom properties locales avec un préfixe `--comp-` (`--comp-avatar-size: 16px` dans `status-card`). Elles sont légitimes et ne font pas partie de cette liste.

- **`nav-selector`** est le composant le plus en retard : il n'est jamais entré dans le système à trois niveaux — aucun fichier de tokens `comp`, et une consommation massive de primitives brutes.
- **`_colors.scss`** (331 lignes de maps Sass) est une quatrième palette, antérieure au pipeline de tokens, consommée par le thème Angular Material. Hors périmètre v1, mais à ne pas oublier.
