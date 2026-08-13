import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { declarationsFor } from '@/lib/declarations';
import { allTokens } from '@/lib/tokens';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** Remonte la chaîne d'alias jusqu'au littéral. */
function resolutionChain(name: string): string[] {
  const byName = new Map(allTokens().map((t) => [t.name, t]));
  const chain = [name];
  let current = byName.get(name);
  while (current?.aliasOf && !chain.includes(current.aliasOf)) {
    chain.push(current.aliasOf);
    current = byName.get(current.aliasOf);
  }
  return chain;
}

export default async function TokenDetailPage({ params }: PageProps<'/tokens/[token]'>) {
  const { token: raw } = await params;
  const name = decodeURIComponent(raw);

  const token = allTokens().find((t) => t.name === name);
  const declarations = declarationsFor(name);
  if (!token && !declarations.length) notFound();

  const chain = token ? resolutionChain(name) : [name];
  const byEntryPoint = Object.groupBy(declarations, (d) => d.entryPoint);

  return (
    <>
      <Link
        href="/tokens"
        className="text-muted-foreground mb-4 inline-block text-sm hover:underline"
      >
        ← Tokens
      </Link>

      <PageHeader
        title={name}
        blurb={
          token
            ? `${token.tier} · ${declarations.length} usage(s) dans le code`
            : 'Référencé par le code, mais défini nulle part.'
        }
      />

      {token && (
        <section className="mb-8 rounded-lg border p-5">
          <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
            Chaîne de résolution
          </p>
          <ol className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {chain.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                {index > 0 && <span className="text-muted-foreground">→</span>}
                <Link href={`/tokens/${encodeURIComponent(step)}`} className="hover:underline">
                  {step}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-2">
              <span className="text-muted-foreground">→</span>
              {token.value && /^#[0-9a-f]{3,8}$/i.test(token.value) && (
                <span
                  className="inline-block size-4 rounded-sm border"
                  style={{ background: token.value }}
                />
              )}
              <span className="font-medium">{token.value}</span>
            </li>
          </ol>
        </section>
      )}

      {declarations.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucun usage dans le code. Ce token est un orphelin : le supprimer ne demande aucune revue
          visuelle.
        </p>
      ) : (
        <section className="space-y-6">
          {Object.entries(byEntryPoint).map(([entryPoint, items]) => (
            <div key={entryPoint}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
                {entryPoint}
                <Badge variant="outline" className="text-[10px]">
                  {items?.length}
                </Badge>
              </h2>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sélecteur</TableHead>
                      <TableHead>Propriété</TableHead>
                      <TableHead>États</TableHead>
                      <TableHead>Fichier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items?.map((declaration, index) => (
                      <TableRow key={`${declaration.file}:${declaration.line}:${index}`}>
                        <TableCell className="max-w-md px-3 py-1.5 font-mono break-all">
                          {declaration.selector || <span className="opacity-40">—</span>}
                        </TableCell>
                        <TableCell className="px-3 py-1.5 font-mono">
                          {declaration.property ?? <span className="opacity-40">—</span>}
                        </TableCell>
                        <TableCell className="px-3 py-1.5">
                          {declaration.states.length ? (
                            <span className="flex flex-wrap gap-1">
                              {declaration.states.map((state) => (
                                <Badge key={state} variant="secondary" className="text-[10px]">
                                  {state}
                                </Badge>
                              ))}
                            </span>
                          ) : (
                            <span className="opacity-40">défaut</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground px-3 py-1.5 font-mono whitespace-nowrap">
                          {declaration.file.split('/').slice(-2).join('/')}:{declaration.line}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
