'use client';

import { useEffect } from 'react';

import { forceableTwins } from '@/lib/forced-states';

/**
 * Installe, dans le document de preview, les règles jumelles des états forçables.
 *
 * L'iframe est same-origin, donc `cssRules` est lisible : les règles dérivées viennent
 * du vrai CSS du design system, pas d'une réécriture à la main qui finirait par
 * diverger. La dérivation elle-même est pure et testée (`src/lib/forced-states.ts`) —
 * ici on ne fait que parcourir les feuilles.
 */
export function ForceStates() {
  useEffect(() => {
    const derived: string[] = [];

    const visit = (rule: CSSRule) => {
      if (rule instanceof CSSStyleRule) {
        const twins = forceableTwins(rule.selectorText);
        if (twins) derived.push(`${twins}{${rule.style.cssText}}`);
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
