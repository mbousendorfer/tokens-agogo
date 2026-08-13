'use client';

import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useState } from 'react';
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
 * Un combobox shadcn : `Command` gère la recherche, la navigation au clavier et
 * l'accessibilité. Les candidats arrivent déjà triés — sémantique d'abord, puis
 * pertinence pour la propriété CSS. Ce tri est une aide à la lecture, pas une
 * recommandation : c'est l'intention qui décide, pas la ressemblance (ADR 003).
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

      <PopoverContent className="w-[480px] p-0" align="start">
        {/* Le tri des candidats porte l'information : on ne laisse pas cmdk le refaire. */}
        <Command
          filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
        >
          <CommandInput placeholder={`Remplacer ${current}…`} />
          <CommandList className="max-h-80">
            <CommandEmpty className="py-6 text-center text-xs">
              Aucun token ne correspond.
            </CommandEmpty>
            <CommandGroup>
              {candidates.map((candidate) => (
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
                      className="h-4 px-1 text-[10px]"
                      title="Rend exactement la valeur actuelle"
                    >
                      =
                    </Badge>
                  )}
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {candidate.value}
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
