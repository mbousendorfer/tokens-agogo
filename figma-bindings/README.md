# Bindings composants Figma

Ce que chaque variante de composant lie à quelle variable, extrait de
[V2 Atoms](https://www.figma.com/design/GfIlJ7SMEljrkIjyo94c0R/) et
[V2 Molecules](https://www.figma.com/design/iu4GbBju893YBLchQBRIi8/).

C'est la seule source qui porte l'**intention** : « le fond de ce bouton, survolé,
doit être telle variable ». Sans elle, l'app peut aider à choisir un token mais pas
dire si le choix est conforme à ce que le design prescrit ([ADR 003](../docs/decisions/003-migration-par-intention.md)).

## Ce que l'extraction a révélé

**V2 Atoms n'est pas encore migré vers la nouvelle palette.** Le composant `Button`
(88 variantes) lie ses fonds à `Colors/Orange/orange-100`, ses bordures à
`Colors/Grey/grey-20` et son texte à `Colors/Grey/grey-80` — l'échelle V2
(`10…150`), pas la nouvelle (`100…800`).

Conséquence directe sur la migration : confronter le code aux bindings actuels de
V2 Atoms ne dirait pas où aller, mais où le design en est. Les deux fichiers doivent
d'abord adopter les nouvelles variables ; l'app pourra alors trancher chaque
déclaration contre eux.

Ce qui reste vrai et exploitable dès maintenant : la **structure** des bindings —
quelle partie, quelle propriété, quelle variante — qui est exactement la grille dont
l'atelier a besoin.

## Extraire

Figma desktop ouvert sur le fichier voulu, puis via le MCP (`use_figma`) :

```js
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);

const namesOf = async (bound) => {
  const out = {};
  for (const prop of Object.keys(bound || {})) {
    const aliases = Array.isArray(bound[prop]) ? bound[prop] : [bound[prop]];
    const names = [];
    for (const alias of aliases) {
      if (!alias?.id) continue;
      const variable = await figma.variables.getVariableByIdAsync(alias.id);
      if (variable) names.push(variable.name);
    }
    if (names.length) out[prop] = names.join('|');
  }
  return out;
};

const lines = [];
const walk = async (node, path, variant) => {
  const bound = await namesOf(node.boundVariables);
  for (const prop of Object.keys(bound)) {
    lines.push([variant, path.join(' / ') || node.name, prop, bound[prop]].join('\t'));
  }
  if ('children' in node)
    for (const child of node.children) await walk(child, path.concat(child.name), variant);
};

for (const set of page.findAllWithCriteria({ types: ['COMPONENT_SET'] })) {
  for (const variant of set.children) await walk(variant, [], variant.name);
}
return lines.join('\n');
```

Le résultat se dépose ici en `<composant>.tsv`, une ligne par binding :

```
variante	partie	propriété	variable
```

V2 Atoms range **un composant par page** ; les identifiants de page se listent avec
`figma.root.children.map((p) => ({ id: p.id, name: p.name }))`.
