import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { alignableComponents } from '@/lib/alignment';
import { cn } from '@/lib/utils';

const KIND_LABELS: Record<string, string> = {
  angular: 'Angular',
  'css-ui': 'CSS-UI',
};

export default function ComponentsPage() {
  const components = alignableComponents();
  const totalToDecide = components.reduce((sum, c) => sum + c.toDecide, 0);

  return (
    <>
      <PageHeader
        title="Composants"
        blurb="Ce que Figma prescrit face à ce que le code fait, état par état."
      />

      <section className="mb-6 flex flex-wrap gap-6 text-sm">
        <span>
          <strong className="tabular-nums">{components.length}</strong> composants
        </span>
        <span className="text-muted-foreground">
          <strong className="text-foreground tabular-nums">
            {totalToDecide.toLocaleString('fr-FR')}
          </strong>{' '}
          déclarations à décider
        </span>
      </section>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Composant</th>
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-right font-medium">À décider</th>
              <th className="px-3 py-2 text-right font-medium">Primitives</th>
              <th className="px-3 py-2 text-right font-medium">Sémantiques</th>
              <th className="w-40 px-3 py-2 text-left font-medium">Déjà sémantique</th>
            </tr>
          </thead>
          <tbody>
            {components.map((component) => (
              <tr key={component.id} className="hover:bg-muted/30 border-t">
                <td className="px-3 py-1.5">
                  <Link
                    href={`/components/${encodeURIComponent(component.id)}`}
                    className="font-medium hover:underline"
                  >
                    {component.name}
                  </Link>
                </td>
                <td className="text-muted-foreground px-3 py-1.5 text-xs">
                  {KIND_LABELS[component.kind] ?? component.kind}
                </td>
                <td className="px-3 py-1.5 text-right text-xs font-medium tabular-nums">
                  {component.toDecide || '—'}
                </td>
                <td
                  className={cn(
                    'px-3 py-1.5 text-right text-xs tabular-nums',
                    component.debt > 0 && 'text-destructive',
                  )}
                >
                  {component.byTier.ref || '—'}
                </td>
                <td className="px-3 py-1.5 text-right text-xs tabular-nums">
                  {component.byTier.sys || '—'}
                </td>
                <td className="px-3 py-1.5">
                  <span className="flex items-center gap-2">
                    <span className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                      <span
                        className="bg-foreground block h-full rounded-full"
                        style={{ width: `${Math.round(component.progress * 100)}%` }}
                      />
                    </span>
                    <span className="text-muted-foreground w-8 text-right text-xs tabular-nums">
                      {Math.round(component.progress * 100)}%
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-muted-foreground mt-4 text-xs">
        Ouvrez un composant pour choisir le token cible de chacune de ses déclarations. Les
        décisions s’accumulent ; rien n’est écrit dans le design system avant l’export.
      </p>
    </>
  );
}
