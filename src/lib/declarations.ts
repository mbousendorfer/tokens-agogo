import data from '../../data/declarations.json';
import { allTokens, type Tier, type Token } from './tokens';

export type Declaration = {
  token: string;
  tier: Tier;
  fallback: string | null;
  fallbackIsToken?: boolean;
  viaFallback?: boolean;
  dynamic?: boolean;
  property: string | null;
  value: string;
  selector: string | null;
  states: string[];
  variants: string[];
  atRule: string | null;
  isDefinition: boolean;
  file: string;
  line: number;
  entryPoint: string;
  kind: string;
};

export type EntryPoint = {
  id: string;
  kind: string;
  files: string[];
  byTier: Record<Tier, number>;
  rawRefTokens: string[];
  hardcodedFallbacks: number;
  debt: number;
};

export type CssDefinition = {
  token: string;
  value: string;
  selector: string;
  file: string;
  line: number;
};

export type DeclarationData = {
  source: { ref: string; sha: string; scannedFiles: number };
  counts: { total: number; byTier: Record<Tier, number>; uniqueByTier: Record<Tier, number> };
  entryPoints: EntryPoint[];
  byToken: Record<string, number[]>;
  cssDefinitions: CssDefinition[];
  declarations: Declaration[];
};

/**
 * L'index fait ~1,4 Mo : il reste côté serveur. Les pages en extraient ce dont elles
 * ont besoin et ne l'envoient jamais entier au navigateur.
 */
export const declarationData = data as unknown as DeclarationData;

export function declarationsFor(token: string): Declaration[] {
  return (declarationData.byToken[token] ?? []).map((i) => declarationData.declarations[i]);
}

export function usageCount(token: string): number {
  return declarationData.byToken[token]?.length ?? 0;
}

export type TokenRow = Token & {
  usages: number;
  /** Défini mais jamais consommé : la suppression la moins chère de la migration. */
  orphan: boolean;
};

export function tokenRows(): TokenRow[] {
  return allTokens().map((token) => {
    const usages = usageCount(token.name);
    return { ...token, usages, orphan: usages === 0 };
  });
}

/**
 * Les tokens consommés par le code mais définis **nulle part** : ni par Style Dictionary,
 * ni par une feuille de style. Ces règles tombent silencieusement dans le vide.
 *
 * La seconde condition compte : le design system déclare des custom properties locales
 * avec un préfixe `--comp-` (`--comp-avatar-size: 16px` dans `status-card`). Les ignorer
 * ferait remonter une vingtaine de faux bugs.
 */
export function danglingTokens(): { token: string; usages: number; files: string[] }[] {
  const defined = new Set(allTokens().map((t) => t.name));
  for (const definition of declarationData.cssDefinitions) defined.add(definition.token);

  return Object.entries(declarationData.byToken)
    .filter(
      ([name]) => !defined.has(name) && !name.includes('#{') && /^--(ref|sys|comp)-/.test(name),
    )
    .map(([token, indices]) => ({
      token,
      usages: indices.length,
      files: [
        ...new Set(
          indices.map(
            (i) =>
              `${declarationData.declarations[i].file}:${declarationData.declarations[i].line}`,
          ),
        ),
      ],
    }))
    .sort((a, b) => b.usages - a.usages);
}
