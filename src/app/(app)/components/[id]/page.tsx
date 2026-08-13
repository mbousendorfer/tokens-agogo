import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { ComponentWorkbench, type WorkbenchRow } from '@/components/component-workbench';
import { candidatesFor } from '@/lib/candidates';
import { declarationData } from '@/lib/declarations';
import { specimensByComponent } from '@/lib/specimens';
import { allTokens } from '@/lib/tokens';
import { getModeInfo } from '@/server/mode';

export default async function ComponentDetailPage({ params }: PageProps<'/components/[id]'>) {
  const { id: raw } = await params;
  const id = decodeURIComponent(raw);

  const entry = declarationData.entryPoints.find((point) => point.id === id);
  if (!entry) notFound();

  const name = id.split('/').at(-1)!;
  const valueOf = new Map(allTokens().map((token) => [token.name, token.value]));

  const rows: WorkbenchRow[] = declarationData.declarations
    .filter((declaration) => declaration.entryPoint === id && !declaration.isDefinition)
    .map((declaration) => {
      const value = valueOf.get(declaration.token) ?? null;
      return {
        token: declaration.token,
        tier: declaration.tier,
        property: declaration.property,
        selector: declaration.selector,
        states: declaration.states,
        file: declaration.file,
        line: declaration.line,
        value,
        fallback: declaration.fallback,
        fallbackIsToken: declaration.fallbackIsToken ?? false,
        candidates:
          declaration.tier === 'local'
            ? []
            : candidatesFor({ property: declaration.property, currentValue: value }),
      };
    });

  // Le nom d'entry point et celui des spécimens ne coïncident pas toujours
  // (`split-button` contre `SplitButton`) : on rapproche sur une forme normalisée.
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const specimens =
    specimensByComponent().find((group) => normalize(group.component) === normalize(name))?.items ??
    [];

  return (
    <>
      <Link
        href="/components"
        className="text-muted-foreground mb-4 inline-block text-sm hover:underline"
      >
        ← Composants
      </Link>

      <PageHeader
        title={name}
        blurb="Choisissez le token cible de chaque déclaration. Rien n’est écrit dans le design system avant l’export."
      />

      <ComponentWorkbench
        componentId={id}
        specimens={specimens.map(({ id: specimenId, story }) => ({ id: specimenId, story }))}
        rows={rows}
        canWrite={getModeInfo().mode === 'local'}
      />
    </>
  );
}
