import { describe, expect, it } from 'vitest';
import { haystackOf, matchesQuery, normalize, suggestionsFor } from './token-search';

const orange100 = {
  name: '--ref-color-orange-100',
  group: 'Colors / Orange',
  display: null,
  value: '#FF6726',
};

const mermaid = {
  name: '--ref-color-merm-aid-100',
  group: 'Colors / MermAId',
  display: null,
  value: '#F5F1FF',
};

const surfaceBrand = {
  name: '--sys-color-surface-notification',
  group: 'color / surface',
  display: '--ref-color-orange-200',
  value: '#FF8B54',
};

const search = (token: Parameters<typeof haystackOf>[0], query: string) =>
  matchesQuery(haystackOf(token), query);

describe('normalize', () => {
  it('ne garde que lettres et chiffres', () => {
    expect(normalize('--ref-color-merm-aid-100')).toBe('refcolormermaid100');
    expect(normalize('Colors / MermAId')).toBe('colorsmermaid');
    expect(normalize('#FF6726')).toBe('ff6726');
  });
});

describe('matchesQuery', () => {
  it('accepte les termes dans le désordre', () => {
    expect(search(orange100, 'orange 100')).toBe(true);
    expect(search(orange100, '100 orange')).toBe(true);
  });

  it('exige que tous les termes se retrouvent', () => {
    expect(search(orange100, 'orange 900')).toBe(false);
  });

  it('ignore la ponctuation, des deux côtés', () => {
    expect(search(orange100, 'orange-100')).toBe(true);
    expect(search(orange100, 'orange100')).toBe(true);
    // Le cas qui motivait tout : le token s'appelle `merm-aid`.
    expect(search(mermaid, 'mermaid')).toBe(true);
  });

  it('cherche la couleur résolue', () => {
    expect(search(orange100, '#FF6726')).toBe(true);
    expect(search(orange100, 'ff6726')).toBe(true);
    // Un début de hex suffit : on tape ce qu'on lit.
    expect(search(orange100, '#ff67')).toBe(true);
  });

  it('cherche le token pointé, pas seulement le nom', () => {
    // On connaît la primitive, on cherche le token sémantique qui la porte.
    expect(search(surfaceBrand, 'orange 200')).toBe(true);
  });

  it('traduit le vocabulaire du designer', () => {
    expect(search(orange100, 'brand')).toBe(true);
    expect(search(mermaid, 'ai')).toBe(true);
    // Et n'invente pas de correspondance : `brand` ne mène pas au violet.
    const purple = {
      name: '--ref-color-purple-100',
      group: 'Colors / Purple',
      display: null,
      value: '#F0EFFE',
    };
    expect(search(purple, 'brand')).toBe(false);
  });

  it('rend tout sur une requête vide', () => {
    expect(search(orange100, '')).toBe(true);
    expect(search(orange100, '   ')).toBe(true);
  });
});

describe('suggestionsFor', () => {
  const candidates = [
    { name: '--sys-color-text-category-green', sameValue: false },
    { name: '--sys-color-surface-error', sameValue: false },
    { name: '--sys-color-surface-brand', sameValue: false },
    { name: '--sys-spacing-md', sameValue: false },
  ];

  it('remonte les candidats qui partagent le vocabulaire', () => {
    const suggestions = suggestionsFor('--comp-tag-green-text-color', candidates);
    expect(suggestions.map((c) => c.name)).toEqual(['--sys-color-text-category-green']);
  });

  it('passe par les synonymes', () => {
    // `danger` et `error` sont le même mot dans deux bouches.
    const suggestions = suggestionsFor('--comp-button-danger-surface', candidates);
    expect(suggestions.map((c) => c.name)).toContain('--sys-color-surface-error');
  });

  it('ne suggère rien quand rien ne recouvre', () => {
    expect(suggestionsFor('--comp-zzz-qqq', candidates)).toEqual([]);
  });

  it('compte le rendu identique, mais moins que le vocabulaire', () => {
    const withSameValue = [
      { name: '--sys-color-surface-error', sameValue: true },
      { name: '--sys-color-surface-brand', sameValue: false },
    ];
    const suggestions = suggestionsFor('--comp-button-surface-error', withSameValue);
    expect(suggestions[0].name).toBe('--sys-color-surface-error');
  });
});
