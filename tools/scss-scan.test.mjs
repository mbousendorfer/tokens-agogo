import { describe, expect, it } from 'vitest';
import {
  findVarCalls,
  resolveSelector,
  scanScss,
  scanTypescript,
  statesOf,
  variantsOf,
} from './scss-scan.mjs';

describe('resolveSelector', () => {
  it('descend d’un cran sans `&`', () => {
    expect(resolveSelector('.ap-button', 'span')).toBe('.ap-button span');
  });

  it('accroche le `&` au parent', () => {
    expect(resolveSelector('.ap-button', '&.primary')).toBe('.ap-button.primary');
    expect(resolveSelector('.ap-button.primary', '&:hover')).toBe('.ap-button.primary:hover');
  });

  it('développe les sélecteurs multiples', () => {
    expect(resolveSelector('.a, .b', '&.x')).toBe('.a.x, .b.x');
  });
});

describe('statesOf', () => {
  it('lit les pseudo-classes', () => {
    expect(statesOf('.ap-button:hover')).toEqual(['hover']);
    expect(statesOf('.ap-input:focus-visible')).toContain('focus-visible');
  });

  it('lit les classes de modificateur qui décrivent un état', () => {
    expect(statesOf('.ap-button.loading')).toEqual(['loading']);
  });

  it('ne compte pas un état nié par `:not()`', () => {
    expect(statesOf('.ap-button:hover:not(:disabled)')).toEqual(['hover']);
  });

  it('cumule les états', () => {
    expect(statesOf('.ap-button.primary:active').sort()).toEqual(['active']);
  });
});

describe('variantsOf', () => {
  it('garde les modificateurs, pas la classe de base ni les états', () => {
    expect(variantsOf('.ap-button.primary.orange:hover')).toEqual(['primary', 'orange']);
  });
});

describe('scanScss', () => {
  const source = `
.ap-button {
    border-radius: var(--comp-button-border-radius);
    --loading-bar-width: 50px;

    &.primary {
        &.orange {
            background-color: var(--comp-button-primary-orange-surface-default);

            &:hover:not(:disabled) {
                background-color: var(--comp-button-primary-orange-surface-hovered);
            }
        }
    }

    &:focus {
        outline: 2px solid var(--ref-color-electric-blue-100);
    }
}
`;

  const found = scanScss(source, 'button.scss');

  it('relève chaque usage de var()', () => {
    expect(found.map((f) => f.token)).toEqual([
      '--comp-button-border-radius',
      '--comp-button-primary-orange-surface-default',
      '--comp-button-primary-orange-surface-hovered',
      '--ref-color-electric-blue-100',
    ]);
  });

  it('résout le sélecteur imbriqué', () => {
    const hovered = found.find((f) => f.token.endsWith('surface-hovered'));
    expect(hovered.selector).toBe('.ap-button.primary.orange:hover:not(:disabled)');
    expect(hovered.states).toEqual(['hover']);
    expect(hovered.variants).toEqual(['primary', 'orange']);
    expect(hovered.property).toBe('background-color');
  });

  it('donne le tier et la ligne', () => {
    const raw = found.find((f) => f.tier === 'ref');
    expect(raw.token).toBe('--ref-color-electric-blue-100');
    expect(raw.property).toBe('outline');
    expect(raw.states).toEqual(['focus']);
    expect(raw.line).toBeGreaterThan(0);
  });

  it('ignore une déclaration de custom property locale sans var()', () => {
    expect(found.some((f) => f.token === '--loading-bar-width')).toBe(false);
  });
});

describe('scanScss — cas particuliers', () => {
  it('capture le fallback, qui est une valeur en dur déguisée', () => {
    const [found] = scanScss('.a { color: var(--sys-x, #fff); }');
    expect(found.fallback).toBe('#fff');
  });

  it('marque une définition de custom property', () => {
    const [found] = scanScss('.a { --local: var(--ref-color-grey-10); }');
    expect(found.isDefinition).toBe(true);
    expect(found.tier).toBe('ref');
  });

  it('garde le sélecteur à travers une at-rule', () => {
    const [found] = scanScss('.a { @media (hover: hover) { color: var(--sys-x); } }');
    expect(found.selector).toBe('.a');
    expect(found.atRule).toBe('@media (hover: hover)');
  });

  it('ignore le contenu des commentaires', () => {
    expect(scanScss('.a { /* color: var(--sys-x); */ padding: 0; }')).toHaveLength(0);
  });

  it('gère une déclaration écrite sur plusieurs lignes', () => {
    const [found] = scanScss('.a {\n  padding:\n    var(--ref-spacing-xs);\n}');
    expect(found.token).toBe('--ref-spacing-xs');
    expect(found.property).toBe('padding');
  });
});

describe('scanTypescript', () => {
  it('relève les var() des styles inline et des littéraux', () => {
    const found = scanTypescript(
      `renderer.setStyle(el, 'gap', 'var(--ref-spacing-xxs)');`,
      'checkbox.directive.ts',
    );
    expect(found).toHaveLength(1);
    expect(found[0].token).toBe('--ref-spacing-xxs');
    expect(found[0].tier).toBe('ref');
  });
});

describe('findVarCalls', () => {
  it('lit un fallback contenant des parenthèses', () => {
    const [call] = findVarCalls('var(--sys-x, calc(1px + 2px))');
    expect(call.name).toBe('--sys-x');
    expect(call.fallback).toBe('calc(1px + 2px)');
  });

  it('remonte un nom construit par interpolation SCSS, marqué dynamique', () => {
    const [call] = findVarCalls('var(--ref-color-#{$color}-100)');
    expect(call.name).toBe('--ref-color-#{$color}-100');
    expect(call.dynamic).toBe(true);
  });

  it('lit plusieurs appels sur la même valeur', () => {
    expect(findVarCalls('var(--a) var(--b)').map((c) => c.name)).toEqual(['--a', '--b']);
  });
});

describe('scanScss — noms de propriété inhabituels', () => {
  it('accepte un underscore dans une custom property', () => {
    const [found] = scanScss('.ap-loader { --_track: var(--ref-color-orange-40); }');
    expect(found.token).toBe('--ref-color-orange-40');
    expect(found.property).toBe('--_track');
    expect(found.isDefinition).toBe(true);
  });

  it('relève les tokens interpolés d’un mixin', () => {
    const found = scanScss('@mixin c($color) { background: var(--ref-color-#{$color}-100); }');
    expect(found).toHaveLength(1);
    expect(found[0].dynamic).toBe(true);
    expect(found[0].tier).toBe('ref');
  });
});

describe('scanScss — valeurs hors déclaration classique', () => {
  it('relève un token passé en argument de mixin, sans propriété', () => {
    const [found] = scanScss('.a { @include m.fixed-size(var(--avatar-size)); }');
    expect(found.token).toBe('--avatar-size');
    expect(found.property).toBeNull();
  });

  it('relève les tokens d’une map Sass, dont les entrées finissent par une virgule', () => {
    const found = scanScss(
      `$colors: (\n  'black': var(--ref-color-grey-100),\n  'purple': var(--ref-color-purple-100),\n);`,
    );
    expect(found.map((f) => f.token)).toEqual(['--ref-color-grey-100', '--ref-color-purple-100']);
    expect(found[0].property).toBe('$colors');
  });
});

describe('findVarCalls — fallback imbriqué', () => {
  it('remonte la référence du fallback, marquée comme telle', () => {
    const calls = findVarCalls('var(--comp-x, var(--ref-color-white))');
    expect(calls.map((c) => c.name)).toEqual(['--comp-x', '--ref-color-white']);
    expect(calls[0].fallbackIsToken).toBe(true);
    expect(calls[1].viaFallback).toBe(true);
  });

  it('distingue un fallback littéral, qui est une valeur en dur', () => {
    const [call] = findVarCalls('var(--comp-x, #FFFFFF)');
    expect(call.fallbackIsToken).toBe(false);
    expect(call.fallback).toBe('#FFFFFF');
  });
});

describe('scanScss — définitions de custom properties', () => {
  it('relève une définition même sans var() dans sa valeur', () => {
    const found = scanScss('.ap-status-card { --comp-avatar-size: 16px; }', 'status-card.scss');
    expect(found).toHaveLength(0);
    expect(found.definitions).toEqual([
      {
        token: '--comp-avatar-size',
        value: '16px',
        selector: '.ap-status-card',
        file: 'status-card.scss',
        line: 1,
      },
    ]);
  });

  it('relève aussi celles dont la valeur est un token', () => {
    const found = scanScss('.a { --_track: var(--ref-color-orange-40); }');
    expect(found.definitions.map((d) => d.token)).toEqual(['--_track']);
    expect(found[0].token).toBe('--ref-color-orange-40');
  });
});
