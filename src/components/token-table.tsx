'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
  const [tier, setTier] = useState<string>('tous');
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

  const orphanCount = rows.filter((row) => row.orphan).length;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtrer par nom ou valeur…"
          className="h-8 max-w-xs text-xs"
        />

        <ToggleGroup
          type="single"
          size="sm"
          value={tier}
          onValueChange={(value) => value && setTier(value)}
          aria-label="Tier"
        >
          {TIERS.map((option) => (
            <ToggleGroupItem key={option} value={option} className="px-2.5 font-mono text-xs">
              {option}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <ToggleGroup
          type="multiple"
          size="sm"
          value={onlyOrphans ? ['orphans'] : []}
          onValueChange={(value) => setOnlyOrphans(value.includes('orphans'))}
        >
          <ToggleGroupItem
            value="orphans"
            className="px-2.5 text-xs"
            title="Définis, mais jamais consommés par le code"
          >
            orphelins ({orphanCount})
          </ToggleGroupItem>
        </ToggleGroup>

        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {filtered.length} / {rows.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Pointe vers</TableHead>
              <TableHead>Valeur</TableHead>
              <TableHead className="text-right">Usages</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 400).map((row) => (
              <TableRow key={row.name}>
                <TableCell className="py-1.5">
                  <Link
                    href={`/tokens/${encodeURIComponent(row.name)}`}
                    className="font-mono text-xs hover:underline"
                  >
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground py-1.5 font-mono text-xs">
                  {row.aliasOf ?? <span className="opacity-40">littéral</span>}
                </TableCell>
                <TableCell className="py-1.5">
                  <span className="flex items-center gap-2 font-mono text-xs">
                    {row.value && HEX.test(row.value) && (
                      <span
                        className="swatch size-3.5"
                        style={{ '--swatch': row.value } as React.CSSProperties}
                      />
                    )}
                    {row.value}
                  </span>
                </TableCell>
                <TableCell className="py-1.5 text-right text-xs tabular-nums">
                  {row.orphan ? (
                    <Badge variant="outline" className="text-[10px]">
                      orphelin
                    </Badge>
                  ) : (
                    row.usages
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 400 && (
        <p className="text-muted-foreground mt-2 text-xs">
          400 lignes affichées sur {filtered.length}. Affinez le filtre pour voir le reste.
        </p>
      )}
    </>
  );
}
