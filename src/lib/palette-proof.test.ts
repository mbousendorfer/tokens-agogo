import { describe, expect, it } from 'vitest';
import { paletteProof } from './palette-proof';

/*
  Ces tests portent sur le **corpus réel**, pas sur des fixtures : l'affirmation de la
  page — « la règle retrouve la palette livrée » — n'a de valeur que mesurée sur la
  vraie palette. Si un export Figma la fait diverger, c'est ici qu'on l'apprend.
*/
describe('paletteProof', () => {
  const proof = paletteProof();

  it('compare toute la palette chromatique', () => {
    expect(proof.comparisons.length).toBeGreaterThan(60);
    // Rien de livré que la règle ne sache produire.
    expect(proof.unsolved).toEqual([]);
  });

  it('retrouve chaque nuance à l’arrondi près', () => {
    // L'invariant, et la seule affirmation que la page a le droit de faire.
    expect(proof.missed).toEqual([]);
    expect(proof.exact + proof.rounded).toBe(proof.comparisons.length);
    expect(proof.exact).toBeGreaterThan(50);
  });

  it('ne confond pas « hors barreau » et « infidèle »', () => {
    expect(proof.offLadder.length).toBeGreaterThan(0);

    // Les ancres de marque sont hors de l'échelle commune **et** exactes : la spec
    // les y place elle-même. Les compter comme des ratés ferait passer une exception
    // voulue pour une erreur de dérivation.
    expect(proof.offLadder.every((shade) => shade.drift === 0)).toBe(true);
  });

  it('mesure l’écart par canal, pas par ressemblance', () => {
    const drifting = proof.comparisons.filter((shade) => shade.drift > 0);
    for (const shade of drifting) {
      expect(shade.real.toLowerCase()).not.toBe(shade.solved.toLowerCase());
      expect(shade.drift).toBeLessThanOrEqual(2);
    }
  });
});
