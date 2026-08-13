import figma from '../../data/figma.json';
import { declarationData, type Declaration } from './declarations';

export type FigmaData = {
  hasVariables: boolean;
  hasComponents: boolean;
  counts: Record<string, number>;
  components: Record<
    string,
    {
      key: string | null;
      page: string;
      variants: Record<
        string,
        {
          properties: Record<string, string> | null;
          parts: Record<string, Record<string, { figmaName: string; cssName: string }[]>>;
        }
      >;
    }
  >;
};

export const figmaData = figma as unknown as FigmaData;

/**
 * Le verdict d'une déclaration.
 *
 * `conforme` et `à migrer` ne sont prononçables que si Figma dit quelque chose sur
 * cette partie dans cet état. Sans binding, on ne devine pas : on qualifie ce que le
 * code fait, et la décision reste à prendre (ADR 003).
 */
export type Verdict =
  | 'conforme' // le code utilise le token prescrit par Figma
  | 'a-migrer' // Figma prescrit autre chose — la cible est connue
  | 'semantique' // pas de binding Figma, mais le code lit déjà un token sémantique
  | 'a-decider' // pas de binding, le code passe par un token de composant
  | 'dette' // pas de binding, le code lit une primitive brute
  | 'interne'; // custom property locale au composant, hors système

export const VERDICT_LABELS: Record<Verdict, string> = {
  conforme: 'Conforme',
  'a-migrer': 'À migrer',
  semantique: 'Sémantique',
  'a-decider': 'À décider',
  dette: 'Dette',
  interne: 'Interne',
};

export type AlignedDeclaration = Declaration & {
  verdict: Verdict;
  /** Le token que Figma prescrit, quand il est connu. */
  target: string | null;
};

/** Les bindings Figma d'un composant, aplatis en `token prescrit -> vrai`. */
function prescribedTokens(componentName: string): Set<string> {
  const component = figmaData.components?.[componentName];
  if (!component) return new Set();

  const tokens = new Set<string>();
  for (const variant of Object.values(component.variants)) {
    for (const part of Object.values(variant.parts)) {
      for (const bindings of Object.values(part)) {
        for (const binding of bindings) tokens.add(binding.cssName);
      }
    }
  }
  return tokens;
}

function verdictFor(declaration: Declaration, prescribed: Set<string>): AlignedDeclaration {
  if (prescribed.size) {
    if (prescribed.has(declaration.token)) {
      return { ...declaration, verdict: 'conforme', target: declaration.token };
    }
    // Figma parle de ce composant mais pas de ce token : la cible existe, reste à
    // l'apparier partie par partie. Tant que ce n'est pas fait, on ne l'invente pas.
    return { ...declaration, verdict: 'a-migrer', target: null };
  }

  const verdict: Verdict =
    declaration.tier === 'sys'
      ? 'semantique'
      : declaration.tier === 'comp'
        ? 'a-decider'
        : declaration.tier === 'ref'
          ? 'dette'
          : 'interne';

  return { ...declaration, verdict, target: null };
}

/** Le nom Figma probable d'un entry point : `ui-components/split-button` -> `Split Button`. */
export function figmaNameFor(entryPointId: string): string {
  return entryPointId
    .split('/')
    .at(-1)!
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export type ComponentAlignment = {
  id: string;
  name: string;
  kind: string;
  figmaName: string;
  hasFigmaSpec: boolean;
  declarations: AlignedDeclaration[];
  byVerdict: Record<Verdict, number>;
  /** Part de déclarations colorées qui lisent déjà un token sémantique. */
  progress: number;
};

export function alignComponent(entryPointId: string): ComponentAlignment | null {
  const entry = declarationData.entryPoints.find((e) => e.id === entryPointId);
  if (!entry) return null;

  const figmaName = figmaNameFor(entryPointId);
  const prescribed = prescribedTokens(figmaName);

  const declarations = declarationData.declarations
    .filter((d) => d.entryPoint === entryPointId && !d.isDefinition)
    .map((d) => verdictFor(d, prescribed));

  const byVerdict = declarations.reduce(
    (acc, d) => ({ ...acc, [d.verdict]: (acc[d.verdict] ?? 0) + 1 }),
    {} as Record<Verdict, number>,
  );

  const systemic = declarations.filter((d) => d.tier !== 'local');
  const aligned = systemic.filter((d) => d.verdict === 'conforme' || d.verdict === 'semantique');

  return {
    id: entryPointId,
    name: entryPointId.split('/').at(-1)!,
    kind: entry.kind,
    figmaName,
    hasFigmaSpec: prescribed.size > 0,
    declarations,
    byVerdict,
    progress: systemic.length ? aligned.length / systemic.length : 1,
  };
}

/** Tous les entry points visuels, les plus endettés d'abord. */
export function alignableComponents() {
  return declarationData.entryPoints
    .filter((entry) => entry.kind === 'angular' || entry.kind === 'css-ui')
    .map((entry) => {
      const systemic = entry.byTier.ref + entry.byTier.sys + entry.byTier.comp;
      return {
        id: entry.id,
        name: entry.id.split('/').at(-1)!,
        kind: entry.kind,
        byTier: entry.byTier,
        debt: entry.byTier.ref,
        progress: systemic ? entry.byTier.sys / systemic : 1,
      };
    })
    .sort((a, b) => b.debt - a.debt || a.name.localeCompare(b.name));
}
