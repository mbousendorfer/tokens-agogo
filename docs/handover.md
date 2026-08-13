# Reprise — état du projet

Écrit pour repartir sans avoir à relire l'historique. Le pourquoi des choix est dans
[`docs/decisions/`](decisions/) ; ce fichier dit **où en est le travail**.

## Ce que l'app est

Un atelier pour migrer les tokens du Design System Agorapulse de `ref → comp` vers
`ref → sys → comp(exceptions)`. Le cœur est le **sélecteur de token** : on parcourt les
déclarations CSS d'un composant et on choisit la cible de chacune. Tout le reste sert
cet écran ([ADR 011](decisions/011-editeur-plutot-que-tableau-de-bord.md)).

Baseline : `master` du design system. Rien n'est écrit dans le design system — les
décisions s'accumulent et s'exportent.

## Démarrer

```bash
echo 'DS_REPO_PATH=/Users/<vous>/code/design-system' > .env.local
pnpm install && pnpm ds:sync && pnpm dev
```

`pnpm check` rejoue toute la CI ; le lancer avant de pousser, `.next/` en local masque
les types générés manquants.

## Les données, et qui les produit

| Fichier                                | Script         | Contenu                                                 |
| -------------------------------------- | -------------- | ------------------------------------------------------- |
| `public/ds/*.css`                      | `ds:build`     | tokens chaînés (`outputReferences`) + aplatis           |
| `data/tokens.json`                     | `ds:build`     | tier, valeur brute, alias, valeur finale                |
| `public/ds/style/`, `fonts/`, `icons/` | `ds:assets`    | le vrai CSS-UI, les fontes, les icônes                  |
| `data/specimens.json`                  | `ds:specimens` | 101 spécimens extraits des stories CSS-UI               |
| `data/declarations.json`               | `ds:usage`     | ~3 200 déclarations : sélecteur, état, propriété, token |
| `data/figma-tokens.json`               | `ds:figma`     | les 348 variables Figma, cibles du sélecteur            |
| `dist/tokens/**`                       | `ds:emit`      | JSON Style Dictionary générés depuis Figma              |
| `migration-state.json`                 | l'app          | les décisions par déclaration                           |
| `token-overrides.json`                 | l'app          | les redéfinitions de tokens `sys`                       |

Les TSV bruts de Figma sont dans `figma-export/`, extraits via le MCP (`use_figma`).
Pour les rafraîchir, voir [`figma-bindings/README.md`](../figma-bindings/README.md).

## Garde-fous à ne pas casser

- **`pnpm ds:verify`** — notre build aplati doit rester **byte-identique** au CSS commité
  du design system, et la feuille chaînée doit résoudre aux mêmes valeurs. C'est ce qui
  rend un changeset digne de confiance.
- **`style-dictionary` épinglé en 3.9.2** — la v4 renomme `name/cti/kebab`.
- **Le CSS du design system ne rentre jamais dans le document de l'app** : il émet des
  sélecteurs de balises globaux qui cassent le preflight Tailwind. Il vit dans l'iframe
  `/preview`, d'où les deux route groups `(app)` et `(preview)`.
- **Jointure Figma ↔ code par les noms, jamais par les `VariableID`.**

## Ce qui reste à faire

### 1. Le panneau de preview — le plus urgent

La preview est une iframe de 220 px sous le tableau. Les composants larges (`infobox`,
`table`, `datepicker`) y sont illisibles, et on ne peut pas comparer.

À faire : un **panneau latéral dépliable depuis la droite**, plein hauteur, avec
**avant / après côte à côte** — le rendu avec les tokens actuels contre le rendu avec
les décisions prises. Le sélecteur d'état et de spécimen vivent dans le panneau.

Le modèle est dans `~/sources/agorapulse-color-lab`.

### 2. Les bindings composants Figma

L'extraction fonctionne (`figma-bindings/README.md`), mais **V2 Atoms n'est pas encore
migré vers la nouvelle palette** : `Button` lie ses fonds à `Colors/Orange/orange-100`,
l'échelle V2. Les confronter au code dirait où le design en est, pas où aller.

À reprendre quand V2 Atoms et V2 Molecules auront adopté les nouvelles variables. La
structure attendue (variante × partie × propriété) est déjà la bonne.

### 3. Appliquer le changeset

Le changeset s'exporte en Markdown mais rien ne l'applique. Il manque le script qui
réécrit les `.scss` du design system à partir de `migration-state.json`, avec un
`--dry-run` et un diff.

### 4. Le mode `Accessible`

Les collections Figma `System` et `Component` portent un second mode, stocké dans
`data/figma-tokens.json` (`accessibleValue`) et signalé dans l'app — mais rien ne
l'exploite. C'est une seconde dimension de tokens, pas un détail : le design system
l'avait explorée puis abandonnée sur sa branche V3.

### 5. Points plus petits

- Le générateur de palette s'édite mais ne se sauvegarde pas : l'export produit un
  `palette.baseline.json` à recopier à la main dans `spec/`.
- La preview injecte la **valeur résolue** des tokens Figma, faute de leur existence
  dans le CSS du design system. Quand `ds:emit` sera déposé, injecter des `var()`.
- 21 tokens sont référencés par le code sans être définis nulle part (liste dans la vue
  Tokens, onglet Existant) — dont une concaténation ratée à
  `social-button.component.scss:537`.

## Points de vigilance appris à la dure

- Le scanner SCSS traite quatre cas que le corpus contient réellement : interpolation
  (`--ref-color-#{$c}-100`), `_` dans les custom properties, maps Sass et arguments de
  mixin, fallbacks qui sont eux-mêmes des tokens. Couverture vérifiée : **zéro écart**
  sur 119 fichiers, contre un `grep` brut. Toute évolution du scanner doit refaire ce
  contrôle.
- Une déclaration est **une** ligne même avec plusieurs `var()` :
  `padding: 0 var(--a) 0 var(--b)`.
- Le thème vient d'un cookie lu par le layout, qui doit rester `force-dynamic`.
