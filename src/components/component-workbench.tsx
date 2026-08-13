'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PanelRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CssPreview } from '@/components/css-preview';
import { PreviewPanel } from '@/components/preview-panel';
import { TokenPicker } from '@/components/token-picker';
import type { Candidate } from '@/lib/candidates';
import { decisionKey, EMPTY_STATE, type Decision, type MigrationState } from '@/lib/decisions';
import { cn } from '@/lib/utils';

export type WorkbenchRow = {
  token: string;
  tier: string;
  property: string | null;
  selector: string | null;
  states: string[];
  file: string;
  line: number;
  /** La valeur résolue du token actuel, pour la pastille. */
  value: string | null;
  /** La valeur complète de la déclaration, telle qu'écrite dans le fichier. */
  declaration: string;
  fallback: string | null;
  fallbackIsToken: boolean;
  candidates: Candidate[];
};

/** Les états que la preview sait forcer, plus le défaut. */
const FORCED_STATES = ['tous', 'défaut', 'hover', 'focus', 'active', 'disabled'];

const TIER_STYLES: Record<string, string> = {
  ref: 'bg-destructive/10 text-destructive',
  comp: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  sys: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  local: 'bg-muted text-muted-foreground',
};

/**
 * L'atelier d'un composant : on y fait le travail.
 *
 * Chaque ligne est une déclaration réelle du design system, et chaque ligne se décide.
 * Les décisions s'appliquent immédiatement à la preview — la feuille de tokens est
 * chaînée, donc remplacer un token dans le bloc d'override suffit à voir le résultat.
 *
 * Rien n'est écrit dans le design system : les décisions s'accumulent et s'exportent
 * (ADR 011).
 */
export function ComponentWorkbench({
  componentId,
  specimens,
  rows,
  canWrite,
}: {
  componentId: string;
  specimens: { id: string; story: string }[];
  rows: WorkbenchRow[];
  canWrite: boolean;
}) {
  const [specimen, setSpecimen] = useState(specimens[0]?.id);
  const [forcedState, setForcedState] = useState('tous');
  const [state, setState] = useState<MigrationState>(EMPTY_STATE);
  const [stateFilter, setStateFilter] = useState('à traiter');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [previewOpen, setPreviewOpen] = useState(true);

  useEffect(() => {
    fetch('/api/decisions')
      .then((response) => response.json())
      .then(setState)
      .catch(() => setState(EMPTY_STATE));
  }, []);

  const decisions = useMemo(
    () =>
      new Map(
        state.decisions.map((decision) => [
          decisionKey(decision.file, decision.line, decision.from),
          decision,
        ]),
      ),
    [state],
  );

  const decide = useCallback(
    (row: WorkbenchRow, to: string | null) => {
      setSaving('idle');
      setState((previous) => {
        const key = decisionKey(row.file, row.line, row.token);
        const others = previous.decisions.filter(
          (decision) => decisionKey(decision.file, decision.line, decision.from) !== key,
        );
        if (to === null) return { ...previous, decisions: others };

        const decision: Decision = {
          file: row.file,
          line: row.line,
          from: row.token,
          to,
          component: componentId,
          property: row.property,
          states: row.states,
          decidedAt: new Date().toISOString(),
        };
        return { ...previous, decisions: [...others, decision] };
      });
    },
    [componentId],
  );

  const save = async () => {
    setSaving('saving');
    const response = await fetch('/api/decisions', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(state),
    });
    setSaving(response.ok ? 'saved' : 'error');
  };

  /**
   * Les décisions prises se traduisent en overrides pour la preview.
   *
   * Les tokens cibles viennent de Figma et n'existent pas encore dans le CSS du design
   * system : on injecte leur **valeur résolue**, pas un `var()` qui pointerait vers un
   * token absent et laisserait la déclaration vide.
   */
  const overrides = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of rows) {
      const decision = decisions.get(decisionKey(row.file, row.line, row.token));
      if (!decision?.to) continue;
      const candidate = row.candidates.find((c) => c.name === decision.to);
      if (candidate?.value) map[row.token] = candidate.value;
    }
    return map;
  }, [rows, decisions]);

  const decidedCount = rows.filter((row) =>
    decisions.has(decisionKey(row.file, row.line, row.token)),
  ).length;

  const todo = rows.filter(
    (row) => row.tier !== 'local' && !decisions.has(decisionKey(row.file, row.line, row.token)),
  );

  const filters = ['à traiter', 'tout', 'décidé'];
  const visible = useMemo(() => {
    const base =
      stateFilter === 'tout'
        ? rows
        : stateFilter === 'décidé'
          ? rows.filter((row) => decisions.has(decisionKey(row.file, row.line, row.token)))
          : todo;

    // L'état choisi pour la preview filtre aussi le tableau : on regarde le composant
    // dans un état, on traite les déclarations de cet état. Les deux doivent parler
    // de la même chose.
    if (forcedState === 'tous') return base;
    if (forcedState === 'défaut') return base.filter((row) => row.states.length === 0);
    return base.filter((row) => row.states.includes(forcedState));
  }, [rows, todo, decisions, stateFilter, forcedState]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkbenchRow[]>();
    for (const row of visible) {
      const key = row.states.length ? row.states.join(' + ') : 'défaut';
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return [...map.entries()].sort(([a], [b]) =>
      a === 'défaut' ? -1 : b === 'défaut' ? 1 : a.localeCompare(b),
    );
  }, [visible]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={todo.length ? 'secondary' : 'default'}>
          {decidedCount} décidé{decidedCount > 1 ? 'es' : 'e'} · {todo.length} à traiter
          {forcedState !== 'tous' && ` · ${visible.length} en « ${forcedState} »`}
        </Badge>
        <ToggleGroup
          type="single"
          size="sm"
          value={stateFilter}
          onValueChange={(value) => value && setStateFilter(value)}
          aria-label="Filtrer les déclarations"
        >
          {filters.map((filter) => (
            <ToggleGroupItem key={filter} value={filter} className="px-2.5 text-xs">
              {filter}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="ml-auto flex items-center gap-3">
          {specimens.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              aria-pressed={previewOpen}
              onClick={() => setPreviewOpen((open) => !open)}
              className={cn(previewOpen && 'border-signal/40 text-signal')}
            >
              <PanelRight className="size-3.5" />
              Preview
            </Button>
          )}
          {saving === 'saved' && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              enregistré dans migration-state.json
            </span>
          )}
          {saving === 'error' && (
            <span className="text-destructive text-xs">
              écriture impossible — mode démo, les décisions restent ici
            </span>
          )}
          <Button size="sm" onClick={save} disabled={!canWrite || saving === 'saving'}>
            {saving === 'saving' ? 'Enregistrement…' : 'Enregistrer les décisions'}
          </Button>
        </div>
      </div>

      {/*
        Deux colonnes : on décide à gauche, on regarde à droite. Le panneau est collant
        et plein hauteur, donc la ligne qu'on traite et le composant qu'elle peint
        restent visibles ensemble, quel que soit le défilement (ADR 012).
      */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <Tabs defaultValue="declarations">
            <TabsList className="mb-3 h-7">
              <TabsTrigger value="declarations" className="text-xs">
                Déclarations
              </TabsTrigger>
              <TabsTrigger value="css" className="text-xs">
                CSS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="css">
              {/* On édite là où on lit : chaque `var()` du code est un sélecteur. */}
              <CssPreview
                rows={rows
                  .filter((row) => row.tier !== 'local')
                  .map((row) => ({
                    file: row.file,
                    line: row.line,
                    selector: row.selector,
                    property: row.property,
                    value: row.declaration,
                    token: row.token,
                    to: decisions.get(decisionKey(row.file, row.line, row.token))?.to ?? null,
                    candidates: row.candidates,
                  }))}
                onDecide={(cssRow, to) => {
                  const row = rows.find(
                    (candidate) =>
                      candidate.file === cssRow.file &&
                      candidate.line === cssRow.line &&
                      candidate.token === cssRow.token,
                  );
                  if (row) decide(row, to);
                }}
              />
            </TabsContent>

            <TabsContent value="declarations" className="space-y-6">
              {grouped.length === 0 && (
                <p className="text-muted-foreground rounded-lg border border-dashed px-6 py-10 text-center text-sm">
                  Rien à traiter ici.
                </p>
              )}

              {grouped.map(([stateName, stateRows]) => (
                <section key={stateName}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                    {stateName}
                    <Badge variant="outline" className="text-[10px]">
                      {stateRows.length}
                    </Badge>
                  </h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Propriété</TableHead>
                          <TableHead>Token actuel</TableHead>
                          <TableHead className="w-[320px]">Nouveau token</TableHead>
                          <TableHead>Sélecteur</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stateRows.map((row) => {
                          const key = decisionKey(row.file, row.line, row.token);
                          const decision = decisions.get(key);
                          return (
                            <TableRow key={key}>
                              <TableCell className="px-3 py-1.5 font-mono">
                                {row.property ?? <span className="opacity-40">—</span>}
                              </TableCell>
                              <TableCell className="px-3 py-1.5">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      'rounded px-1 py-0.5 text-[10px] font-medium',
                                      TIER_STYLES[row.tier],
                                    )}
                                  >
                                    {row.tier}
                                  </span>
                                  <Link
                                    href={`/tokens/${encodeURIComponent(row.token)}`}
                                    className="font-mono hover:underline"
                                  >
                                    {row.token}
                                  </Link>
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-1.5">
                                {row.tier === 'local' ? (
                                  <span className="text-muted-foreground text-[11px]">
                                    custom property locale — hors système
                                  </span>
                                ) : (
                                  <TokenPicker
                                    current={row.token}
                                    chosen={decision?.to ?? null}
                                    candidates={row.candidates}
                                    onChoose={(token) => decide(row, token)}
                                    onClear={() => decide(row, null)}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="max-w-[220px] px-3 py-1.5 font-mono break-all opacity-70">
                                {row.selector || '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground px-3 py-1.5 font-mono whitespace-nowrap">
                                {row.file.split('/').at(-1)}:{row.line}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {previewOpen && specimens.length > 0 && (
          <PreviewPanel
            specimens={specimens}
            specimen={specimen}
            onSpecimen={setSpecimen}
            states={FORCED_STATES}
            state={forcedState}
            onState={setForcedState}
            overrides={overrides}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
