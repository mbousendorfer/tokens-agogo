'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { contrastRatio, parseHex, wcagLevel } from '@/lib/color';
import type { PaletteSpec } from '@/lib/color-lab/engine/types';
import { derivation, generatedRamps, solve } from '@/lib/generator';
import {
  addFamily,
  removeFamily,
  renameFamily,
  setAnchor,
  setExtraDarkRungs,
} from '@/lib/spec-edit';

const WHITE = { r: 255, g: 255, b: 255 };

/**
 * L'éditeur de palette, branché sur le solveur.
 *
 * On n'édite pas une liste de couleurs : on édite la **spec**, et le moteur re-résout
 * tout. C'est ce qui fait qu'une couleur ajoutée se pose sur la même échelle de
 * luminosité que les autres et tient la même contrainte de contraste, au lieu d'être
 * interpolée à côté.
 *
 * Épingler une nuance ne fige que celle-là : le reste de sa famille se recalcule.
 */
export function PaletteEditor({ baseline }: { baseline: PaletteSpec }) {
  const [spec, setSpec] = useState<PaletteSpec>(baseline);

  const { ramps, steps, error } = useMemo(() => {
    try {
      const solution = solve(spec);
      return { ramps: generatedRamps(solution), steps: derivation(solution), error: null };
    } catch (cause) {
      // Une spec peut devenir insoluble — retirer la famille qui ancre le 700, par
      // exemple. On le dit au lieu d'afficher une palette fausse.
      return { ramps: [], steps: [], error: (cause as Error).message };
    }
  }, [spec]);

  const dirty = spec !== baseline;
  const rungs = ramps.find((ramp) => ramp.family !== 'grey')?.rungs.map((r) => r.rung) ?? [];

  const exportSpec = () => {
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'palette.baseline.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <h2 className="font-display text-[15px] font-semibold">Éditer la palette</h2>
        <p className="text-muted-foreground text-xs">Chaque geste relance le solveur.</p>

        <AddColour rungs={rungs} onAdd={(input) => setSpec((s) => addFamily(s, input))} />

        <DarkRungs
          count={spec.chromatic.extraDarkRungs ?? 0}
          onChange={(count) => setSpec((s) => setExtraDarkRungs(s, count))}
        />

        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <>
              <Badge variant="secondary" className="text-[10px]">
                spec modifiée
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setSpec(baseline)}>
                Réinitialiser
              </Button>
            </>
          )}
          <Button size="sm" onClick={exportSpec} disabled={!dirty}>
            Exporter la spec
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-destructive px-4 py-6 text-sm">
          Spec insoluble : {error}. La dérivation s’appuie sur des ancres — en retirer une peut
          couper la chaîne.
        </p>
      ) : (
        <div className="space-y-2 p-4">
          <div className="flex gap-3">
            <div className="w-36 shrink-0" />
            <div
              className="grid flex-1 gap-1"
              style={{ gridTemplateColumns: `repeat(${rungs.length}, minmax(0,1fr))` }}
            >
              {rungs.map((rung) => (
                <span
                  key={rung}
                  className="text-muted-foreground text-center font-mono text-[11px] tabular-nums"
                >
                  {rung}
                </span>
              ))}
            </div>
          </div>

          {ramps.map((ramp) => {
            const family = spec.chromatic.families.find((f) => f.id === ramp.family);
            return (
              <div key={ramp.family} className="group/ramp flex items-center gap-3">
                <div className="flex w-36 shrink-0 items-center gap-1">
                  {family ? (
                    <Input
                      defaultValue={family.label}
                      onBlur={(event) => {
                        const next = event.target.value.trim();
                        if (next && next !== family.label)
                          setSpec((s) => renameFamily(s, family.id, next));
                      }}
                      className="hover:border-input h-7 border-transparent px-1 text-xs"
                      title="Renommer — l’identifiant préfixe les tokens"
                    />
                  ) : (
                    <span className="px-1 text-xs capitalize">{ramp.family}</span>
                  )}
                  {family && (
                    <button
                      type="button"
                      onClick={() => setSpec((s) => removeFamily(s, family.id))}
                      title={`Supprimer ${family.label}`}
                      className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover/ramp:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                <div
                  className="grid flex-1 gap-1"
                  style={{ gridTemplateColumns: `repeat(${rungs.length}, minmax(0,1fr))` }}
                >
                  {rungs.map((rung) => {
                    const shade = ramp.rungs.find((r) => r.rung === rung);
                    if (!shade) return <div key={rung} />;
                    return (
                      <Shade
                        key={rung}
                        family={ramp.family}
                        rung={rung}
                        hex={shade.hex}
                        anchored={Boolean(family?.anchors?.[rung])}
                        onAnchor={(hex) =>
                          family && setSpec((s) => setAnchor(s, family.id, rung, hex))
                        }
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/*
        La dérivation n'apparaît que si la spec a bougé.

        À l'état initial elle redonne, chiffre pour chiffre, celle qu'énonce la section
        « La règle retrouve la palette » : l'afficher quand même mettait deux fois le
        même tableau sur la page, et laissait croire à deux règles. Ici elle répond à
        une question précise — qu'est-ce que **mon** geste a déplacé.
      */}
      {dirty && steps.length > 0 && (
        <div className="bg-muted/30 border-t px-4 py-3">
          <p className="text-muted-foreground mb-1.5 text-[11px] tracking-[0.04em] uppercase">
            Dérivation, recalculée
          </p>
          <ol className="space-y-1 text-xs">
            {steps.map((step) => (
              <li key={step.step} className="flex items-baseline gap-2">
                <span className="w-16 shrink-0 font-mono">{step.step}</span>
                <span className="w-16 shrink-0 font-mono tabular-nums">{step.value}</span>
                <span className="text-muted-foreground flex-1">{step.why}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function Shade({
  family,
  rung,
  hex,
  anchored,
  onAnchor,
}: {
  family: string;
  rung: number;
  hex: string;
  anchored: boolean;
  onAnchor: (hex: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rgb = parseHex(hex);
  const ratio = rgb ? contrastRatio(rgb, WHITE) : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative h-11 w-full rounded-[4px] ring-1 ring-black/10 transition-transform hover:scale-[1.05] dark:ring-white/12"
          style={{ backgroundColor: hex }}
          title={`${family}-${rung} · ${hex}${anchored ? ' · épinglé' : ' · résolu'}`}
        >
          {/* Une nuance épinglée ne se déduit pas : elle mérite d'être signalée. */}
          {anchored && (
            <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-current opacity-70" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64" align="center">
        <p className="mb-2 font-mono text-xs">
          --ref-color-{family}-{rung}
        </p>
        <div className="flex items-center gap-2">
          <label
            className="relative size-8 shrink-0 rounded-md ring-1 ring-black/10 dark:ring-white/12"
            style={{ backgroundColor: hex }}
          >
            <input
              type="color"
              value={hex}
              onChange={(event) => onAnchor(event.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <span className="font-mono text-xs">{hex}</span>
        </div>

        <Separator className="my-3" />

        <p className="text-muted-foreground text-xs">
          Sur blanc {ratio.toFixed(2)}:1 · {wcagLevel(ratio)}
        </p>
        <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">
          {anchored
            ? 'Épinglée : cette valeur est imposée, les autres barreaux se déduisent autour.'
            : 'Résolue par le moteur. La modifier l’épingle, et relance la dérivation.'}
        </p>

        {anchored && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 w-full justify-start text-xs"
            onClick={() => {
              onAnchor(null);
              setOpen(false);
            }}
          >
            Retirer l’épingle
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AddColour({
  rungs,
  onAdd,
}: {
  rungs: number[];
  onAdd: (input: { name: string; hex: string; anchorRung: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#11ABA6');
  const [anchor, setAnchor] = useState(500);

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
          Donnez une teinte et le barreau qu’elle occupe. Le moteur en déduit les autres sous les
          mêmes contraintes que les familles existantes — même échelle, même contraste minimal.
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
                className={
                  'rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums ' +
                  (rung === anchor
                    ? 'bg-secondary text-secondary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary/50')
                }
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
            onAdd({ name, hex, anchorRung: anchor });
            setName('');
            setOpen(false);
          }}
        >
          Résoudre {rungs.length} nuances
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function DarkRungs({ count, onChange }: { count: number; onChange: (count: number) => void }) {
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">barreaux sombres</span>
      <Button
        variant="outline"
        size="sm"
        className="size-7 p-0"
        onClick={() => onChange(count - 1)}
        disabled={count <= 0}
      >
        −
      </Button>
      <span className="w-4 text-center font-mono tabular-nums">{count}</span>
      <Button
        variant="outline"
        size="sm"
        className="size-7 p-0"
        onClick={() => onChange(count + 1)}
        title="L’intervalle 500→700 n’est pas subdivisible : seule l’extrémité sombre s’étend"
      >
        +
      </Button>
    </span>
  );
}
