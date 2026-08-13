'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PreviewFrame } from '@/components/preview-frame';
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
  value: string | null;
  fallback: string | null;
  fallbackIsToken: boolean;
  candidates: Candidate[];
};

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
  const [state, setState] = useState<MigrationState>(EMPTY_STATE);
  const [stateFilter, setStateFilter] = useState('à traiter');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

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
    if (stateFilter === 'tout') return rows;
    if (stateFilter === 'décidé')
      return rows.filter((row) => decisions.has(decisionKey(row.file, row.line, row.token)));
    return todo;
  }, [rows, todo, decisions, stateFilter]);

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
        </Badge>
        <div className="flex gap-1">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStateFilter(filter)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs',
                filter === stateFilter
                  ? 'bg-secondary text-secondary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-secondary/50',
              )}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
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

      {specimens.length > 0 && (
        <section>
          <div className="mb-2 flex flex-wrap gap-1">
            {specimens.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSpecimen(item.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs',
                  item.id === specimen
                    ? 'bg-secondary text-secondary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary/50',
                )}
              >
                {item.story}
              </button>
            ))}
          </div>
          <PreviewFrame
            key={specimen}
            specimenId={specimen}
            overrides={overrides}
            className="h-56 w-full rounded-lg border bg-white"
          />
          {Object.keys(overrides).length > 0 && (
            <p className="text-muted-foreground mt-1.5 text-xs">
              La preview applique les {Object.keys(overrides).length} décision(s) prises.
            </p>
          )}
        </section>
      )}

      <div className="space-y-6">
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
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Propriété</th>
                    <th className="px-3 py-2 text-left font-medium">Token actuel</th>
                    <th className="w-[280px] px-3 py-2 text-left font-medium">Nouveau token</th>
                    <th className="px-3 py-2 text-left font-medium">Sélecteur</th>
                    <th className="px-3 py-2 text-left font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {stateRows.map((row) => {
                    const key = decisionKey(row.file, row.line, row.token);
                    const decision = decisions.get(key);
                    return (
                      <tr key={key} className="border-t align-middle">
                        <td className="px-3 py-1.5 font-mono">
                          {row.property ?? <span className="opacity-40">—</span>}
                        </td>
                        <td className="px-3 py-1.5">
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
                        </td>
                        <td className="px-3 py-1.5">
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
                        </td>
                        <td className="max-w-[220px] px-3 py-1.5 font-mono break-all opacity-70">
                          {row.selector || '—'}
                        </td>
                        <td className="text-muted-foreground px-3 py-1.5 font-mono whitespace-nowrap">
                          {row.file.split('/').at(-1)}:{row.line}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
