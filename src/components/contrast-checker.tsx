'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { apcaContrast, apcaUsage, contrastRatio, parseHex, wcagLevel } from '@/lib/color';
import { cn } from '@/lib/utils';

export type Swatchable = { token: string; label: string; hex: string; ramp: string };

/**
 * Le contraste entre deux nuances quelconques de la palette.
 *
 * Pas seulement « sur blanc » : la question qui se pose vraiment est celle d'une
 * paire choisie — ce gris sur ce bleu, ce texte sur cette surface. WCAG 2.x sert de
 * règle bloquante, APCA d'indicateur parce qu'il reflète mieux la perception réelle
 * sur les tons moyens.
 */
export function ContrastChecker({ swatches }: { swatches: Swatchable[] }) {
  const [foreground, setForeground] = useState(
    () => swatches.find((s) => s.token.includes('grey-1000')) ?? swatches[0],
  );
  const [background, setBackground] = useState(
    () => swatches.find((s) => s.token.includes('grey-100')) ?? swatches[1] ?? swatches[0],
  );

  const measure = useMemo(() => {
    const front = parseHex(foreground.hex);
    const back = parseHex(background.hex);
    if (!front || !back) return null;

    const ratio = contrastRatio(front, back);
    const lc = apcaContrast(front, back);
    return { ratio, level: wcagLevel(ratio), lc, usage: apcaUsage(lc) };
  }, [foreground, background]);

  const swap = () => {
    setForeground(background);
    setBackground(foreground);
  };

  return (
    <section className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <h2 className="font-display text-[15px] font-semibold">Contraste d’une paire</h2>
        <p className="text-muted-foreground text-xs">
          N’importe quelles deux nuances, pas seulement sur blanc.
        </p>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto_1fr_1.2fr]">
        <SwatchSelect
          label="Premier plan"
          value={foreground}
          swatches={swatches}
          onChange={setForeground}
        />

        <button
          type="button"
          onClick={swap}
          title="Intervertir — APCA n’est pas symétrique, l’ordre compte"
          className="text-muted-foreground hover:text-foreground self-center text-sm"
        >
          ⇄
        </button>

        <SwatchSelect
          label="Fond"
          value={background}
          swatches={swatches}
          onChange={setBackground}
        />

        <div
          className="flex min-h-[92px] flex-col justify-center gap-1 rounded-md px-4 py-3"
          style={{ backgroundColor: background.hex, color: foreground.hex }}
        >
          <span className="text-[15px] font-semibold">Texte d’exemple</span>
          <span className="text-[12px]">Le même texte, en taille courante.</span>
        </div>
      </div>

      {measure && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t px-4 py-3 text-xs">
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">WCAG</span>
            <span className="font-mono tabular-nums">{measure.ratio.toFixed(2)}:1</span>
            <Badge
              variant={measure.level === 'échec' ? 'destructive' : 'secondary'}
              className="text-[10px]"
            >
              {measure.level}
            </Badge>
          </span>

          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">APCA</span>
            <span className="font-mono tabular-nums">Lc {Math.round(measure.lc)}</span>
            <span className="text-muted-foreground">{measure.usage}</span>
          </span>

          <span className="text-muted-foreground ml-auto">
            Seuils AA : 4,5:1 pour le texte courant, 3:1 pour les éléments d’interface.
          </span>
        </div>
      )}
    </section>
  );
}

function SwatchSelect({
  label,
  value,
  swatches,
  onChange,
}: {
  label: string;
  value: Swatchable;
  swatches: Swatchable[];
  onChange: (swatch: Swatchable) => void;
}) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, Swatchable[]>();
    for (const swatch of swatches) map.set(swatch.ramp, [...(map.get(swatch.ramp) ?? []), swatch]);
    return [...map.entries()];
  }, [swatches]);

  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-[11px] tracking-[0.04em] uppercase">
        {label}
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            className="hover:bg-secondary/50 flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left"
          >
            <span className="swatch size-5" style={{ backgroundColor: value.hex }} />
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{value.label}</span>
            <span className="text-muted-foreground font-mono text-[11px]">{value.hex}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Chercher une nuance…" />
            <CommandList className="max-h-72">
              <CommandEmpty className="py-6 text-center text-xs">Aucune nuance.</CommandEmpty>
              {groups.map(([ramp, items]) => (
                <CommandGroup key={ramp} heading={ramp}>
                  {items.map((swatch) => (
                    <CommandItem
                      key={swatch.token}
                      value={swatch.token}
                      onSelect={() => {
                        onChange(swatch);
                        setOpen(false);
                      }}
                      className={cn('gap-2 font-mono text-xs')}
                    >
                      <span className="swatch size-3.5" style={{ backgroundColor: swatch.hex }} />
                      <span className="flex-1 truncate">{swatch.label}</span>
                      <span className="text-muted-foreground">{swatch.hex}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
