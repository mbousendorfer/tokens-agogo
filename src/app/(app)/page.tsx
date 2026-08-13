import { PageHeader } from '@/components/page-header';
import { BASELINE, BASELINE_MEASURED_AT } from '@/lib/baseline';

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Vue d’ensemble"
        blurb="Où en est la migration du Design System, et ce qui reste à faire."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BASELINE.map((stat) => (
          <div key={stat.label} className="rounded-lg border p-5">
            <p className="text-muted-foreground text-sm">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{stat.value}</p>
            <p className="text-muted-foreground mt-1 text-xs">{stat.detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 max-w-3xl space-y-4 text-sm leading-relaxed">
        <h2 className="text-base font-semibold">Ce que dit ce point de départ</h2>
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
