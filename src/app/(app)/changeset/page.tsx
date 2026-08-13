import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { DownloadChangeset } from '@/components/download-changeset';
import { changesetMarkdown, groupByFile, missingTargets, replacementTally } from '@/lib/changeset';
import { declarationData } from '@/lib/declarations';
import { EMPTY_STATE, type MigrationState } from '@/lib/decisions';
import { allTokens } from '@/lib/tokens';

async function readState(): Promise<MigrationState> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), 'migration-state.json'), 'utf8'));
  } catch {
    return EMPTY_STATE;
  }
}

export const dynamic = 'force-dynamic';

export default async function ChangesetPage() {
  const state = await readState();
  const files = groupByFile(state);
  const tally = replacementTally(state);
  const known = new Set(allTokens().map((token) => token.name));
  const missing = missingTargets(state, known);

  const total = files.reduce((sum, file) => sum + file.edits.length, 0);
  const markdown = changesetMarkdown(state, declarationData.source);

  return (
    <>
      <PageHeader
        title="Changeset"
        blurb="Les décisions prises, prêtes à être appliquées sur le design system."
      />

      {total === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-sm font-medium">Aucune décision pour l’instant</p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-relaxed">
            Ouvrez un composant et choisissez le token cible de ses déclarations. Les décisions
            s’accumulent ici, et cette page les transforme en liste d’éditions applicable.
          </p>
          <Link href="/components" className="mt-4 inline-block text-sm hover:underline">
            → Aller aux composants
          </Link>
        </div>
      ) : (
        <>
          <section className="mb-8 flex flex-wrap items-center gap-4">
            <Badge variant="secondary">
              {total} remplacement{total > 1 ? 's' : ''}
            </Badge>
            <span className="text-muted-foreground text-sm">
              dans {files.length} fichier{files.length > 1 ? 's' : ''}
            </span>
            <div className="ml-auto">
              <DownloadChangeset markdown={markdown} />
            </div>
          </section>

          {missing.length > 0 && (
            <section className="border-destructive/30 bg-destructive/5 mb-8 rounded-lg border p-4">
              <p className="text-sm font-medium">
                {missing.length} token{missing.length > 1 ? 's' : ''} cible
                {missing.length > 1 ? 's' : ''} à créer avant d’appliquer
              </p>
              <ul className="mt-2 space-y-0.5 font-mono text-xs">
                {[...new Set(missing.map((decision) => decision.to))].map((token) => (
                  <li key={token}>{token}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="mb-8">
            <h2 className="mb-2 text-sm font-medium">Remplacements décidés</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Remplacer</th>
                    <th className="px-3 py-2 text-left font-medium">Par</th>
                    <th className="px-3 py-2 text-right font-medium">Occurrences</th>
                  </tr>
                </thead>
                <tbody>
                  {tally.map((entry) => (
                    <tr key={`${entry.from}-${entry.to}`} className="border-t">
                      <td className="px-3 py-1.5 font-mono">{entry.from}</td>
                      <td className="px-3 py-1.5 font-mono">{entry.to}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{entry.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium">Par fichier</h2>
            <div className="space-y-4">
              {files.map(({ file, edits }) => (
                <div key={file} className="rounded-lg border p-4">
                  <p className="mb-2 font-mono text-xs">{file}</p>
                  <ul className="space-y-0.5 font-mono text-xs">
                    {edits.map((edit) => (
                      <li key={`${edit.line}-${edit.from}`} className="text-muted-foreground">
                        ligne {edit.line} — {edit.from} → {edit.to}
                        {edit.property && <span className="opacity-60"> ({edit.property})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
