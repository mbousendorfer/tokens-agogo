import { describe, expect, it } from 'vitest';
import { compare, parseDeclarations, resolveAll, resolveValue } from './css-vars.mjs';

describe('parseDeclarations', () => {
  it('lit les déclarations d’un bloc :root', () => {
    const map = parseDeclarations(`:root {
  --ref-color-grey-10: #EAECEF;
  --comp-tag-grey-background-color: var(--ref-color-grey-10);
}`);
    expect(map.get('--ref-color-grey-10')).toBe('#EAECEF');
    expect(map.get('--comp-tag-grey-background-color')).toBe('var(--ref-color-grey-10)');
    expect(map.size).toBe(2);
  });

  it('ignore ce qui n’est pas une déclaration de custom property', () => {
    const map = parseDeclarations(`:root {\n  color: red;\n  --a: 1px;\n}\n/* --b: 2px */`);
    expect([...map.keys()]).toEqual(['--a']);
  });

  it('garde la dernière déclaration, comme la cascade', () => {
    const map = parseDeclarations(`:root {\n  --a: 1px;\n  --a: 2px;\n}`);
    expect(map.get('--a')).toBe('2px');
  });
});

describe('resolveValue', () => {
  const decls = parseDeclarations(`:root {
  --ref-grey: #EAECEF;
  --sys-surface: var(--ref-grey);
  --comp-tag-bg: var(--sys-surface);
  --comp-avatar-shadow: 0 0 0 1px var(--ref-grey);
  --with-fallback: var(--nowhere, #FFFFFF);
}`);

  it('résout une chaîne de profondeur 3', () => {
    expect(resolveValue('--comp-tag-bg', decls)).toBe('#EAECEF');
  });

  it('résout une référence interpolée dans une valeur composite', () => {
    expect(resolveValue('--comp-avatar-shadow', decls)).toBe('0 0 0 1px #EAECEF');
  });

  it('utilise le fallback quand la référence n’existe pas', () => {
    expect(resolveValue('--with-fallback', decls)).toBe('#FFFFFF');
  });

  it('signale une référence inconnue sans fallback', () => {
    const broken = parseDeclarations(`:root {\n  --a: var(--absent);\n}`);
    expect(() => resolveValue('--a', broken)).toThrow(/n'est pas défini/);
  });

  it('signale un cycle', () => {
    const cyclic = parseDeclarations(`:root {\n  --a: var(--b);\n  --b: var(--a);\n}`);
    expect(() => resolveValue('--a', cyclic)).toThrow(/cycle/);
  });
});

describe('resolveAll', () => {
  it('collecte les erreurs sans interrompre la résolution', () => {
    const { resolved, errors } = resolveAll(
      parseDeclarations(`:root {\n  --ok: 1px;\n  --ko: var(--absent);\n}`),
    );
    expect(resolved.get('--ok')).toBe('1px');
    expect(errors).toHaveLength(1);
    expect(errors[0].name).toBe('--ko');
  });
});

describe('compare', () => {
  it('accepte deux jeux identiques', () => {
    const a = new Map([['--a', '#FFF']]);
    expect(compare(a, new Map([['--a', '#FFF']])).ok).toBe(true);
  });

  it('rapporte les manquants, les surnuméraires et les divergents', () => {
    const expected = new Map([
      ['--a', '#FFF'],
      ['--b', '2px'],
    ]);
    const actual = new Map([
      ['--a', '#000'],
      ['--c', '3px'],
    ]);
    const result = compare(expected, actual);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(['--b']);
    expect(result.extra).toEqual(['--c']);
    expect(result.different).toEqual([{ name: '--a', expected: '#FFF', actual: '#000' }]);
  });
});
