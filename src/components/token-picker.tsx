'use client';

import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Candidate } from '@/lib/candidates';
import { cn } from '@/lib/utils';

const HEX = /^#[0-9a-f]{3,8}$/i;

function Swatch({ value }: { value: string | null }) {
  if (!value || !HEX.test(value)) return null;
  return <span className="swatch size-3.5" style={{ backgroundColor: value }} />;
}

/**
 * Le sélecteur de token — le cœur de l'app (ADR 011).
 *
 * Il se lit comme le panneau Variables de Figma : les tokens rangés sous leur groupe
 * (`color / text / interactive`), et en valeur **le token pointé**, pas la couleur
 * résolue. Un token qui alias `Colors/Grey/grey-1000` s'affiche comme tel — c'est le
 * vocabulaire dans lequel la décision se prend.
 *
 * L'ordre des groupes suit la pertinence pour la propriété CSS de la déclaration.
 * C'est une aide à la lecture, pas une recommandation : c'est l'intention qui décide
 * (ADR 003).
 */
export function TokenPicker({
  current,
  chosen,
  candidates,
  onChoose,
  onClear,
}: {
  current: string;
  chosen: string | null;
  candidates: Candidate[];
  onChoose: (token: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const chosenCandidate = candidates.find((candidate) => candidate.name === chosen);

  const groups = useMemo(() => {
    const map = new Map<string, Candidate[]>();
    for (const candidate of candidates) {
      map.set(candidate.group, [...(map.get(candidate.group) ?? []), candidate]);
    }
    // Le groupe le plus pertinent en premier — sa meilleure ligne le classe.
    return [...map.entries()].sort(
      ([, a], [, b]) =>
        Math.max(...b.map((c) => c.relevance)) - Math.max(...a.map((c) => c.relevance)),
    );
  }, [candidates]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          size="sm"
          className={cn(
            'h-7 w-full justify-between gap-1.5 px-2 font-mono text-xs font-normal',
            chosen ? 'border-positive/50 bg-positive/5' : 'text-muted-foreground border-dashed',
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Swatch value={chosenCandidate?.value ?? null} />
            <span className="truncate">{chosen ?? 'choisir un token…'}</span>
          </span>
          <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[560px] p-0" align="start">
        {/* L'ordre porte l'information : on n'autorise pas cmdk à le refaire. */}
        <Command
          filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
        >
          <CommandInput placeholder={`Remplacer ${current}…`} />
          <CommandList className="max-h-80">
            <CommandEmpty className="py-6 text-center text-xs">
              Aucun token ne correspond.
            </CommandEmpty>

            {groups.map(([group, items]) => (
              <CommandGroup key={group} heading={group}>
                {items.map((candidate) => (
                  <CommandItem
                    key={candidate.name}
                    value={candidate.name}
                    onSelect={() => {
                      onChoose(candidate.name);
                      setOpen(false);
                    }}
                    className="gap-2 font-mono text-xs"
                  >
                    <Swatch value={candidate.value} />
                    <span className="flex-1 truncate">{candidate.name}</span>
                    {candidate.sameValue && (
                      <Badge
                        variant="outline"
                        className="h-4 shrink-0 px-1 text-[10px]"
                        title="Rend exactement ce que rend la déclaration aujourd'hui"
                      >
                        =
                      </Badge>
                    )}
                    {/* Ce que Figma affiche : le token pointé, ou la valeur littérale. */}
                    <span className="text-muted-foreground max-w-[46%] shrink-0 truncate">
                      {candidate.display}
                    </span>
                    <Check
                      className={cn(
                        'size-3 shrink-0',
                        candidate.name === chosen ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>

          {chosen && (
            <div className="border-t p-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-7 w-full justify-start gap-1.5 text-xs font-normal"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                <X className="size-3" />
                Annuler ce choix
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
