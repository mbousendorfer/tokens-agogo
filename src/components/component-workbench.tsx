'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PreviewFrame } from '@/components/preview-frame';
import { VERDICT_LABELS, type Verdict } from '@/lib/alignment';
import type { Token } from '@/lib/tokens';
import { cn } from '@/lib/utils';

type Row = {
  token: string;
  tier: string;
  verdict: Verdict;
  property: string | null;
  selector: string | null;
  states: string[];
  variants: string[];
  file: string;
  line: number;
  fallback: string | null;
  fallbackIsToken: boolean;
};

const VERDICT_STYLES: Record<Verdict, string> = {
  dette: 'bg-destructive/10 text-destructive',
  'a-migrer': 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  'a-decider': 'bg-muted text-muted-foreground',
  semantique: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  conforme: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  interne: 'bg-muted text-muted-foreground',
};

/**
 * L'atelier d'un composant : la preview d'un côté, ses déclarations de l'autre.
 *
 * Les déclarations sont groupées par **état**, parce que c'est la maille à laquelle
 * Figma prescrit — « le fond de ce bouton, survolé » — et donc la maille à laquelle
 * la décision se prend (ADR 003).
 */
export function ComponentWorkbench({
  specimens,
  declarations,
  primitives,
}: {
  specimens: { id: string; story: string }[];
  declarations: Row[];
  primitives: (Token & { dependents: number })[];
}) {
  const [specimen, setSpecimen] = useState(specimens[0]?.id);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [stateFilter, setStateFilter] = useState<string>('tous');

  const states = useMemo(() => {
    const all = new Set<string>();
    for (const row of declarations) {
      if (!row.states.length) all.add('défaut');
      for (const state of row.states) all.add(state);
    }
    return ['tous', ...[...all].sort()];
  }, [declarations]);

  const grouped = useMemo(() => {
    const filtered = declarations.filter(
      (row) =>
        stateFilter === 'tous' ||
        (stateFilter === 'défaut' ? !row.states.length : row.states.includes(stateFilter)),
    );
    const map = new Map<string, Row[]>();
    for (const row of filtered) {
      const key = row.states.length ? row.states.join(' + ') : 'défaut';
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return [...map.entries()].sort(([a], [b]) =>
      a === 'défaut' ? -1 : b === 'défaut' ? 1 : a.localeCompare(b),
    );
  }, [declarations, stateFilter]);

  return (
    <div className="space-y-8">
      {specimens.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
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
            {Object.keys(overrides).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setOverrides({})}
              >
                Réinitialiser les tokens
              </Button>
            )}
          </div>
          <PreviewFrame
            key={specimen}
            specimenId={specimen}
            overrides={overrides}
            className="h-64 w-full rounded-lg border bg-white"
          />
        </section>
      )}

      {primitives.length > 0 && (
        <section>
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Primitives lues par ce composant
          </p>
          <div className="flex flex-wrap gap-1">
            {primitives.map((token) => {
              const current = overrides[token.name] ?? token.value ?? '#000000';
              return (
                <label
                  key={token.name}
                  title={`${token.name} — ${token.value}`}
                  className={cn(
                    'relative size-7 cursor-pointer rounded border',
                    token.name in overrides && 'ring-foreground ring-2 ring-offset-1',
                  )}
                  style={{ background: current }}
                >
                  <input
                    type="color"
                    value={current}
                    onChange={(event) =>
                      setOverrides((previous) => ({
                        ...previous,
                        [token.name]: event.target.value.toUpperCase(),
                      }))
                    }
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-1">
          {states.map((state) => (
            <button
              key={state}
              type="button"
              onClick={() => setStateFilter(state)}
              className={cn(
                'rounded-md px-2.5 py-1 font-mono text-xs',
                state === stateFilter
                  ? 'bg-secondary text-secondary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-secondary/50',
              )}
            >
              {state}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {grouped.map(([state, rows]) => (
            <div key={state}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                {state}
                <Badge variant="outline" className="text-[10px]">
                  {rows.length}
                </Badge>
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Verdict</th>
                      <th className="px-3 py-2 text-left font-medium">Propriété</th>
                      <th className="px-3 py-2 text-left font-medium">Token utilisé</th>
                      <th className="px-3 py-2 text-left font-medium">Sélecteur</th>
                      <th className="px-3 py-2 text-left font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={`${row.file}:${row.line}:${index}`} className="border-t">
                        <td className="px-3 py-1.5">
                          <span
                            className={cn(
                              'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
                              VERDICT_STYLES[row.verdict],
                            )}
                          >
                            {VERDICT_LABELS[row.verdict]}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-mono">
                          {row.property ?? <span className="opacity-40">—</span>}
                        </td>
                        <td className="px-3 py-1.5">
                          <Link
                            href={`/tokens/${encodeURIComponent(row.token)}`}
                            className="font-mono hover:underline"
                          >
                            {row.token}
                          </Link>
                          {row.fallback && !row.fallbackIsToken && (
                            <span
                              className="text-destructive ml-2 font-mono"
                              title="Valeur en dur cachée dans un fallback"
                            >
                              ↳ {row.fallback}
                            </span>
                          )}
                        </td>
                        <td className="max-w-xs px-3 py-1.5 font-mono break-all opacity-70">
                          {row.selector || '—'}
                        </td>
                        <td className="text-muted-foreground px-3 py-1.5 font-mono whitespace-nowrap">
                          {row.file.split('/').at(-1)}:{row.line}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
