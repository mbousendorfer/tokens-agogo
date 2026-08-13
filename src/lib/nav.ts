export type NavItem = {
  href: string;
  label: string;
  /** Une phrase : ce que la vue sert à faire. */
  blurb: string;
};

/**
 * Les vues de l'app. `/components` est la vue principale : c'est là que se prend
 * la décision de migration, déclaration par déclaration (ADR 003).
 */
export const NAV: NavItem[] = [
  {
    href: '/',
    label: 'Vue d’ensemble',
    blurb: 'Où en est la migration, et ce qui reste.',
  },
  {
    href: '/components',
    label: 'Composants',
    blurb: 'Ce que Figma prescrit face à ce que le code fait, par état.',
  },
  {
    href: '/tokens',
    label: 'Tokens',
    blurb: 'Les tokens, leur chaîne de résolution et leurs usages réels.',
  },
  {
    href: '/palettes',
    label: 'Palettes',
    blurb: 'Les ramps de couleur, leur régularité et leur accessibilité.',
  },
  {
    href: '/changeset',
    label: 'Changeset',
    blurb: 'Le plan d’opérations à appliquer sur le design system.',
  },
];
