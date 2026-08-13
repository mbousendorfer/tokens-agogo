import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Sources du design system matérialisées par les scripts `ds:*`. Ce n'est pas
    // notre code : le linter n'a rien à en dire, et certaines stories sont Angular.
    '.cache/**',
    // Artefacts générés, commités pour le mode démo (ADR 009).
    'public/ds/**',
    'data/**',
  ]),
]);

export default eslintConfig;
