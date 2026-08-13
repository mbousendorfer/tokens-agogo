'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { contrastRatio, parseHex, toOklch, wcagLevel } from '@/lib/color';
import type { PaletteSolution, PaletteSpec } from '@/lib/color-lab/engine/types';
import { derivation, generatedRamps, solve } from '@/lib/generator';
import {
  addFamily,
  normalizeId,
  removeFamily,
  renameFamily,
  setAnchor,
  setExtraDarkRungs,
} from '@/lib/spec-edit';
import { cn } from '@/lib/utils';

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

/** Au-delà, l'œil voit que la nuance ne tient pas son barreau — le seuil de la grille. */
const OFF_LADDER = 0.008;

/** La couleur de texte qui se lit le mieux sur une pastille. */
function inkOn(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#000000';
  return contrastRatio(rgb, WHITE) > contrastRatio(rgb, BLACK) ? '#FFFFFF' : '#000000';
}

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

  const { solution, ramps, steps, error } = useMemo(() => {
    try {
      const solved = solve(spec);
      return {
        solution: solved,
        ramps: generatedRamps(solved),
        steps: derivation(solved),
        error: null,
      };
    } catch (cause) {
      // Une spec peut devenir insoluble — retirer la famille qui ancre le 700, par
      // exemple. On le dit au lieu d'afficher une palette fausse.
      return { solution: null, ramps: [], steps: [], error: (cause as Error).message };
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

          {/* Sous les ramps : là où on tend la main quand on veut en ajouter une. */}
          <AddColour
            spec={spec}
            current={solution}
            onAdd={(input) => setSpec((s) => addFamily(s, input))}
          />
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
  spec,
  current,
  onAdd,
}: {
  spec: PaletteSpec;
  current: PaletteSolution | null;
  onAdd: (input: { name: string; hex: string; anchorRung: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#C2185B');
  const [anchor, setAnchor] = useState(500);

  const id = normalizeId(name);
  const taken = spec.chromatic.families.some((family) => family.id === id);
  const validHex = /^#[0-9a-f]{6}$/i.test(hex);

  /**
   * L'aperçu passe par le **vrai** solveur, spec candidate comprise.
   *
   * Ce n'est pas un raffinement : une famille ajoutée participe à la recherche du
   * barreau 200 comme les autres, donc une teinte claire peut déplacer l'échelle de
   * **toutes** les familles. Un aperçu approché tairait précisément le seul effet
   * qu'on a besoin de connaître avant de valider.
   *
   * Il ne dépend **pas du nom**. Le nom est une étiquette : il décide de
   * l'identifiant du token, pas d'une seule des huit nuances. L'exiger avant de
   * montrer quoi que ce soit laissait le formulaire mort à l'ouverture — alors que
   * ce qu'on vient y faire, c'est justement choisir une couleur en la voyant
   * résolue. Le nom ne conditionne que la validation.
   */
  /*
    Le nom sous lequel la famille candidate entre dans la spec. Tant qu'on n'a rien
    tapé, un nom de travail — passé par `normalizeId` comme n'importe quel autre,
    sinon la clé cherchée dans la solution ne serait pas celle qui y a été écrite.
  */
  const previewName = id && !taken ? name : freeName(spec);
  const previewId = normalizeId(previewName);

  const preview = useMemo(() => {
    if (!validHex || !current) return null;
    try {
      const solution = solve(addFamily(spec, { name: previewName, hex, anchorRung: anchor }));
      const shades = solution.chromaticRungs
        .map((rung) => solution.rungs.get(`${previewId}.${rung}`))
        .filter((shade): shade is NonNullable<typeof shade> => Boolean(shade));

      const dark = solution.rungs.get(`${previewId}.700`);
      const light = solution.rungs.get(`${previewId}.200`);
      const contrast =
        dark && light ? contrastRatio(parseHex(dark.hex)!, parseHex(light.hex)!) : null;

      // La clarté de la couleur donnée, contre celle du barreau où on l'épingle.
      const anchorIndex = solution.chromaticRungs.indexOf(anchor);
      const ladderL = anchorIndex >= 0 ? solution.chromaticLadder[anchorIndex] : null;
      const ownL = toOklch(parseHex(hex)!).l;
      const nearest = solution.chromaticRungs.reduce((best, rung, index) =>
        Math.abs(solution.chromaticLadder[index] - ownL) <
        Math.abs(solution.chromaticLadder[solution.chromaticRungs.indexOf(best)] - ownL)
          ? rung
          : best,
      );

      return {
        shades,
        contrast,
        target: spec.chromatic.contrast700on200,
        witness: solution.derived.rung200Witness,
        witnessBefore: current.derived.rung200Witness,
        // Cinq décimales : en deçà, deux solutions différentes se ressemblent.
        ladderMoved: solution.derived.L200.toFixed(5) !== current.derived.L200.toFixed(5),
        oldL200: current.derived.L200,
        newL200: solution.derived.L200,
        shift: Math.abs(solution.derived.L200 - current.derived.L200),
        offLadder: ladderL === null ? null : ownL - ladderL,
        nearest,
      };
    } catch (cause) {
      return { error: (cause as Error).message };
    }
  }, [spec, current, previewName, previewId, hex, anchor, validHex]);

  if (!open) {
    return (
      <div className="pt-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" />
          Ajouter une couleur
        </Button>
      </div>
    );
  }

  const solved = preview && !('error' in preview) ? preview : null;
  const failed = preview && 'error' in preview ? preview.error : null;

  // Voir, c'est une chose ; ajouter en est une autre. Seule la seconde exige un nom.
  const canCommit = Boolean(solved && id && !taken);

  return (
    <div className="bg-muted/20 mt-3 rounded-lg border p-4">
      <h3 className="font-display text-sm font-semibold">Ajouter une couleur</h3>
      <p className="text-muted-foreground mt-0.5 mb-4 text-xs">
        Donnez-lui une couleur et le barreau qu’elle occupe : les autres nuances se déduisent, sur
        la même échelle que les familles existantes.
      </p>

      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <Field label="Nom">
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ex. Magenta"
              className="h-8 w-44 text-xs"
            />
            {id && !taken && (
              <span className="text-muted-foreground font-mono text-[11px]">
                --ref-color-{id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}-500
              </span>
            )}
            {taken && (
              <Badge variant="destructive" className="text-[10px]">
                cette famille existe déjà
              </Badge>
            )}
          </div>
        </Field>

        <Field label="Couleur">
          <div className="flex items-center gap-2">
            <label
              className="ring-hairline relative size-8 shrink-0 rounded-md ring-1"
              style={{ backgroundColor: validHex ? hex : 'transparent' }}
            >
              <input
                type="color"
                value={validHex ? hex : '#000000'}
                onChange={(event) => setHex(event.target.value.toUpperCase())}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Choisir la couleur"
              />
            </label>
            <Input
              value={hex}
              onChange={(event) => setHex(event.target.value.toUpperCase())}
              className="h-8 w-28 font-mono text-xs"
              aria-invalid={!validHex}
            />
          </div>
        </Field>

        <Field label="Barreau épinglé">
          <div className="flex flex-wrap gap-1">
            {(current?.chromaticRungs ?? []).map((rung) => (
              <button
                key={rung}
                type="button"
                onClick={() => setAnchor(rung)}
                className={cn(
                  'rounded px-1.5 py-1 font-mono text-[11px] tabular-nums',
                  rung === anchor
                    ? 'bg-secondary text-secondary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary/50',
                )}
              >
                {rung}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {failed && (
        <p className="text-destructive mt-4 text-xs">
          Spec insoluble avec cette couleur : {failed}
        </p>
      )}

      {solved && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-1">
            {solved.shades.map((shade) => (
              <div
                key={shade.rung}
                className="ring-hairline flex h-14 flex-1 flex-col justify-between rounded-[4px] p-1.5 font-mono text-[10px] ring-1"
                style={{ backgroundColor: shade.hex, color: inkOn(shade.hex) }}
                title={`${id || 'cette couleur'}-${shade.rung} · ${shade.hex}`}
              >
                <span>{shade.rung}</span>
                <span>{shade.hex.replace('#', '').toLowerCase()}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <span className="text-muted-foreground">700 sur 200</span>
            {solved.contrast !== null && (
              <Badge
                variant="outline"
                className={cn(
                  'font-mono text-[11px]',
                  solved.contrast >= solved.target
                    ? 'border-positive/40 text-positive'
                    : 'border-destructive/50 text-destructive',
                )}
              >
                {solved.contrast.toFixed(2)}:1{' '}
                {solved.contrast >= solved.target ? 'passe le minimum' : 'SOUS le minimum'}
              </Badge>
            )}
          </div>

          {/*
            La conséquence qu'on ne peut pas deviner : ajouter une famille n'est pas
            gratuit. Si sa teinte devient celle qui contraint le barreau 200, toute la
            palette se re-dérive.

            Le ton suit la mesure. Une teinte proche du vert reprend la contrainte en
            ne déplaçant L200 que de 8·10⁻⁵ : l'annoncer sur le même ton qu'un vrai
            décalage apprendrait à ignorer l'avertissement.
          */}
          <p className="text-muted-foreground max-w-3xl text-xs leading-relaxed">
            {!solved.ladderMoved ? (
              <>
                L’échelle commune ne bouge pas : {solved.witness} contraint toujours le barreau 200.
              </>
            ) : solved.shift > OFF_LADDER ? (
              <>
                <span className="text-caution font-medium">
                  Cette teinte devient la famille contraignante.
                </span>{' '}
                Le barreau 200 est résolu pour tout le monde à la fois : L200 passerait de{' '}
                <span className="font-mono tabular-nums">{solved.oldL200.toFixed(4)}</span> à{' '}
                <span className="font-mono tabular-nums">{solved.newL200.toFixed(4)}</span>, et{' '}
                <strong>toutes</strong> les familles se décaleraient avec lui.
              </>
            ) : (
              <>
                Cette teinte <span className="text-foreground font-medium">reprend</span> la
                contrainte du barreau 200 à {solved.witnessBefore} — mais le déplacement reste
                invisible ({solved.shift.toExponential(1)} L, sous le seuil de{' '}
                <span className="font-mono tabular-nums">{OFF_LADDER}</span>). Rien ne bouge à
                l’écran aujourd’hui ; c’est elle qui plafonnera la clarté du 200 demain.
              </>
            )}
          </p>

          {solved.offLadder !== null && Math.abs(solved.offLadder) > OFF_LADDER && (
            <p className="text-muted-foreground max-w-3xl text-xs leading-relaxed">
              Épinglée sur {anchor}, votre couleur se posera{' '}
              <span className="text-caution font-mono tabular-nums">
                {solved.offLadder > 0 ? '+' : '−'}
                {Math.abs(solved.offLadder).toFixed(3)} L
              </span>{' '}
              hors du barreau — comme les ancres de marque. Le barreau le plus proche de sa clarté
              est <span className="font-mono">{solved.nearest}</span>.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" disabled={!canCommit} onClick={commit}>
          Ajouter cette couleur
        </Button>
        <Button variant="ghost" size="sm" onClick={close}>
          Annuler
        </Button>
        {/* Un bouton grisé sans raison est une impasse : on dit ce qui manque. */}
        {!canCommit && (
          <span className="text-muted-foreground text-xs">
            {!validHex
              ? 'la couleur n’est pas un hex à six chiffres'
              : taken
                ? 'ce nom est déjà pris'
                : 'donnez-lui un nom pour l’ajouter'}
          </span>
        )}
      </div>
    </div>
  );

  function commit() {
    if (!canCommit) return;
    onAdd({ name, hex, anchorRung: anchor });
    close();
  }

  function close() {
    setName('');
    setOpen(false);
  }
}

/** Un nom de travail qu'aucune famille n'occupe : l'aperçu ne doit en écraser aucune. */
function freeName(spec: PaletteSpec): string {
  let candidate = 'apercu';
  while (spec.chromatic.families.some((family) => family.id === normalizeId(candidate))) {
    candidate += 'x';
  }
  return candidate;
}

/** Un champ, avec son étiquette au-dessus. Un placeholder n'est pas une étiquette. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-muted-foreground block text-[11px]">{label}</span>
      {children}
    </div>
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
