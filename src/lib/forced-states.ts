/**
 * Rendre les pseudo-classes du design system activables depuis le DOM.
 *
 * Une pseudo-classe ne se déclenche pas de l'extérieur : on ne peut pas « mettre » un
 * bouton en `:hover`. On dérive donc, de chaque sélecteur réel du design system, ses
 * jumeaux forçables — même déclaration, même spécificité, marque posable à la main.
 *
 * Logique pure : pas de React, pas de DOM. La lecture des feuilles de style, elle,
 * vit dans `src/app/(preview)/preview/force-states.tsx`.
 */

/** Les états que la preview sait forcer. */
export const FORCEABLE_STATES = ['hover', 'focus', 'active', 'disabled'] as const;

export type ForceableState = (typeof FORCEABLE_STATES)[number];

/**
 * Les pseudo-classes reconnues, et l'état sous lequel elles se rangent.
 *
 * `focus-visible` et `focus-within` d'abord : l'alternance est ordonnée, et `focus`
 * placé avant capturerait leur préfixe en laissant traîner `-visible`. Les trois se
 * forcent sous « focus » — c'est le même geste pour qui regarde le composant.
 */
const STATE_PATTERN = /^:(focus-visible|focus-within|hover|focus|active|disabled)(?![-\w])/;

const CANONICAL: Record<string, ForceableState> = {
  hover: 'hover',
  focus: 'focus',
  'focus-visible': 'focus',
  'focus-within': 'focus',
  active: 'active',
  disabled: 'disabled',
};

/**
 * Découpe une liste de sélecteurs sur ses virgules de **premier niveau**.
 *
 * `:is(.a, .b)` en contient une qui n'en est pas une : la couper produirait deux
 * moitiés de sélecteur, toutes deux invalides.
 */
function splitTopLevel(selectorText: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of selectorText) {
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;

    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);

  return parts.map((part) => part.trim()).filter(Boolean);
}

/**
 * Sépare un sélecteur de ses états forçables.
 *
 * Seules les pseudo-classes de **premier niveau** comptent. `:hover:not(:disabled)`
 * est un survol conditionné par l'absence de `disabled`, pas un état « disabled » :
 * les traiter à égalité produisait `:not()`, un sélecteur invalide que le navigateur
 * jette en silence — et la règle de survol ne peignait plus rien. Le cas est la norme
 * dans ce corpus, pas l'exception.
 */
function scan(part: string): { states: ForceableState[]; stripped: string; marked: string } {
  const states: ForceableState[] = [];
  let stripped = '';
  let marked = '';
  let depth = 0;

  for (let index = 0; index < part.length; index += 1) {
    const char = part[index];

    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;

    if (char === ':' && depth === 0) {
      const match = STATE_PATTERN.exec(part.slice(index));
      if (match) {
        const state = CANONICAL[match[1]];
        if (!states.includes(state)) states.push(state);
        // Le jumeau « sur l'élément » garde la place de la pseudo-classe ; celui
        // « depuis un ancêtre » la perd, et la retrouvera en préfixe.
        marked += `.force-${state}`;
        index += match[0].length - 1;
        continue;
      }
    }

    stripped += char;
    marked += char;
  }

  return { states, stripped: stripped.trim(), marked };
}

/**
 * Les jumeaux forçables d'un sélecteur, ou `null` s'il ne porte aucun état.
 *
 * Trois formes, à spécificité égale à l'originale :
 * - `.ap-button.force-hover` — la marque sur l'élément lui-même ;
 * - `.force-hover .ap-button` — la marque sur un ancêtre ;
 * - `[data-force~="hover"] .ap-button` — la même, en attribut.
 *
 * La deuxième et la troisième sont celles qui comptent : le markup du spécimen est
 * injecté tel quel depuis les stories du design system, on ne peut donc pas y poser
 * une classe. Seule l'enveloppe est à nous. Et l'attribut existe parce que le parent
 * le pose sur `<html>` sans recharger le cadre — React réconcilie ce qu'il rend,
 * `lang` et `class`, et laisse intact un attribut qu'il n'a jamais écrit.
 */
export function forceableTwins(selectorText: string): string | null {
  const onSelf: string[] = [];
  const fromAncestor: string[] = [];

  for (const part of splitTopLevel(selectorText)) {
    const { states, stripped, marked } = scan(part);
    if (!states.length) continue;

    onSelf.push(marked);
    fromAncestor.push(
      `${states.map((state) => `.force-${state}`).join('')} ${stripped}`,
      `${states.map((state) => `[data-force~="${state}"]`).join('')} ${stripped}`,
    );
  }

  if (!onSelf.length) return null;
  return [...onSelf, ...fromAncestor].join(',');
}
