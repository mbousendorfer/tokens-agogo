'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PreviewFrame } from '@/components/preview-frame';
import { cn } from '@/lib/utils';
import type { Specimen } from '@/lib/specimens';
import type { Token } from '@/lib/tokens';

type ComponentGroup = { component: string; group: string; items: Specimen[] };

/** Une primitive éditable, avec le nombre de tokens qui en dépendent. */
export type EditablePrimitive = Token & { dependents: number };

export function TokenPlayground({
  groups,
  primitives,
}: {
  groups: ComponentGroup[];
  primitives: EditablePrimitive[];
}) {
  const [selected, setSelected] = useState(groups[0]?.component ?? '');
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const ramps = useMemo(() => {
    const map = new Map<string, EditablePrimitive[]>();
    for (const token of primitives) {
      const ramp = token.name.replace(/^--ref-color-/, '').replace(/-\d+$/, '');
      map.set(ramp, [...(map.get(ramp) ?? []), token]);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 6);
  }, [primitives]);

  const dirty = Object.keys(overrides).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr_260px]">
      <aside className="lg:max-h-[70vh] lg:overflow-y-auto">
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          {groups.length} composants
        </p>
        <ul className="space-y-0.5">
          {groups.map(({ component, items }) => (
            <li key={component}>
              <button
                type="button"
                onClick={() => setSelected(component)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm',
                  component === selected
                    ? 'bg-secondary text-secondary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                )}
              >
                <span className="truncate">{component}</span>
                <span className="text-muted-foreground ml-2 text-xs tabular-nums">
                  {items.length}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="min-w-0">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-sm font-medium">{selected}</h2>
          {dirty > 0 && (
            <Badge variant="secondary">
              {dirty} primitive{dirty > 1 ? 's' : ''} modifiée{dirty > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <PreviewFrame
          overrides={overrides}
          className="h-[70vh] w-full rounded-lg border bg-white"
          title={`Preview — ${selected}`}
          key={selected}
          specimenId={undefined}
          componentName={selected}
        />
      </section>

      <aside className="lg:max-h-[70vh] lg:overflow-y-auto">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Primitives
          </p>
          {dirty > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setOverrides({})}>
              Réinitialiser
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
          Modifier une primitive re-résout nativement toute sa descendance : la feuille de tokens
          est chaînée, c’est la cascade CSS qui travaille.
        </p>

        <div className="space-y-4">
          {ramps.map(([ramp, tokens]) => (
            <div key={ramp}>
              <p className="mb-1.5 font-mono text-xs">{ramp}</p>
              <div className="flex flex-wrap gap-1">
                {tokens.map((token) => {
                  const current = overrides[token.name] ?? token.value ?? '#000000';
                  const changed = token.name in overrides;
                  return (
                    <label
                      key={token.name}
                      title={`${token.name}\n${token.value} → ${current}\n${token.dependents} token(s) en dépendent`}
                      className={cn(
                        'relative size-7 cursor-pointer rounded border',
                        changed && 'ring-foreground ring-2 ring-offset-1',
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
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
