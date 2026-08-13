import { describe, expect, it } from 'vitest';
import {
  cssNameFor,
  diffAgainstTokens,
  flattenVariables,
  indexComponentBindings,
  pathFromFigmaName,
  tokenToCssName,
} from './figma-import.mjs';

/** Un export de variables minimal, à la forme exacte que produit le plugin. */
const VARIABLES_SNAPSHOT = {
  $schema: 'agorapulse/figma-export/1',
  kind: 'variables',
  collections: [
    {
      id: 'VariableCollectionId:1:1',
      key: 'col-key',
      name: 'System Tokens',
      defaultModeId: 'mode-default',
      modes: [
        { modeId: 'mode-default', name: 'Classic' },
        { modeId: 'mode-dense', name: 'Dense' },
      ],
      variableIds: ['VariableID:1:2', 'VariableID:1:3'],
    },
  ],
  variables: [
    {
      id: 'VariableID:1:2',
      name: 'color/surface/default',
      collectionId: 'VariableCollectionId:1:1',
      resolvedType: 'COLOR',
      scopes: ['FRAME_FILL'],
      description: '',
      valuesByMode: {
        'mode-default': { $hex: '#FFFFFF' },
        'mode-dense': { $hex: '#FFFFFF' },
      },
    },
    {
      id: 'VariableID:1:3',
      name: 'color/surface/interactive/hovered',
      collectionId: 'VariableCollectionId:1:1',
      resolvedType: 'COLOR',
      scopes: ['FRAME_FILL'],
      description: '',
      valuesByMode: {
        'mode-default': { $alias: 'VariableID:9:9', $aliasName: 'grey/200' },
      },
    },
  ],
};

describe('tokenToCssName', () => {
  it('reproduit le transform name/cti/kebab de Style Dictionary', () => {
    expect(tokenToCssName(['sys', 'color', 'surface', 'default'])).toBe(
      '--sys-color-surface-default',
    );
  });

  it('convertit le camelCase en kebab, comme electricBlue', () => {
    expect(tokenToCssName(['ref', 'color', 'electricBlue', '100'])).toBe(
      '--ref-color-electric-blue-100',
    );
  });
});

describe('pathFromFigmaName / cssNameFor', () => {
  it('découpe un chemin Figma', () => {
    expect(pathFromFigmaName('color/surface/interactive/hovered')).toEqual([
      'color',
      'surface',
      'interactive',
      'hovered',
    ]);
  });

  it('préfixe par le tier', () => {
    expect(cssNameFor('color/text/default', 'sys')).toBe('--sys-color-text-default');
  });
});

describe('flattenVariables', () => {
  const flat = flattenVariables(VARIABLES_SNAPSHOT);

  it('produit une entrée par variable et par mode', () => {
    expect(flat).toHaveLength(3);
    expect(flat.filter((v) => v.isDefaultMode)).toHaveLength(2);
  });

  it('nomme le mode plutôt que de garder son identifiant', () => {
    expect(flat.map((v) => v.mode)).toContain('Classic');
    expect(flat.map((v) => v.mode)).toContain('Dense');
  });

  it('garde l’alias par son nom, pas par son identifiant', () => {
    const alias = flat.find((v) => v.name === 'color/surface/interactive/hovered');
    expect(alias.aliasOf).toBe('grey/200');
    expect(alias.value).toBeNull();
  });

  it('garde les scopes, que la plupart des exports tiers perdent', () => {
    expect(flat[0].scopes).toEqual(['FRAME_FILL']);
  });
});

describe('diffAgainstTokens', () => {
  const figma = flattenVariables(VARIABLES_SNAPSHOT);

  it('classe en conforme, manquant et divergent', () => {
    const result = diffAgainstTokens(figma, [
      { name: '--sys-color-surface-default', tier: 'sys', value: '#ffffff' },
      { name: '--sys-color-legacy-thing', tier: 'sys', value: '#000000' },
    ]);

    expect(result.matched.map((m) => m.cssName)).toEqual(['--sys-color-surface-default']);
    expect(result.missingInCode.map((m) => m.cssName)).toEqual([
      '--sys-color-surface-interactive-hovered',
    ]);
    expect(result.missingInFigma.map((m) => m.cssName)).toEqual(['--sys-color-legacy-thing']);
  });

  it('signale une valeur divergente', () => {
    const result = diffAgainstTokens(figma, [
      { name: '--sys-color-surface-default', tier: 'sys', value: '#F9F9FA' },
    ]);
    expect(result.divergent).toEqual([
      {
        figmaName: 'color/surface/default',
        cssName: '--sys-color-surface-default',
        figma: '#FFFFFF',
        code: '#F9F9FA',
      },
    ]);
  });
});

describe('indexComponentBindings', () => {
  it('indexe par composant, variante et calque', () => {
    const index = indexComponentBindings({
      components: [
        {
          name: 'Button',
          key: 'abc',
          page: 'Components',
          variants: [
            {
              name: 'Style=Primary, State=Hover',
              properties: { Style: 'Primary', State: 'Hover' },
              parts: [
                { part: 'Container', bindings: { fills: 'color/surface/interactive/hovered' } },
                { part: 'Container / Label', bindings: { fills: 'color/text/on-color' } },
              ],
            },
          ],
        },
      ],
    });

    expect(index.Button.variants['Style=Primary, State=Hover'].parts.Container.fills).toEqual([
      {
        figmaName: 'color/surface/interactive/hovered',
        cssName: '--sys-color-surface-interactive-hovered',
      },
    ]);
  });
});
