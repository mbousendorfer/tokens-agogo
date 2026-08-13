import type { NextConfig } from 'next';

/**
 * Le Storybook du design system, proxifié en same-origin.
 *
 * CSS-UI ne couvre pas tous les composants : les plus endettés (`nav-selector`,
 * `select`, `paginator`, `datepicker`) n'existent qu'en Angular, et seul le Storybook
 * du design system sait les rendre.
 *
 * En le servant sous notre propre origine, on peut injecter la feuille de tokens
 * chaînée et le bloc d'overrides directement dans son `<head>` — sans `postMessage`,
 * et **sans aucune modification du repo design system** (ADR 006).
 *
 * Le Storybook doit tourner en local : `ng run web:storybook` dans le repo du design
 * system. Sans lui, la route renvoie une erreur de connexion, ce que l'app signale.
 */
const STORYBOOK_ORIGIN = process.env.DS_STORYBOOK_URL ?? 'http://localhost:6006';

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/storybook/:path*', destination: `${STORYBOOK_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
