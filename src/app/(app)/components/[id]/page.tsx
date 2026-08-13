import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { ComponentWorkbench } from '@/components/component-workbench';
import { alignComponent, VERDICT_LABELS, type Verdict } from '@/lib/alignment';
import { specimensByComponent } from '@/lib/specimens';
import { colorPrimitives } from '@/lib/tokens';

const VERDICT_ORDER: Verdict[] = [
  'dette',
  'a-migrer',
  'a-decider',
  'semantique',
  'conforme',
  'interne',
];

export default async function ComponentDetailPage({ params }: PageProps<'/components/[id]'>) {
  const { id: raw } = await params;
  const id = decodeURIComponent(raw);

  const alignment = alignComponent(id);
  if (!alignment) notFound();

  // Le nom d'entry point et le nom de spécimen ne coïncident pas toujours
  // (`split-button` contre `SplitButton`) : on rapproche sur une forme normalisée.
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const specimens =
    specimensByComponent().find((group) => normalize(group.component) === normalize(alignment.name))
      ?.items ?? [];

  const primitives = colorPrimitives()
    .filter((token) => alignment.declarations.some((d) => d.token === token.name))
    .map((token) => ({ ...token, dependents: 0 }));

  return (
    <>
      <Link
        href="/components"
        className="text-muted-foreground mb-4 inline-block text-sm hover:underline"
      >
        ← Composants
      </Link>

      <PageHeader
        title={alignment.name}
        blurb={`${alignment.declarations.length} déclarations · ${Math.round(alignment.progress * 100)} % déjà sémantiques`}
      />

      <section className="mb-6 flex flex-wrap gap-2">
        {VERDICT_ORDER.filter((verdict) => alignment.byVerdict[verdict]).map((verdict) => (
          <Badge key={verdict} variant={verdict === 'dette' ? 'destructive' : 'secondary'}>
            {VERDICT_LABELS[verdict]} · {alignment.byVerdict[verdict]}
          </Badge>
        ))}
        {!alignment.hasFigmaSpec && (
          <Badge variant="outline" title={`Aucun binding Figma pour « ${alignment.figmaName} »`}>
            spec Figma absente
          </Badge>
        )}
      </section>

      <ComponentWorkbench
        specimens={specimens.map(({ id: specimenId, story }) => ({ id: specimenId, story }))}
        declarations={alignment.declarations.map((d) => ({
          token: d.token,
          tier: d.tier,
          verdict: d.verdict,
          property: d.property,
          selector: d.selector,
          states: d.states,
          variants: d.variants,
          file: d.file,
          line: d.line,
          fallback: d.fallback,
          fallbackIsToken: d.fallbackIsToken ?? false,
        }))}
        primitives={primitives}
      />
    </>
  );
}
