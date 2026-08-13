import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { DownloadChangeset } from '@/components/download-changeset';
import { groupByFile, missingTargets, replacementTally } from '@/lib/changeset';
import { unifiedChangeset, unifiedMarkdown } from '@/lib/unified-changeset';
import { EMPTY_OVERRIDES, type OverrideState } from '@/lib/token-overrides';
import { declarationData } from '@/lib/declarations';
import { EMPTY_STATE, type MigrationState } from '@/lib/decisions';
import { allTokens } from '@/lib/tokens';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

async function readState(): Promise<MigrationState> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), 'migration-state.json'), 'utf8'));
  } catch {
    return EMPTY_STATE;
  }
}

async function readOverrides(): Promise<OverrideState> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), 'token-overrides.json'), 'utf8'));
  } catch {
    return EMPTY_OVERRIDES;
  }
}

/** Les fichiers de tokens émis depuis Figma, s'ils ont été générés. */
async function emittedFiles(): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  const walk = async (dir: string): Promise<string[]> => {
    const entries = await readdir(dir, { withFileTypes: true });
    return (
      await Promise.all(
        entries.map((entry) =>
          entry.isDirectory()
            ? walk(join(dir, entry.name))
            : Promise.resolve([join(dir, entry.name)]),
        ),
      )
    ).flat();
  };
  try {
    return (await walk('dist/tokens')).sort();
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';

export default async function ChangesetPage() {
  const [state, overrides, emitted] = await Promise.all([
    readState(),
    readOverrides(),
    emittedFiles(),
  ]);
  const unified = unifiedChangeset({ decisions: state, overrides, emittedFiles: emitted });
  const files = groupByFile(state);
  const tally = replacementTally(state);
  const known = new Set(allTokens().map((token) => token.name));
  const missing = missingTargets(state, known);

  const total = unified.totals.overrides + unified.totals.decisions + unified.totals.files;
  const markdown = unifiedMarkdown(unified, declarationData.source);

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

          <section className="mb-8 space-y-3">
            {unified.steps.map((step) => (
              <div key={step.order} className="rounded-lg border p-4">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-medium">
                    {step.order}. {step.title}
                  </h2>
                  <Badge variant={step.risk === 'moyen' ? 'secondary' : 'outline'}>
                    risque {step.risk}
                  </Badge>
                  <span className="text-muted-foreground text-xs">touche {step.touches}</span>
                  <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                    {step.operations.length}
                  </span>
                </div>
                <p className="text-muted-foreground max-w-3xl text-xs leading-relaxed">
                  {step.rationale}
                </p>
                {step.operations.length > 0 && (
                  <ul className="mt-2 space-y-0.5 font-mono text-xs">
                    {step.operations.slice(0, 6).map((operation) => (
                      <li key={operation} className="text-muted-foreground truncate">
                        {operation}
                      </li>
                    ))}
                    {step.operations.length > 6 && (
                      <li className="text-muted-foreground opacity-60">
                        … et {step.operations.length - 6} autres, dans le fichier exporté
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </section>

          <section className="mb-8">
            <h2 className="mb-2 text-sm font-medium">Remplacements décidés</h2>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Remplacer</TableHead>
                    <TableHead>Par</TableHead>
                    <TableHead className="text-right">Occurrences</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tally.map((entry) => (
                    <TableRow key={`${entry.from}-${entry.to}`}>
                      <TableCell className="px-3 py-1.5 font-mono">{entry.from}</TableCell>
                      <TableCell className="px-3 py-1.5 font-mono">{entry.to}</TableCell>
                      <TableCell className="px-3 py-1.5 text-right tabular-nums">
                        {entry.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
