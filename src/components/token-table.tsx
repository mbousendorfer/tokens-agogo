'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type TokenRowView = {
  name: string;
  tier: string;
  aliasOf: string | null;
  value: string | null;
  usages: number;
  orphan: boolean;
};

const TIERS = ['tous', 'ref', 'sys', 'comp'] as const;
const HEX = /^#[0-9a-f]{3,8}$/i;

export function TokenTable({ rows }: { rows: TokenRowView[] }) {
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<(typeof TIERS)[number]>('tous');
  const [onlyOrphans, setOnlyOrphans] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (tier === 'tous' || row.tier === tier) &&
        (!onlyOrphans || row.orphan) &&
        (!needle || row.name.includes(needle) || row.value?.toLowerCase().includes(needle)),
    );
  }, [rows, query, tier, onlyOrphans]);

  const orphanCount = rows.filter((r) => r.orphan).length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtrer par nom ou valeur…"
          className="max-w-xs"
        />
        <div className="flex gap-1">
          {TIERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTier(option)}
              className={cn(
                'rounded-md px-2.5 py-1 font-mono text-xs',
                option === tier
                  ? 'bg-secondary text-secondary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-secondary/50',
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOnlyOrphans((value) => !value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs',
            onlyOrphans
              ? 'bg-secondary text-secondary-foreground font-medium'
              : 'text-muted-foreground hover:bg-secondary/50',
          )}
          title="Définis, mais jamais consommés par le code"
        >
          orphelins ({orphanCount})
        </button>
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {filtered.length} / {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Token</th>
              <th className="px-3 py-2 text-left font-medium">Pointe vers</th>
              <th className="px-3 py-2 text-left font-medium">Valeur</th>
              <th className="px-3 py-2 text-right font-medium">Usages</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 400).map((row) => (
              <tr key={row.name} className="hover:bg-muted/30 border-t">
                <td className="px-3 py-1.5">
                  <Link
                    href={`/tokens/${encodeURIComponent(row.name)}`}
                    className="font-mono text-xs hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="text-muted-foreground px-3 py-1.5 font-mono text-xs">
                  {row.aliasOf ?? <span className="opacity-40">littéral</span>}
                </td>
                <td className="px-3 py-1.5">
                  <span className="flex items-center gap-2 font-mono text-xs">
                    {row.value && HEX.test(row.value) && (
                      <span
                        className="inline-block size-3.5 shrink-0 rounded-sm border"
                        style={{ background: row.value }}
                      />
                    )}
                    {row.value}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right text-xs tabular-nums">
                  {row.orphan ? (
                    <Badge variant="outline" className="text-[10px]">
                      orphelin
                    </Badge>
                  ) : (
                    row.usages
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 400 && (
        <p className="text-muted-foreground mt-2 text-xs">
          400 lignes affichées sur {filtered.length}. Affinez le filtre pour voir le reste.
        </p>
      )}
    </>
  );
}
