import { Badge } from '@/components/ui/badge';
import type { PaletteGridData } from '@/lib/palettes';

/**
 * Comment cette palette est construite.
 *
 * Pas un texte d'intention : des règles **déduites des valeurs réelles**, avec leur
 * nombre d'exceptions. Une règle sans son compte d'exceptions ne dit rien — c'est
 * l'écart qui informe.
 */
export function PaletteRules({ data }: { data: PaletteGridData }) {
  const shared = data.ramps.filter((ramp) => ramp.scale === 'partagée');
  const independent = data.ramps.filter((ramp) => ramp.scale === 'indépendante');
  const offLadder = data.ramps.flatMap((ramp) =>
    ramp.shades.filter((shade) => shade.ladderDelta !== null).map((shade) => ({ ramp, shade })),
  );

  const sharedRungs = shared[0]?.shades.map((shade) => shade.rung) ?? [];

  const rules = [
    {
      rule: `${shared.length} ramps sur une même échelle de ${sharedRungs.length} barreaux`,
      detail: sharedRungs.join(' · '),
      exceptions: null,
    },
    {
      rule: 'La luminosité d’un barreau est la même d’une couleur à l’autre',
      detail:
        'L’échelle est la médiane des L OKLCH par barreau. C’est elle qui fait qu’un 600 « pèse » pareil en bleu et en rouge.',
      exceptions: offLadder.length
        ? `${offLadder.length} nuance(s) s’en écartent de plus de 0,008 L`
        : null,
    },
    ...(independent.length
      ? [
          {
            rule: `${independent.length} ramp(s) ont leur propre échelle`,
            detail: independent
              .map((ramp) => `${ramp.name} (${ramp.shades.length} barreaux)`)
              .join(', '),
            exceptions: 'Volontaire : le gris porte plus de marches que les couleurs.',
          },
        ]
      : []),
    {
      rule: 'Les couleurs sans échelle vivent à part',
      detail: `${data.singles.length} valeurs isolées : données de graphique, marques de réseaux sociaux, dégradés.`,
      exceptions: null,
    },
  ];

  return (
    <section className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <h2 className="font-display text-[15px] font-semibold">Comment cette palette est faite</h2>
        <p className="text-muted-foreground text-xs">Règles déduites des valeurs, pas déclarées.</p>
      </div>

      <ul className="divide-y">
        {rules.map((entry) => (
          <li key={entry.rule} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
            <span className="text-[13px] font-medium">{entry.rule}</span>
            <span className="text-muted-foreground flex-1 text-xs">{entry.detail}</span>
            {entry.exceptions && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {entry.exceptions}
              </Badge>
            )}
          </li>
        ))}
      </ul>

      {offLadder.length > 0 && (
        <div className="bg-muted/30 border-t px-4 py-3">
          <p className="text-muted-foreground mb-1.5 text-[11px] tracking-[0.04em] uppercase">
            Les nuances hors échelle
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
            {offLadder.map(({ ramp, shade }) => (
              <li key={shade.token} className="flex items-center gap-1.5">
                <span
                  className="swatch size-3"
                  style={{ '--swatch': shade.hex } as React.CSSProperties}
                />
                {ramp.name}-{shade.rung}
                <span className="text-caution">
                  {shade.ladderDelta! > 0 ? '+' : '−'}
                  {Math.abs(shade.ladderDelta!).toFixed(3)} L
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
