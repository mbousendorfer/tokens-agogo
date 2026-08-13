import { declarationData } from './declarations';

/**
 * La liste des composants à traiter, les plus endettés d'abord.
 *
 * Plus de verdicts calculés : le verdict, c'est la décision que l'on prend dans
 * l'atelier, déclaration par déclaration (ADR 011).
 */
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
        toDecide: entry.byTier.ref + entry.byTier.comp,
        debt: entry.byTier.ref,
        progress: systemic ? entry.byTier.sys / systemic : 1,
      };
    })
    .sort((a, b) => b.toDecide - a.toDecide || a.name.localeCompare(b.name));
}
