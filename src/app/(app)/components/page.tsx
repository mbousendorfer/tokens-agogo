import { PageHeader } from '@/components/page-header';
import { TokenPlayground, type EditablePrimitive } from '@/components/token-playground';
import { specimenData, specimensByComponent } from '@/lib/specimens';
import { colorPrimitives, dependentCount } from '@/lib/tokens';

export default function ComponentsPage() {
  const groups = specimensByComponent();

  // Une seule ramp par famille suffit à montrer la cascade ; on garde les primitives
  // de couleur, avec le nombre de tokens qui en dépendent.
  const primitives: EditablePrimitive[] = colorPrimitives().map((token) => ({
    ...token,
    dependents: dependentCount(token.name),
  }));

  return (
    <>
      <PageHeader
        title="Composants"
        blurb="Les vrais composants du design system, et l’effet réel d’un changement de token."
      />

      <TokenPlayground groups={groups} primitives={primitives} />

      <p className="text-muted-foreground mt-6 text-xs">
        {specimenData.counts.specimens} spécimens extraits de{' '}
        {specimenData.counts.files - specimenData.counts.skipped} fichiers de stories CSS-UI (
        <code className="font-mono">{specimenData.source.ref}</code> @{' '}
        <code className="font-mono">{specimenData.source.sha}</code>).
        {specimenData.skipped.length > 0 && (
          <>
            {' '}
            {specimenData.skipped.length} fichier(s) sauté(s) —{' '}
            {specimenData.skipped.map((s) => s.file.split('/').at(-1)).join(', ')} : story Angular,
            hors de portée de la couche CSS-UI. Ces composants arriveront avec la seconde surface de
            preview.
          </>
        )}{' '}
        La comparaison avec les specs Figma arrive à l’étape 5.
      </p>
    </>
  );
}
