'use client';

import { useEffect } from 'react';

import { FORCEABLE_STATES } from './states';

/**
 * Rend les pseudo-classes du design system forçables.
 *
 * Une pseudo-classe ne se déclenche pas de l'extérieur : on ne peut pas « mettre » un
 * bouton en `:hover`. On dérive donc, à partir des feuilles de style réelles du design
 * system, un jeu de règles jumelles où `:hover` devient `.force-hover` — même
 * déclaration, même cascade, sélecteur activable par une classe.
 *
 * L'iframe est same-origin, donc `cssRules` est lisible : les règles dérivées viennent
 * du vrai CSS, pas d'une réécriture à la main qui finirait par diverger.
 */
export function ForceStates() {
  useEffect(() => {
    const pattern = new RegExp(`:(${FORCEABLE_STATES.join('|')})\\b`, 'g');
    const derived: string[] = [];

    const visit = (rule: CSSRule) => {
      if (rule instanceof CSSStyleRule) {
        if (!pattern.test(rule.selectorText)) return;
        pattern.lastIndex = 0;

        /*
          On émet deux formes de chaque règle :
          - `.ap-button.force-hover` — la classe sur l'élément lui-même ;
          - `.force-hover .ap-button` — la classe sur un ancêtre.

          La seconde est celle qui compte ici : le markup du spécimen est injecté tel
          quel depuis les stories du design system, on ne peut donc pas y poser une
          classe. Seule l'enveloppe est à nous.
        */
        const onSelf = rule.selectorText.replace(pattern, (_m, state) => `.force-${state}`);
        const fromAncestor = rule.selectorText
          .split(',')
          .map((part) => {
            const states = [...part.matchAll(pattern)].map((match) => match[1]);
            pattern.lastIndex = 0;
            if (!states.length) return null;
            const cleaned = part.replace(pattern, '').trim();
            return `${states.map((state) => `.force-${state}`).join('')} ${cleaned}`;
          })
          .filter(Boolean)
          .join(',');

        derived.push(`${onSelf}{${rule.style.cssText}}`);
        if (fromAncestor) derived.push(`${fromAncestor}{${rule.style.cssText}}`);
        return;
      }

      // Les règles conditionnelles (`@media (hover: hover)`) portent les états
      // les plus intéressants : on descend dedans en conservant leur condition.
      if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
        const inner: string[] = [];
        for (const child of Array.from(rule.cssRules)) {
          const before = derived.length;
          visit(child);
          inner.push(...derived.splice(before));
        }
        if (inner.length) derived.push(`@media ${rule.conditionText}{${inner.join('')}}`);
      }
    };

    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        // Feuille cross-origin : rien à en tirer, et ce n'est pas la nôtre.
        continue;
      }
      for (const rule of Array.from(rules)) visit(rule);
    }

    if (!derived.length) return;

    const style = document.createElement('style');
    style.id = 'ds-forced-states';
    style.textContent = derived.join('\n');
    // En dernier : à spécificité égale, l'état forcé doit l'emporter sur l'état par défaut.
    document.head.append(style);

    return () => style.remove();
  }, []);

  return null;
}
