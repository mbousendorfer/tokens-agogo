import { Badge } from '@/components/ui/badge';
import { contrastRatio, parseHex } from '@/lib/color';
import { derivation, generatedRamps, solve } from '@/lib/generator';

/**
 * La palette telle que le moteur la résout.
 *
 * Ce n'est pas un aperçu décoratif : chaque nuance est le produit d'une dérivation
 * qu'on peut relire, et le barreau 200 est trouvé sous contrainte de contraste. La
 * famille qui a contraint le solveur est nommée, avec la marge qui lui reste — sans
 * ça, on ne saurait pas quelle couleur bouger sans casser l'accessibilité.
 */
export function PaletteGenerator() {
  const solution = solve();
  const ramps = generatedRamps(solution);
  const steps = derivation(solution);
  const { derived } = solution;

  // La marge de la famille contraignante, mesurée sur les hex livrés.
  const witness = ramps.find((ramp) => ramp.family === derived.rung200Witness);
  const dark = witness?.rungs.find((rung) => rung.rung === 700);
  const light = witness?.rungs.find((rung) => rung.rung === 200);
  const witnessRatio =
    dark && light ? contrastRatio(parseHex(dark.hex)!, parseHex(light.hex)!) : null;

  return (
    <section className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <h2 className="font-display text-[15px] font-semibold">Le générateur</h2>
        <p className="text-muted-foreground text-xs">Chaque nuance est résolue, pas choisie.</p>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px]">
            {ramps.length - 1} familles sur une échelle
          </Badge>
          <Badge variant="secondary" className="font-mono text-[11px]">
            {solution.rungs.size} nuances
          </Badge>
        </div>
      </div>

      <div className="space-y-2 p-4">
        {ramps.map((ramp) => (
          <div key={ramp.family} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-[13px] font-medium capitalize">
              {ramp.family.replace(/([a-z])([A-Z])/g, '$1 $2')}
            </span>
            <div className="flex flex-1 gap-1">
              {ramp.rungs.map((rung) => (
                <div
                  key={rung.rung}
                  className="h-9 flex-1 rounded-[4px] ring-1 ring-black/10 dark:ring-white/12"
                  style={{ backgroundColor: rung.hex }}
                  title={`${ramp.family}-${rung.rung} · ${rung.hex} · L ${rung.L.toFixed(3)}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/30 border-t px-4 py-3">
        <p className="text-muted-foreground mb-2 text-[11px] tracking-[0.04em] uppercase">
          Comment l’échelle est dérivée — l’ordre compte
        </p>
        <ol className="space-y-1.5 text-xs">
          {steps.map((step, index) => (
            <li key={step.step} className="flex items-baseline gap-2">
              <span className="text-muted-foreground w-4 shrink-0 tabular-nums">{index + 1}.</span>
              <span className="w-20 shrink-0 font-mono">{step.step}</span>
              <span className="w-16 shrink-0 font-mono tabular-nums">{step.value}</span>
              <span className="text-muted-foreground flex-1">{step.why}</span>
            </li>
          ))}
        </ol>

        {witnessRatio && (
          <p className="text-muted-foreground mt-3 border-t pt-3 text-xs leading-relaxed">
            La famille contraignante est{' '}
            <span className="text-foreground font-medium">{derived.rung200Witness}</span> : son 700
            sur son 200 mesure{' '}
            <span className="text-foreground font-mono tabular-nums">
              {witnessRatio.toFixed(2)}:1
            </span>
            , soit {(witnessRatio - 4.5).toFixed(2)} point de marge. C’est elle qui plafonne la
            clarté du barreau 200 pour tout le monde — l’alléger casserait son contraste avant celui
            des autres.
          </p>
        )}
      </div>
    </section>
  );
}
