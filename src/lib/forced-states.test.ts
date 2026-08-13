import { describe, expect, it } from 'vitest';
import { forceableTwins } from './forced-states';

describe('forceableTwins', () => {
  it('laisse passer un sélecteur sans état', () => {
    expect(forceableTwins('.ap-button.primary')).toBeNull();
  });

  it('dérive les trois formes', () => {
    const twins = forceableTwins('.ap-button:hover')!;
    expect(twins.split(',')).toEqual([
      '.ap-button.force-hover',
      '.force-hover .ap-button',
      '[data-force~="hover"] .ap-button',
    ]);
  });

  /*
    Le cas qui cassait tout : `:disabled` dans un `:not()` n'est pas un état à forcer.
    Le traiter comme tel produisait `:not()` — invalide, jeté en silence par le
    navigateur — et le survol des variantes ne peignait plus rien.
  */
  it("ne touche pas aux pseudo-classes à l'intérieur d'un :not()", () => {
    const twins = forceableTwins('.ap-button.mermaid:hover:not(:disabled):not(.loading)::after')!;

    expect(twins).not.toContain(':not()');
    expect(twins.split(',')).toEqual([
      '.ap-button.mermaid.force-hover:not(:disabled):not(.loading)::after',
      '.force-hover .ap-button.mermaid:not(:disabled):not(.loading)::after',
      '[data-force~="hover"] .ap-button.mermaid:not(:disabled):not(.loading)::after',
    ]);
  });

  it('range focus-visible et focus-within sous « focus »', () => {
    expect(forceableTwins('.ap-input:focus-visible')).toContain('[data-force~="focus"] .ap-input');
    expect(forceableTwins('.ap-field:focus-within')).toContain('[data-force~="focus"] .ap-field');

    // Et surtout : pas de `-visible` orphelin, qui collerait au sélecteur voisin.
    expect(forceableTwins('.ap-input:focus-visible')).not.toContain('-visible');
  });

  it('ne coupe pas sur une virgule interne à :is()', () => {
    expect(forceableTwins('.ap-tab:is(.a, .b):hover')).toBe(
      '.ap-tab:is(.a, .b).force-hover,' +
        '.force-hover .ap-tab:is(.a, .b),' +
        '[data-force~="hover"] .ap-tab:is(.a, .b)',
    );
  });

  it('traite une liste de sélecteurs partie par partie', () => {
    const twins = forceableTwins('.ap-button:hover, .ap-link')!;
    expect(twins).toContain('.ap-button.force-hover');
    // `.ap-link` ne porte aucun état : il ne produit aucun jumeau.
    expect(twins).not.toContain('.ap-link');
  });

  it('combine deux états de premier niveau', () => {
    const twins = forceableTwins('.ap-button:hover:active')!;
    expect(twins).toContain('[data-force~="hover"][data-force~="active"] .ap-button');
  });

  it('force aussi un état seul, sans condition', () => {
    expect(forceableTwins('.ap-button:disabled')).toContain('[data-force~="disabled"] .ap-button');
  });
});
