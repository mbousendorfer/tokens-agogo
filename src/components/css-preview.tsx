'use client';

import { useMemo } from 'react';
import { TokenPicker } from '@/components/token-picker';
import type { Candidate } from '@/lib/candidates';
import { cn } from '@/lib/utils';

export type CssRow = {
  file: string;
  line: number;
  selector: string | null;
  property: string | null;
  /** La valeur complète de la déclaration, telle qu'écrite dans le fichier. */
  value: string;
  token: string;
  to: string | null;
  candidates: Candidate[];
};

/** Découpe une valeur en segments de texte et en appels `var()`. */
function segments(value: string): ({ text: string } | { token: string })[] {
  const parts: ({ text: string } | { token: string })[] = [];
  const pattern = /var\(\s*(--[^,)\s]+)\s*(?:,[^)]*)?\)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > last) parts.push({ text: value.slice(last, match.index) });
    parts.push({ token: match[1] });
    last = match.index + match[0].length;
  }
  if (last < value.length) parts.push({ text: value.slice(last) });
  return parts;
}

/**
 * Le CSS du composant, éditable à même le code.
 *
 * Une déclaration est **une** ligne, même quand elle contient plusieurs tokens :
 * `padding: 0 var(--a) 0 var(--b)` se lit comme dans le fichier, et chaque `var()`
 * y est un sélecteur. C'est la relecture et l'édition au même endroit — on vérifie
 * la déclaration entière, pas un token sorti de son contexte.
 */
export function CssPreview({
  rows,
  onDecide,
}: {
  rows: CssRow[];
  onDecide: (row: CssRow, to: string | null) => void;
}) {
  /** Une entrée par déclaration réelle, pas par `var()`. */
  const declarations = useMemo(() => {
    const map = new Map<string, CssRow[]>();
    for (const row of rows)
      map.set(`${row.file}:${row.line}`, [...(map.get(`${row.file}:${row.line}`) ?? []), row]);
    return [...map.values()].sort((a, b) => a[0].line - b[0].line);
  }, [rows]);

  const blocks = useMemo(() => {
    const map = new Map<string, CssRow[][]>();
    for (const group of declarations) {
      const key = group[0].selector || '—';
      map.set(key, [...(map.get(key) ?? []), group]);
    }
    return [...map.entries()];
  }, [declarations]);

  const changed = rows.filter((row) => row.to).length;

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="bg-muted/40 text-muted-foreground flex items-center justify-between border-b px-3 py-1.5 text-[11px]">
        <span className="font-mono">{rows[0]?.file ?? 'CSS'}</span>
        <span className="tabular-nums">
          {changed > 0 ? `${changed} déclaration(s) modifiée(s)` : 'aucune modification'}
        </span>
      </div>

      <div className="max-h-[460px] overflow-auto p-3 font-mono text-[12px] leading-[1.9]">
        {blocks.map(([selector, groups]) => (
          <div key={selector} className="mb-4">
            <div className="text-muted-foreground">
              <span className="text-foreground">{selector}</span> {'{'}
            </div>

            {groups.map((group) => {
              const first = group[0];
              const byToken = new Map(group.map((row) => [row.token, row]));
              return (
                <div
                  key={`${first.file}:${first.line}`}
                  className={cn(
                    'pl-4',
                    group.some((row) => row.to) && 'bg-positive/[0.06] -ml-3 rounded-sm pl-7',
                  )}
                >
                  <span className="text-muted-foreground">
                    {first.property ?? '/* valeur */'}:{' '}
                  </span>
                  {segments(first.value).map((part, index) =>
                    'text' in part ? (
                      <span key={index}>{part.text}</span>
                    ) : (
                      (() => {
                        const row = byToken.get(part.token);
                        if (!row) return <span key={index}>var({part.token})</span>;
                        return (
                          <TokenPicker
                            key={index}
                            variant="inline"
                            current={row.token}
                            chosen={row.to}
                            candidates={row.candidates}
                            onChoose={(token) => onDecide(row, token)}
                            onClear={() => onDecide(row, null)}
                          />
                        );
                      })()
                    ),
                  )}
                  <span className="text-muted-foreground">;</span>
                  <span className="text-muted-foreground/50 ml-2 text-[10px]">:{first.line}</span>
                </div>
              );
            })}

            <div className="text-muted-foreground">{'}'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
