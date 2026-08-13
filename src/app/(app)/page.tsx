import { PageHeader, Stat } from '@/components/page-header';
import { BASELINE, BASELINE_MEASURED_AT } from '@/lib/baseline';

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Migration"
        title="Vue d’ensemble"
        blurb="Où en est la migration du Design System, et ce qui reste à faire."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BASELINE.map((stat, index) => (
          <Stat
            key={stat.label}
            label={stat.label}
            value={stat.value}
            detail={stat.detail}
            tone={index === 0 ? 'caution' : 'neutral'}
          />
        ))}
      </section>

      <section className="mt-10 max-w-3xl space-y-4 text-[13px] leading-relaxed">
        <h2 className="font-display text-[15px] font-semibold">Ce que dit ce point de départ</h2>
        <p>
          <strong>Le layer sémantique actuel est presque mort, et de toute façon inadapté.</strong>{' '}
          97 de ses 129 tokens ne sont jamais utilisés, et il est organisé par famille et état là où
          Figma organise par rôle — surface, texte, bordure, icône, lien, données. Deux axes
          différents : on substitue, on ne renomme pas.
        </p>
        <p>
          <strong>La dette a deux visages, et ils ne coûtent pas la même chose.</strong> 232 tokens
          de composant mal aliasés se corrigent en éditant des JSON, sans toucher un seul composant.
          Les 1 884 call sites bruts, eux, demandent d’éditer des feuilles de style. Le premier
          chantier est bien moins risqué et doit passer en premier.
        </p>
        <p className="text-muted-foreground text-xs">
          Mesuré sur <code className="font-mono">master</code> le {BASELINE_MEASURED_AT}. Ces
          chiffres deviendront dynamiques à l’étape 3, quand l’index de déclarations sera en place.
        </p>
      </section>
    </>
  );
}
