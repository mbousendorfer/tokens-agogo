/**
 * Trouver un token dans le sélecteur.
 *
 * Le sélecteur propose 348 tokens Figma. Ce qui décide de son utilité, ce n'est pas
 * la liste — c'est ce qui se passe quand on tape trois lettres dedans. Un `includes()`
 * sur le seul nom du token rate tout ce qu'on tape réellement :
 *
 * - `orange 500` — deux termes, dans un ordre qui n'est pas celui du nom ;
 * - `mermaid` — le token s'appelle `--ref-color-merm-aid-100` ;
 * - `#FF6726` — on a la couleur sous les yeux, pas son nom ;
 * - `brand` — le mot du designer, quand le token dit `orange` ;
 * - `orange500` — la même chose sans le tiret.
 *
 * On cherche donc sur **plusieurs axes** : le nom, le token pointé, le groupe Figma,
 * la valeur résolue. Chaque terme doit se retrouver quelque part, dans n'importe quel
 * ordre, ponctuation ignorée.
 *
 * Ça reste une **recherche**, pas un classement : le mot tapé rétrécit la liste, il
 * ne choisit pas à la place de l'intention (ADR 003).
 */

/**
 * Le vocabulaire du designer, ramené sur celui des tokens.
 *
 * N'y figurent que les ponts qu'une sous-chaîne ne franchit pas toute seule : `blue`
 * trouve déjà `electric-blue`, donc il n'a rien à faire ici. `brand` ne trouve jamais
 * `orange`.
 *
 * C'est un vocabulaire partagé, pas une équivalence de couleurs : `danger` mène à la
 * famille rouge parce que c'est le mot que ce design system emploie, pas parce que
 * deux teintes se ressemblent.
 */
const SYNONYMS: Record<string, string[]> = {
  brand: ['orange'],
  primary: ['orange'],
  cta: ['orange'],
  danger: ['red', 'error'],
  destructive: ['red', 'error'],
  negative: ['red', 'error'],
  positive: ['green', 'success'],
  valid: ['green', 'success'],
  caution: ['yellow', 'warning'],
  info: ['electricblue', 'information'],
  link: ['electricblue'],
  locked: ['purple', 'featurelock'],
  premium: ['purple', 'featurelock'],
  featurelock: ['purple'],
  ai: ['mermaid'],
  teal: ['menthol'],
  neutral: ['grey'],
  gray: ['grey'],
  bg: ['surface', 'background'],
  background: ['surface'],
  fg: ['text', 'content'],
  foreground: ['text', 'content'],
  label: ['text'],
};

/**
 * Réduit un texte à ses lettres et ses chiffres.
 *
 * `--ref-color-merm-aid-100` et `Colors / MermAId` deviennent comparables à `mermaid`,
 * et `#FF6726` à `ff6726`. C'est ce qui rend la ponctuation des noms de tokens — qui
 * varie d'une collection Figma à l'autre — sans effet sur la recherche.
 */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Le texte dans lequel un candidat se cherche : tous ses axes, concaténés. */
export function haystackOf(candidate: {
  name: string;
  group: string;
  display: string | null;
  value: string | null;
}): string {
  return normalize(
    [candidate.name, candidate.group, candidate.display, candidate.value].filter(Boolean).join(' '),
  );
}

/** Les formes acceptées d'un terme tapé : lui-même, et ses synonymes. */
function formsOf(term: string): string[] {
  const normalized = normalize(term);
  if (!normalized) return [];
  return [normalized, ...(SYNONYMS[normalized] ?? []).map(normalize)];
}

/**
 * Le texte répond-il à la requête ?
 *
 * Tous les termes doivent s'y retrouver — chacun sous l'une de ses formes — mais dans
 * n'importe quel ordre. `500 orange` et `orange 500` trouvent la même chose ; `orange`
 * seul en trouve davantage, jamais moins.
 */
export function matchesQuery(haystack: string, query: string): boolean {
  const terms = query
    .split(/\s+/)
    .map(formsOf)
    .filter((forms) => forms.length > 0);

  if (!terms.length) return true;
  return terms.every((forms) => forms.some((form) => haystack.includes(form)));
}

/**
 * Les candidats que le token actuel désigne presque lui-même.
 *
 * `--comp-tag-green-text-color` partage `green` et `text` avec
 * `--sys-color-text-category-green` : ce recouvrement de vocabulaire est le signal le
 * plus fiable dont on dispose sans la spec Figma. Les synonymes l'élargissent — un
 * `--comp-button-primary-*` cherche aussi du côté d'`orange`, parce que c'est le mot
 * que le design system emploie pour la même chose.
 *
 * Le rendu identique compte aussi, mais moins : deux tokens peuvent partager une
 * couleur par accident. Et ça reste une mise en avant, jamais un choix — c'est
 * l'intention qui tranche (ADR 003).
 */
export function suggestionsFor<T extends { name: string; sameValue: boolean }>(
  current: string,
  candidates: T[],
  limit = 4,
): T[] {
  const wordsOf = (token: string) =>
    token
      .replace(/^--(ref|sys|comp)-/, '')
      .split('-')
      .filter((word) => word.length > 2 && word !== 'color');

  // Le vocabulaire du token courant, synonymes compris.
  const vocabulary = new Set(wordsOf(current).flatMap(formsOf));
  if (!vocabulary.size) return [];

  return candidates
    .map((candidate) => {
      const shared = wordsOf(candidate.name)
        .flatMap(formsOf)
        .filter((word) => vocabulary.has(word));
      return { candidate, score: new Set(shared).size * 2 + (candidate.sameValue ? 1 : 0) };
    })
    .filter((entry) => entry.score >= 2)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit)
    .map((entry) => entry.candidate);
}
