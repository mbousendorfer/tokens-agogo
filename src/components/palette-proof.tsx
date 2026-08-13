import { Badge } from '@/components/ui/badge';
import { contrastRatio, parseHex } from '@/lib/color';
import { derivation, generatedRamps, solve } from '@/lib/generator';
import { paletteProof } from '@/lib/palette-proof';

/** `electricBlue` → `electric blue`, pour une phrase. */
const readable = (family: string) => family.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

/**
 * Le nom d'une nuance, pris sur son token plutôt que reconstruit.
 *
 * Le solveur dit `electricBlue`, la grille écrit `Electric Blue`, le token dit
 * `electric-blue`. Recomposer donnait `electric blue-500`, qui n'existe nulle part.
 */
const shadeName = (token: string) => token.replace(/^--ref-color-/, '');

/**
 * La section qui fait tenir la page : la règle, et la preuve qu'elle tient.
 *
 * Une palette et un générateur affichés l'un sous l'autre ne disent rien — le lecteur
 * ne sait pas laquelle des deux est la vraie. Ici il n'y en a qu'une : on rejoue les
 * cinq nombres de la spec sur les huit familles, et on confronte le résultat aux
 * valeurs livrées par Figma, canal par canal.
 *
 * Le verdict est le sujet de la section, pas une note de bas de page. Il change ce
 * qu'on croit savoir de cette palette : ce ne sont pas 66 couleurs choisies, c'est une
 * échelle et une contrainte de contraste dont 66 couleurs découlent.
 */
export function PaletteProof() {
  const proof = paletteProof();
  const solution = solve();
  const steps = derivation(solution);
  const { derived } = solution;

  // La marge de la famille contraignante, mesurée sur les hex livrés.
  const witness = generatedRamps(solution).find((ramp) => ramp.family === derived.rung200Witness);
  const dark = witness?.rungs.find((rung) => rung.rung === 700);
  const light = witness?.rungs.find((rung) => rung.rung === 200);
  const witnessRatio =
    dark && light ? contrastRatio(parseHex(dark.hex)!, parseHex(light.hex)!) : null;

  const drifting = proof.comparisons.filter((shade) => shade.drift > 0);

  return (
    <section className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <h2 className="font-display text-[15px] font-semibold">La règle retrouve la palette</h2>
        <p className="text-muted-foreground text-xs">
          Rejouée sur les {generatedRamps(solution).length} familles, elle redonne les valeurs
          livrées.
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="default" className="font-mono text-[11px]">
            {proof.exact} à l’octet près
          </Badge>
          <Badge variant="secondary" className="font-mono text-[11px]">
            {proof.rounded} à une unité
          </Badge>
          <Badge
            variant={proof.missed.length ? 'destructive' : 'outline'}
            className="font-mono text-[11px]"
          >
            {proof.missed.length} au-delà
          </Badge>
        </div>
      </div>

      {/* La règle, énoncée une seule fois sur la page. L'ordre des étapes est la règle. */}
      <ol className="divide-y">
        {steps.map((step, index) => (
          <li key={step.step} className="flex items-baseline gap-3 px-4 py-2 text-xs">
            <span className="text-muted-foreground w-3 shrink-0 tabular-nums">{index + 1}</span>
            <span className="w-20 shrink-0 font-mono font-medium">{step.step}</span>
            <span className="w-16 shrink-0 font-mono tabular-nums">{step.value}</span>
            <span className="text-muted-foreground flex-1">{step.why}</span>
          </li>
        ))}
      </ol>

      {witnessRatio && (
        <p className="text-muted-foreground border-t px-4 py-3 text-xs leading-relaxed">
          C’est{' '}
          <span className="text-foreground font-medium">{readable(derived.rung200Witness)}</span>{' '}
          qui plafonne la clarté du barreau 200 pour tout le monde : son 700 sur son 200 mesure{' '}
          <span className="text-foreground font-mono tabular-nums">
            {witnessRatio.toFixed(2)}:1
          </span>
          , soit {(witnessRatio - 4.5).toFixed(2)} point de marge. L’alléger casserait son contraste
          avant celui des autres.
        </p>
      )}

      {drifting.length > 0 && (
        <div className="bg-muted/30 border-t px-4 py-3">
          <p className="text-muted-foreground mb-2 text-[11px] tracking-[0.04em] uppercase">
            Les {drifting.length} écarts — une unité sRGB sur un canal
          </p>
          {/*
            Les deux pastilles se touchent sans filet entre elles : c'est la
            démonstration même. Un écart d'une unité ne se voit pas, et le montrer
            vaut mieux que l'affirmer.
          */}
          <ul className="grid gap-x-6 gap-y-1.5 font-mono text-xs sm:grid-cols-2 xl:grid-cols-3">
            {drifting.map((shade) => (
              <li key={shade.token} className="flex items-center gap-2">
                <span className="ring-hairline flex size-3.5 shrink-0 overflow-hidden rounded-[3px] ring-1">
                  <span className="flex-1" style={{ backgroundColor: shade.real }} />
                  <span className="flex-1" style={{ backgroundColor: shade.solved }} />
                </span>
                <span className="flex-1 truncate">{shadeName(shade.token)}</span>
                <span className="text-muted-foreground shrink-0">
                  {shade.real.toLowerCase()} → {shade.solved.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {proof.offLadder.length > 0 && (
        <div className="border-t px-4 py-3">
          <p className="text-muted-foreground mb-2 text-[11px] tracking-[0.04em] uppercase">
            Les {proof.offLadder.length} nuances hors barreau — voulues, et retrouvées exactement
          </p>
          <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-xs">
            {proof.offLadder.map((shade) => (
              <li key={shade.token} className="flex items-center gap-1.5">
                <span
                  className="swatch size-3.5"
                  style={{ '--swatch': shade.real } as React.CSSProperties}
                />
                {shadeName(shade.token)}
                <span className="text-caution">
                  {shade.ladderDelta! > 0 ? '+' : '−'}
                  {Math.abs(shade.ladderDelta!).toFixed(3)} L
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground max-w-3xl text-xs leading-relaxed">
            Hors de l’échelle commune, et pourtant identiques à ce que la règle produit : ce sont
            les ancres de marque, que la spec place elle-même hors barreau. Une nuance hors échelle
            n’est donc pas une nuance fausse — c’est une décision, et elle est ici la seule.
          </p>
        </div>
      )}
    </section>
  );
}
