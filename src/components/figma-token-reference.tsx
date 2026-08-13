'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { FigmaToken } from '@/lib/figma-tokens';

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * La cible : les variables Figma, lues comme dans leur panneau d'origine.
 *
 * Collections en onglets, tokens rangés sous leur chemin de groupe, et en valeur le
 * token pointé — jamais la couleur résolue. C'est la documentation de ce vers quoi on
 * migre, dans le vocabulaire des designers.
 */
export function FigmaTokenReference({ tokens }: { tokens: FigmaToken[] }) {
  const collections = useMemo(
    () => [...new Set(tokens.map((token) => token.collection))],
    [tokens],
  );
  const [collection, setCollection] = useState(collections[1] ?? collections[0]);
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = tokens.filter(
      (token) =>
        token.collection === collection &&
        (!needle ||
          token.name.includes(needle) ||
          token.figmaName.toLowerCase().includes(needle) ||
          token.display?.toLowerCase().includes(needle)),
    );

    const map = new Map<string, FigmaToken[]>();
    for (const token of matching) map.set(token.group, [...(map.get(token.group) ?? []), token]);
    return [...map.entries()];
  }, [tokens, collection, query]);

  const count = groups.reduce((sum, [, items]) => sum + items.length, 0);
  const withMode = groups.flatMap(([, items]) => items).filter((t) => t.accessibleValue).length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          size="sm"
          value={collection}
          onValueChange={(value) => value && setCollection(value)}
          aria-label="Collection"
        >
          {collections.map((name) => (
            <ToggleGroupItem key={name} value={name} className="px-2.5 text-xs">
              {name.replace(' tokens', '')}
              <span className="text-muted-foreground ml-1.5 tabular-nums">
                {tokens.filter((token) => token.collection === name).length}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chercher un token…"
          className="h-8 max-w-xs text-xs"
        />

        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {count} token{count > 1 ? 's' : ''}
          {withMode > 0 && ` · ${withMode} varient en mode Accessible`}
        </span>
      </div>

      <div className="space-y-5">
        {groups.map(([group, items]) => (
          <section key={group}>
            <h3 className="text-muted-foreground mb-1.5 font-mono text-[11px]">
              {group.split(' / ').map((segment, index, all) => (
                <span key={index} className={index === all.length - 1 ? 'text-foreground' : ''}>
                  {segment}
                  {index < all.length - 1 && ' / '}
                </span>
              ))}
            </h3>

            <div className="divide-y overflow-hidden rounded-lg border">
              {items.map((token) => (
                <div
                  key={token.name}
                  className="hover:bg-muted/30 flex items-center gap-3 px-3 py-1.5"
                  title={token.name}
                >
                  <span className="w-44 shrink-0 truncate font-mono text-xs">{token.leaf}</span>

                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {token.value && HEX.test(token.value) && (
                      <span
                        className="swatch size-4"
                        style={{ '--swatch': token.value } as React.CSSProperties}
                      />
                    )}
                    <span className="text-muted-foreground truncate font-mono text-xs">
                      {token.display}
                    </span>
                  </span>

                  {/* Le mode Accessible n'est signalé que là où il change quelque chose. */}
                  {token.accessibleValue && (
                    <Badge
                      variant="outline"
                      className="shrink-0 font-mono text-[10px]"
                      title={`Mode Accessible : ${token.accessibleValue}`}
                    >
                      accessible ≠
                    </Badge>
                  )}

                  <span className="text-muted-foreground/60 w-56 shrink-0 truncate text-right font-mono text-[11px]">
                    {token.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
