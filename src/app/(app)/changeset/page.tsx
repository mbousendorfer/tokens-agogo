import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { DownloadChangeset } from '@/components/download-changeset';
import { buildChangeset, changesetMarkdown } from '@/lib/changeset';

const RISK_LABELS: Record<string, string> = {
  nul: 'risque nul',
  faible: 'risque faible',
  moyen: 'risque moyen',
};

export default function ChangesetPage() {
  const { steps, totals } = buildChangeset();
  const markdown = changesetMarkdown();

  return (
    <>
      <PageHeader
        title="Changeset"
        blurb="Le plan d’opérations à appliquer sur le repo du design system."
      />

      <section className="mb-8 flex items-start justify-between gap-6">
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Les étapes sont ordonnées du moins risqué au plus risqué, et l’ordre n’est pas cosmétique
          : re-pointer {totals.malAlias} tokens de composant ne touche{' '}
          <strong className="text-foreground">aucun composant</strong> — c’est du JSON — là où
          réécrire {totals.callSites.toLocaleString('fr-FR')} call sites demande d’éditer des
          feuilles de style et de relire le rendu.
        </p>
        <DownloadChangeset markdown={markdown} />
      </section>

      <div className="space-y-6">
        {steps.map((step) => (
          <section key={step.order} className="rounded-lg border p-5">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-medium">
                {step.order}. {step.title}
              </h2>
              <Badge variant={step.risk === 'moyen' ? 'secondary' : 'outline'}>
                {RISK_LABELS[step.risk]}
              </Badge>
              <span className="text-muted-foreground text-xs">touche {step.touches}</span>
              <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                {step.operations.length} opération{step.operations.length > 1 ? 's' : ''}
              </span>
            </div>

            <p className="text-muted-foreground mb-4 max-w-3xl text-xs leading-relaxed">
              {step.rationale}
            </p>

            {step.operations.length === 0 ? (
              <p className="text-muted-foreground text-xs">Rien à faire.</p>
            ) : (
              <ul className="space-y-0.5 font-mono text-xs">
                {step.operations.slice(0, 12).map((operation, index) => (
                  <li key={`${operation.kind}-${index}`} className="text-muted-foreground">
                    {operation.detail}
                  </li>
                ))}
                {step.operations.length > 12 && (
                  <li className="text-muted-foreground opacity-60">
                    … et {step.operations.length - 12} autres, dans le fichier exporté
                  </li>
                )}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
