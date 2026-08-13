/**
 * Scanner de déclarations SCSS.
 *
 * On ne relève pas des `var()` : on relève des **déclarations**, avec leur sélecteur
 * résolu, leur état et leur propriété CSS. C'est ce qui permettra de poser à chaque
 * déclaration la seule question qui compte — « que dit Figma sur cette partie de ce
 * composant dans cet état ? » — plutôt que de chercher quel token ressemble à quel
 * autre (ADR 003).
 *
 * Ce n'est pas un parseur SCSS complet et ça n'a pas à l'être : le corpus visé est le
 * CSS du design system, écrit dans un style régulier. Le scanner suit l'imbrication
 * par les accolades, résout les `&`, et ignore ce qu'il ne comprend pas plutôt que de
 * deviner.
 */

/** Pseudo-classes d'état, dans l'ordre où on veut les lire. */
const STATE_PSEUDOS = [
  'hover',
  'focus',
  'focus-visible',
  'focus-within',
  'active',
  'disabled',
  'checked',
  'first-child',
  'last-child',
  'empty',
];

/** Classes de modificateur qui décrivent un état plutôt qu'une variante. */
const STATE_CLASSES = [
  'active',
  'selected',
  'disabled',
  'loading',
  'error',
  'invalid',
  'readonly',
  'opened',
  'expanded',
  'checked',
  'hovered',
  'clicked',
  'focused',
  'locked',
];

// Les noms de custom properties du design system contiennent des `_` (`--_track`), et
// une valeur de token peut aussi vivre dans une variable Sass (`$colors: (…)`) ou dans
// une map, dont les entrées se terminent par `,` et non par `;`.
const DECLARATION = /^\s*([$_a-zA-Z-][\w-]*)\s*:\s*([\s\S]+?)\s*;?\s*$/;

/**
 * Trouve les `var()` d'une valeur, en comptant les parenthèses.
 *
 * Une expression régulière ne suffit pas : un fallback peut contenir des parenthèses
 * (`var(--x, calc(1px + 2px))`), et SCSS interpole des noms de tokens
 * (`var(--ref-color-#{$color}-100)`), auquel cas le nom n'est pas résolvable
 * statiquement. On le remonte quand même, marqué `dynamic` : une référence dynamique
 * reste une référence, et la faire disparaître fausserait tous les compteurs.
 */
export function findVarCalls(value) {
  const calls = [];
  let index = 0;

  while ((index = value.indexOf('var(', index)) !== -1) {
    let depth = 0;
    let end = -1;
    for (let i = index + 3; i < value.length; i++) {
      if (value[i] === '(') depth++;
      else if (value[i] === ')' && --depth === 0) {
        end = i;
        break;
      }
    }
    if (end === -1) break;

    const inner = value.slice(index + 4, end);
    let comma = -1;
    let nested = 0;
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === '(' || inner[i] === '{') nested++;
      else if (inner[i] === ')' || inner[i] === '}') nested--;
      else if (inner[i] === ',' && nested === 0) {
        comma = i;
        break;
      }
    }

    const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
    const fallback = comma === -1 ? null : inner.slice(comma + 1).trim() || null;

    if (name.startsWith('--')) {
      // Un fallback peut être un autre token (`var(--a, var(--b))`) : c'est une
      // dégradation gracieuse, pas une valeur en dur. La distinction compte, parce
      // qu'un littéral en fallback est une couleur codée en dur qui ne se voit pas.
      const fallbackIsToken = Boolean(fallback?.includes('var('));
      calls.push({
        name,
        fallback,
        fallbackIsToken,
        dynamic: name.includes('#{'),
        viaFallback: false,
      });

      // La référence imbriquée est un usage à part entière : la perdre fausserait
      // les compteurs et masquerait un lien de dépendance réel.
      if (fallbackIsToken) {
        for (const nested of findVarCalls(fallback)) {
          calls.push({ ...nested, viaFallback: true });
        }
      }
    }
    index = end + 1;
  }

  return calls;
}

/** `--comp-x` -> `comp`. Le reste est une custom property locale au composant. */
export function tierOf(name) {
  if (name.startsWith('--ref-')) return 'ref';
  if (name.startsWith('--sys-')) return 'sys';
  if (name.startsWith('--comp-')) return 'comp';
  return 'local';
}

/** Combine un sélecteur enfant avec son parent, en résolvant les `&`. */
export function resolveSelector(parent, child) {
  const parts = child.split(',').map((s) => s.trim());
  const parents = parent ? parent.split(',').map((s) => s.trim()) : [''];

  const combined = [];
  for (const p of parents) {
    for (const c of parts) {
      if (!c) continue;
      if (c.includes('&')) combined.push(c.replaceAll('&', p).trim());
      else combined.push(p ? `${p} ${c}` : c);
    }
  }
  return combined.join(', ');
}

/** Les états portés par un sélecteur : pseudo-classes puis classes de modificateur. */
export function statesOf(selector) {
  const states = new Set();
  for (const pseudo of STATE_PSEUDOS) {
    if (new RegExp(`:${pseudo}\\b`).test(selector)) states.add(pseudo);
  }
  for (const cls of STATE_CLASSES) {
    if (new RegExp(`\\.${cls}\\b`).test(selector)) states.add(cls);
  }
  // `:not(:disabled)` dit l'inverse d'un état : le retirer évite un faux positif.
  for (const negated of selector.matchAll(/:not\(\s*:?\.?([a-z-]+)\s*\)/g)) {
    states.delete(negated[1]);
  }
  return [...states];
}

/** Les classes de variante : tout modificateur qui n'est ni un état ni la base `.ap-*`. */
export function variantsOf(selector) {
  const classes = [...selector.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
  return [...new Set(classes.filter((c) => !c.startsWith('ap-') && !STATE_CLASSES.includes(c)))];
}

function stripComments(source) {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, (block) =>
    block.replace(/[^\n]/g, ' '),
  );

  // SCSS a aussi des commentaires de ligne. Sans les retirer, leur texte se colle au
  // sélecteur qui suit — `// Mini size .ap-tag.mini {` devient un sélecteur.
  return withoutBlocks
    .split('\n')
    .map((line) => {
      let quote = null;
      for (let i = 0; i < line.length - 1; i++) {
        const char = line[i];
        if (quote) {
          if (char === quote && line[i - 1] !== '\\') quote = null;
          continue;
        }
        if (char === '"' || char === "'") {
          quote = char;
          continue;
        }
        // `https://` n'est pas un commentaire : le `:` qui précède le trahit.
        if (char === '/' && line[i + 1] === '/' && line[i - 1] !== ':') {
          return line.slice(0, i);
        }
      }
      return line;
    })
    .join('\n');
}

// L'interpolation SCSS `#{…}` contient des accolades que le suivi d'imbrication
// prendrait pour des blocs. On les masque par des caractères de même longueur — les
// index restent alignés — et on démasque au moment d'enregistrer la déclaration.
const OPEN = '';
const CLOSE = '';

function maskInterpolation(source) {
  return source.replace(/#\{([^{}]*)\}/g, (_match, inner) => `#${OPEN}${inner}${CLOSE}`);
}

function unmask(text) {
  return text.replaceAll(OPEN, '{').replaceAll(CLOSE, '}');
}

/**
 * Scanne un fichier SCSS et retourne une déclaration par `var()` rencontré.
 *
 * Les déclarations de custom properties (`--x: …`) ne sont pas des usages : elles sont
 * signalées à part par `isDefinition`, pour ne pas gonfler les compteurs d'usage.
 */
export function scanScss(source, file = '') {
  const lines = maskInterpolation(stripComments(source)).split('\n');
  const stack = [];
  const found = [];
  const definitions = [];

  let buffer = '';
  let bufferLine = 0;

  const flushSelector = (raw, lineNumber) => {
    const selector = unmask(raw).replace(/\s+/g, ' ').trim();
    const atRule = selector.startsWith('@');
    stack.push({
      // Une at-rule (`@media`, `@supports`) ne change pas le sélecteur, seulement le contexte.
      selector: atRule
        ? (stack.at(-1)?.selector ?? '')
        : resolveSelector(stack.at(-1)?.selector ?? '', selector),
      atRule: atRule ? selector : (stack.at(-1)?.atRule ?? null),
      line: lineNumber,
    });
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    let rest = line;

    while (rest.length) {
      const open = rest.indexOf('{');
      const close = rest.indexOf('}');

      if (open !== -1 && (close === -1 || open < close)) {
        flushSelector(buffer + rest.slice(0, open), bufferLine || lineNumber);
        buffer = '';
        bufferLine = 0;
        rest = rest.slice(open + 1);
        continue;
      }

      if (close !== -1) {
        recordDeclaration(rest.slice(0, close), lineNumber);
        stack.pop();
        rest = rest.slice(close + 1);
        continue;
      }

      const semicolon = rest.indexOf(';');
      if (semicolon !== -1) {
        recordDeclaration(rest.slice(0, semicolon), lineNumber);
        rest = rest.slice(semicolon + 1);
        continue;
      }

      if (rest.trim()) {
        if (!buffer) bufferLine = lineNumber;
        buffer += rest + ' ';
      }
      break;
    }
  });

  function recordDeclaration(text, lineNumber) {
    const candidate = unmask(buffer + text).trim();
    const startLine = bufferLine || lineNumber;
    buffer = '';
    bufferLine = 0;
    if (!candidate) return;

    // Une valeur de token peut aussi apparaître hors d'une déclaration classique —
    // dans un `@include m.fixed-size(var(--x))`, par exemple. On l'enregistre sans
    // propriété plutôt que de la perdre : la faire disparaître fausserait la dette.
    const match = candidate.match(DECLARATION);
    const property = match ? match[1] : null;
    const value = match ? match[2] : candidate;
    const context = stack.at(-1);

    // Une custom property déclarée dans une feuille de style est une définition réelle,
    // même sans `var()` dans sa valeur (`--comp-avatar-size: 16px`). Sans la relever,
    // on la croirait référencée nulle part et on signalerait un bug qui n'existe pas.
    if (property?.startsWith('--')) {
      definitions.push({
        token: property,
        value,
        selector: context?.selector ?? '',
        file,
        line: lineNumber,
      });
    }

    if (!candidate.includes('var(')) return;
    const selector = context?.selector ?? '';

    for (const call of findVarCalls(value)) {
      found.push({
        token: call.name,
        tier: tierOf(call.name),
        fallback: call.fallback,
        fallbackIsToken: call.fallbackIsToken,
        viaFallback: call.viaFallback,
        dynamic: call.dynamic,
        property,
        value,
        selector,
        states: statesOf(selector),
        variants: variantsOf(selector),
        atRule: context?.atRule ?? null,
        isDefinition: Boolean(property?.startsWith('--')),
        file,
        line: startLine,
      });
    }
  }

  // `found.definitions` plutôt qu'un tuple : les appelants qui n'en ont pas besoin
  // continuent d'itérer sur le tableau sans rien changer.
  found.definitions = definitions;
  return found;
}

/** Relève les `var()` d'un fichier TypeScript — styles inline et littéraux de gabarit. */
export function scanTypescript(source, file = '') {
  const found = [];
  source.split('\n').forEach((line, index) => {
    for (const call of findVarCalls(line)) {
      const property = line.match(/['"]?([-a-z]+)['"]?\s*[:,]\s*['"`]?[^'"`]*var\(/)?.[1] ?? null;
      found.push({
        token: call.name,
        tier: tierOf(call.name),
        fallback: call.fallback,
        fallbackIsToken: call.fallbackIsToken,
        viaFallback: call.viaFallback,
        dynamic: call.dynamic,
        property,
        value: line.trim(),
        selector: null,
        states: [],
        variants: [],
        atRule: null,
        isDefinition: false,
        file,
        line: index + 1,
      });
    }
  });
  return found;
}
