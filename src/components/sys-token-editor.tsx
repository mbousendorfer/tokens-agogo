'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TokenPicker } from '@/components/token-picker';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Candidate } from '@/lib/candidates';
import { EMPTY_OVERRIDES, type OverrideState } from '@/lib/token-overrides';
import { cn } from '@/lib/utils';

export type SysRow = {
  token: string;
  leaf: string;
  group: string;
  /** La primitive visée aujourd'hui. */
  aliasOf: string | null;
  value: string | null;
  accessibleValue: string | null;
  /** Combien de tokens dépendent de celui-ci, et combien de call sites au total. */
  dependents: number;
  callSites: number;
  primitives: Candidate[];
};

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Redéfinir vers quelle primitive pointe un token sémantique.
 *
 * C'est l'opération la plus puissante de la migration : changer `--sys-color-text-secondary`
 * de `grey-800` à `grey-900` déplace d'un coup tout ce qui en dépend. La portée est
 * donc affichée sur chaque ligne — combien de tokens en héritent, combien de call
 * sites au total — avant de toucher quoi que ce soit.
 */
export function SysTokenEditor({ rows, canWrite }: { rows: SysRow[]; canWrite: boolean }) {
  const [state, setState] = useState<OverrideState>(EMPTY_OVERRIDES);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('tous');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/overrides')
      .then((response) => response.json())
      .then(setState)
      .catch(() => setState(EMPTY_OVERRIDES));
  }, []);

  const overrides = useMemo(
    () => new Map(state.overrides.map((override) => [override.token, override])),
    [state],
  );

  const redefine = useCallback((row: SysRow, to: string | null) => {
    setSaving('idle');
    setState((previous) => {
      const others = previous.overrides.filter((override) => override.token !== row.token);
      if (!to) return { ...previous, overrides: others };
      return {
        ...previous,
        overrides: [
          ...others,
          { token: row.token, from: row.aliasOf, to, changedAt: new Date().toISOString() },
        ],
      };
    });
  }, []);

  const save = async () => {
    setSaving('saving');
    const response = await fetch('/api/overrides', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(state),
    });
    setSaving(response.ok ? 'saved' : 'error');
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (scope === 'tous' ||
          (scope === 'redéfinis' ? overrides.has(row.token) : row.callSites > 0)) &&
        (!needle || row.token.includes(needle) || row.aliasOf?.includes(needle)),
    );
  }, [rows, query, scope, overrides]);

  const grouped = useMemo(() => {
    const map = new Map<string, SysRow[]>();
    for (const row of visible) map.set(row.group, [...(map.get(row.group) ?? []), row]);
    return [...map.entries()];
  }, [visible]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chercher un token sémantique…"
          className="h-8 max-w-xs text-xs"
        />

        <ToggleGroup
          type="single"
          size="sm"
          value={scope}
          onValueChange={(value) => value && setScope(value)}
        >
          {['tous', 'utilisés', 'redéfinis'].map((option) => (
            <ToggleGroupItem key={option} value={option} className="px-2.5 text-xs">
              {option}
              {option === 'redéfinis' && overrides.size > 0 && (
                <span className="text-muted-foreground ml-1.5 tabular-nums">{overrides.size}</span>
              )}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="ml-auto flex items-center gap-3">
          {saving === 'saved' && (
            <span className="text-positive text-xs">enregistré dans token-overrides.json</span>
          )}
          {saving === 'error' && (
            <span className="text-destructive text-xs">écriture impossible — mode démo</span>
          )}
          <Button size="sm" onClick={save} disabled={!canWrite || saving === 'saving'}>
            {saving === 'saving' ? 'Enregistrement…' : 'Enregistrer les redéfinitions'}
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {grouped.map(([group, items]) => (
          <section key={group}>
            <h3 className="text-muted-foreground mb-1.5 font-mono text-[11px]">{group}</h3>

            <div className="divide-y overflow-hidden rounded-lg border">
              {items.map((row) => {
                const override = overrides.get(row.token);
                return (
                  <div
                    key={row.token}
                    className={cn(
                      'flex items-center gap-3 px-3 py-1.5',
                      override && 'bg-positive/[0.06]',
                    )}
                  >
                    <span className="w-52 shrink-0 truncate font-mono text-xs" title={row.token}>
                      {row.leaf}
                    </span>

                    <span className="w-[300px] shrink-0">
                      <TokenPicker
                        variant="inline"
                        current={row.aliasOf ?? row.token}
                        chosen={override?.to ?? null}
                        candidates={row.primitives}
                        onChoose={(token) => redefine(row, token)}
                        onClear={() => redefine(row, null)}
                      />
                    </span>

                    {row.value && HEX.test(row.value) && (
                      <span
                        className="swatch size-4 shrink-0"
                        style={{ '--swatch': row.value } as React.CSSProperties}
                      />
                    )}

                    {row.accessibleValue && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        accessible ≠
                      </Badge>
                    )}

                    {/* La portée : ce que ce changement déplacerait. */}
                    <span className="text-muted-foreground ml-auto shrink-0 text-right text-[11px] tabular-nums">
                      {row.dependents > 0 && `${row.dependents} token(s) · `}
                      {row.callSites} usage{row.callSites > 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {grouped.length === 0 && (
          <p className="text-muted-foreground rounded-lg border border-dashed px-6 py-10 text-center text-sm">
            Aucun token ne correspond.
          </p>
        )}
      </div>
    </>
  );
}
