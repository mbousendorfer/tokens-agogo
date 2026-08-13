/**
 * Chiffres du point de départ, mesurés sur `master` du repo design system.
 *
 * Ils servent aussi de contrôle aux scripts d'analyse (étape 3) : un écart signale
 * un bug de scan, pas une évolution du design system. Voir docs/data-model.md.
 *
 * À remplacer par l'index de déclarations dès qu'il existe.
 */
export const BASELINE_MEASURED_AT = '13 août 2026';

export type BaselineStat = {
  label: string;
  value: string;
  detail: string;
};

export const BASELINE: BaselineStat[] = [
  {
    label: 'Primitives brutes dans le code',
    value: '1 884',
    detail: '103 noms uniques — le gros de la dette',
  },
  {
    label: 'Tokens de composant',
    value: '439',
    detail: '232 aliasent une primitive, 30 sont en dur',
  },
  {
    label: 'Tokens sémantiques utilisés',
    value: '32',
    detail: 'sur 129 définis — 97 sont du poids mort',
  },
  {
    label: 'Composants du design system',
    value: '56',
    detail: '51 visuels, à confronter à leur spec Figma',
  },
];
