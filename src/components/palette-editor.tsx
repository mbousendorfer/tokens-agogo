'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { apcaContrast, contrastRatio, parseHex, toOklch, wcagLevel } from '@/lib/color';
import {
  addRamp,
  addRung,
  removeRamp,
  removeRung,
  renameRamp,
  setShade,
  tokenNameFor,
  type EditableRamp,
} from '@/lib/palette-edit';
import { cn } from '@/lib/utils';

const WHITE = { r: 255, g: 255, b: 255 };

/**
 * L'éditeur de palette.
 *
 * Toutes les opérations du cadrage initial : ajouter une couleur, renommer, ajouter ou
 * retirer un barreau, changer une valeur. Chaque geste affiche sa portée — combien de
 * tokens naissent ou disparaissent — parce qu'un nom de ramp fait partie du contrat
 * des tokens, et qu'un barreau retiré est un token supprimé.
 *
 * Rien n'est écrit dans le design system : on exporte la palette obtenue.
 */
export function PaletteEditor({
  initial,
  ladder,
  usages,
}: {
  initial: EditableRamp[];
  /** L'échelle de luminosité commune, pour poser une nouvelle couleur dessus. */
  ladder: Record<number, number>;
  /** Nombre de call sites par token, pour chiffrer ce qu'une suppression coûterait. */
  usages: Record<string, number>;
}) {
  const [ramps, setRamps] = useState<EditableRamp[]>(initial);
  const dirty = useMemo(() => JSON.stringify(ramps) !== JSON.stringify(initial), [ramps, initial]);

  const rungs = useMemo(
    () =>
      [...new Set(ramps.flatMap((ramp) => ramp.shades.map((s) => s.rung)))].sort((a, b) => a - b),
    [ramps],
  );

  const exportJson = () => {
    const payload = {
      $schema: 'tokens-agogo/palette/1',
      ramps: ramps.map((ramp) => ({
        name: ramp.name,
        shades: ramp.shades.map((shade) => ({
          rung: shade.rung,
          hex: shade.hex,
          token: tokenNameFor(ramp.name, shade.rung),
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'palette.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <h2 className="font-display text-[15px] font-semibold">Éditer la palette</h2>

        <AddColourDialog ladder={ladder} onAdd={(input) => setRamps((r) => addRamp(r, input))} />
        <AddRungDialog rungs={rungs} onAdd={(rung) => setRamps((r) => addRung(r, rung))} />

        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <>
              <Badge variant="secondary" className="text-[10px]">
                modifiée
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setRamps(initial)}>
                Réinitialiser
              </Button>
            </>
          )}
          <Button size="sm" onClick={exportJson} disabled={!dirty}>
            Exporter la palette
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {/* En-tête des barreaux, avec le retrait de la marche entière. */}
        <div className="flex gap-3">
          <div className="w-40 shrink-0" />
          <div
            className="grid flex-1 gap-1.5"
            style={{ gridTemplateColumns: `repeat(${rungs.length}, minmax(0, 1fr))` }}
          >
            {rungs.map((rung) => (
              <div key={rung} className="group text-center">
                <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                  {rung}
                </span>
                <button
                  type="button"
                  onClick={() => setRamps((r) => removeRung(r, rung))}
                  title={`Retirer le barreau ${rung} de toutes les couleurs`}
                  className="text-muted-foreground hover:text-destructive ml-1 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="inline size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {ramps.map((ramp) => (
          <div key={ramp.name} className="group/ramp flex items-start gap-3">
            <div className="flex w-40 shrink-0 items-center gap-1 pt-1">
              <Input
                defaultValue={ramp.name}
                onBlur={(event) => {
                  const next = event.target.value.trim();
                  if (next && next !== ramp.name) setRamps((r) => renameRamp(r, ramp.name, next));
                }}
                className="hover:border-input h-7 border-transparent px-1 font-mono text-xs"
                title="Renommer — le nom fait partie du contrat des tokens"
              />
              <button
                type="button"
                onClick={() => setRamps((r) => removeRamp(r, ramp.name))}
                title={`Supprimer ${ramp.name} (${ramp.shades.length} tokens)`}
                className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover/ramp:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            <div
              className="grid flex-1 gap-1.5"
              style={{ gridTemplateColumns: `repeat(${rungs.length}, minmax(0, 1fr))` }}
            >
              {rungs.map((rung) => {
                const shade = ramp.shades.find((item) => item.rung === rung);
                if (!shade) {
                  return (
                    <button
                      key={rung}
                      type="button"
                      onClick={() => setRamps((r) => addRung(r, rung, { only: ramp.name }))}
                      title={`Ajouter ${ramp.name}-${rung}`}
                      className="text-muted-foreground hover:text-foreground hover:border-foreground/40 h-14 rounded-md border border-dashed transition-colors"
                    >
                      <Plus className="mx-auto size-3" />
                    </button>
                  );
                }
                return (
                  <ShadeEditor
                    key={rung}
                    ramp={ramp.name}
                    rung={rung}
                    hex={shade.hex}
                    usages={usages[tokenNameFor(ramp.name, rung)] ?? 0}
                    onChange={(hex) => setRamps((r) => setShade(r, ramp.name, rung, hex))}
                    onRemove={() => setRamps((r) => removeRung(r, rung, { only: ramp.name }))}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShadeEditor({
  ramp,
  rung,
  hex,
  usages,
  onChange,
  onRemove,
}: {
  ramp: string;
  rung: number;
  hex: string;
  usages: number;
  onChange: (hex: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rgb = parseHex(hex);
  const ratio = rgb ? contrastRatio(rgb, WHITE) : 0;
  const level = wcagLevel(ratio);
  const ink = rgb && contrastRatio(rgb, WHITE) > 4.5 ? '#FFFFFF' : '#000000';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-14 w-full rounded-md p-1.5 text-left ring-1 ring-black/10 transition-transform hover:scale-[1.04] dark:ring-white/12"
          style={{ backgroundColor: hex, color: ink }}
          title={`${tokenNameFor(ramp, rung)} · ${usages} usage(s)`}
        >
          <span className="block font-mono text-[10px] leading-none opacity-90">
            {hex.slice(1).toLowerCase()}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72" align="center">
        <p className="mb-2 font-mono text-xs">{tokenNameFor(ramp, rung)}</p>

        <div className="flex items-center gap-2">
          <label
            className="relative size-9 shrink-0 rounded-md ring-1 ring-black/10 dark:ring-white/12"
            style={{ backgroundColor: hex }}
          >
            <input
              type="color"
              value={hex}
              onChange={(event) => onChange(event.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <Input
            value={hex}
            onChange={(event) => {
              const next = event.target.value;
              if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next);
            }}
            className="h-9 font-mono text-xs"
          />
        </div>

        <Separator className="my-3" />

        <dl className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Luminosité OKLCH</dt>
            <dd className="font-mono tabular-nums">{rgb ? toOklch(rgb).l.toFixed(3) : '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Sur blanc</dt>
            <dd
              className={cn('font-mono tabular-nums', level === 'échec' && 'text-muted-foreground')}
            >
              {ratio.toFixed(2)}:1 · {level}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">APCA</dt>
            <dd className="font-mono tabular-nums">
              Lc {rgb ? Math.round(apcaContrast(rgb, WHITE)) : '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Usages dans le code</dt>
            <dd className="font-mono tabular-nums">{usages}</dd>
          </div>
        </dl>

        <Separator className="my-3" />

        <Button
          variant="ghost"
          size="sm"
          className="text-destructive h-7 w-full justify-start gap-1.5 text-xs"
          onClick={() => {
            onRemove();
            setOpen(false);
          }}
        >
          <Trash2 className="size-3" />
          Retirer ce barreau
          {usages > 0 && <span className="ml-auto opacity-70">{usages} usage(s) cassé(s)</span>}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function AddColourDialog({
  ladder,
  onAdd,
}: {
  ladder: Record<number, number>;
  onAdd: (input: {
    name: string;
    hex: string;
    anchorRung: number;
    ladder: Record<number, number>;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#11ABA6');
  const rungs = Object.keys(ladder)
    .map(Number)
    .sort((a, b) => a - b);
  const [anchor, setAnchor] = useState(rungs[Math.floor(rungs.length / 2)] ?? 500);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="size-3.5" />
          Ajouter une couleur
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="start">
        <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
          Donnez une teinte et le barreau qu’elle occupe. Les autres barreaux se posent sur
          l’échelle existante, ce qui accorde la couleur au reste de la palette.
        </p>

        <div className="space-y-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nom — ex. Teal"
            className="h-8 text-xs"
          />

          <div className="flex items-center gap-2">
            <label
              className="relative size-8 shrink-0 rounded-md ring-1 ring-black/10 dark:ring-white/12"
              style={{ backgroundColor: hex }}
            >
              <input
                type="color"
                value={hex}
                onChange={(event) => setHex(event.target.value.toUpperCase())}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <Input
              value={hex}
              onChange={(event) => setHex(event.target.value.toUpperCase())}
              className="h-8 font-mono text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {rungs.map((rung) => (
              <button
                key={rung}
                type="button"
                onClick={() => setAnchor(rung)}
                className={cn(
                  'rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums',
                  rung === anchor
                    ? 'bg-secondary text-secondary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary/50',
                )}
              >
                {rung}
              </button>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          className="mt-3 w-full"
          disabled={!name.trim() || !/^#[0-9a-f]{6}$/i.test(hex)}
          onClick={() => {
            onAdd({ name, hex, anchorRung: anchor, ladder });
            setName('');
            setOpen(false);
          }}
        >
          Ajouter {rungs.length} nuances
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function AddRungDialog({ rungs, onAdd }: { rungs: number[]; onAdd: (rung: number) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const suggestion = useMemo(() => {
    for (let i = 0; i < rungs.length - 1; i++) {
      const gap = rungs[i + 1] - rungs[i];
      if (gap > 1) return rungs[i] + Math.floor(gap / 2);
    }
    return (rungs.at(-1) ?? 0) + 100;
  }, [rungs]);

  const rung = Number(value || suggestion);
  const exists = rungs.includes(rung);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="size-3.5" />
          Ajouter un barreau
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72" align="start">
        <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
          Un barreau appartient à l’échelle, pas à une couleur : il s’ajoute à toutes les ramps, par
          interpolation en OKLCH entre ses voisins.
        </p>
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, ''))}
          placeholder={String(suggestion)}
          className="h-8 font-mono text-xs"
        />
        {exists && <p className="text-destructive mt-1.5 text-xs">Ce barreau existe déjà.</p>}
        <Button
          size="sm"
          className="mt-3 w-full"
          disabled={!rung || exists}
          onClick={() => {
            onAdd(rung);
            setValue('');
            setOpen(false);
          }}
        >
          Ajouter le barreau {rung}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
