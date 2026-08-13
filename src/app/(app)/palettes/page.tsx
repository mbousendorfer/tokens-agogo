import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { palettes } from '@/lib/palettes';
import { cn } from '@/lib/utils';

export default function PalettesPage() {
  const { ramps, singles } = palettes();
  const irregular = ramps.filter((ramp) => ramp.irregular);

  return (
    <>
      <PageHeader
        title="Palettes"
        blurb="Les ramps de couleur, leur régularité perceptuelle et leur accessibilité."
      />

      <section className="mb-8 flex flex-wrap gap-6 text-sm">
        <span>
          <strong className="tabular-nums">{ramps.length}</strong> ramps
        </span>
        <span>
          <strong className="tabular-nums">
            {ramps.reduce((sum, ramp) => sum + ramp.rungs.length, 0) + singles.length}
          </strong>{' '}
          primitives de couleur
        </span>
        {irregular.length > 0 && (
          <span className="text-muted-foreground">
            <strong className="text-foreground tabular-nums">{irregular.length}</strong> ramp
            {irregular.length > 1 ? 's' : ''} à la progression irrégulière
          </span>
        )}
      </section>

      <div className="space-y-8">
        {ramps.map((ramp) => (
          <section key={ramp.name}>
            <h2 className="mb-2 flex items-center gap-2 font-mono text-sm">
              {ramp.name}
              {ramp.irregular && (
                <Badge variant="outline" title="Un pas de luminosité s’écarte nettement des autres">
                  progression irrégulière
                </Badge>
              )}
            </h2>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Rung</th>
                    <th className="px-3 py-2 text-left font-medium">Valeur</th>
                    <th className="px-3 py-2 text-left font-medium">Luminosité OKLCH</th>
                    <th className="px-3 py-2 text-right font-medium">Sur blanc</th>
                    <th className="px-3 py-2 text-left font-medium">APCA</th>
                    <th className="px-3 py-2 text-right font-medium">Usages</th>
                  </tr>
                </thead>
                <tbody>
                  {ramp.rungs.map((rung) => (
                    <tr key={rung.token} className="hover:bg-muted/30 border-t">
                      <td className="px-3 py-1.5">
                        <Link
                          href={`/tokens/${encodeURIComponent(rung.token)}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <span
                            className="inline-block size-5 shrink-0 rounded border"
                            style={{ background: rung.hex }}
                          />
                          <span className="font-mono">{rung.rung}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 font-mono">{rung.hex}</td>
                      <td className="px-3 py-1.5">
                        <span className="flex items-center gap-2">
                          <span className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
                            <span
                              className="bg-foreground block h-full rounded-full"
                              style={{ width: `${Math.round(rung.lightness * 100)}%` }}
                            />
                          </span>
                          <span className="tabular-nums">{rung.lightness.toFixed(3)}</span>
                          {rung.stepDeviation !== null && Math.abs(rung.stepDeviation) > 0.6 && (
                            <span
                              className="text-muted-foreground"
                              title={`Ce pas s’écarte de ${Math.round(rung.stepDeviation * 100)} % du pas moyen`}
                            >
                              {rung.stepDeviation > 0 ? '↑ marche haute' : '↓ marche plate'}
                            </span>
                          )}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'px-3 py-1.5 text-right tabular-nums',
                          rung.onWhite.level === 'échec' && 'text-muted-foreground',
                        )}
                      >
                        {rung.onWhite.ratio.toFixed(2)}:1{' '}
                        <span className="text-muted-foreground">{rung.onWhite.level}</span>
                      </td>
                      <td className="px-3 py-1.5 tabular-nums">Lc {Math.round(rung.onWhite.lc)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {rung.usages || <span className="opacity-40">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <p className="text-muted-foreground mt-6 max-w-3xl text-xs leading-relaxed">
        Le contraste est mesuré contre le blanc, la surface par défaut du design system. WCAG 2.x
        est la règle bloquante ; APCA (Lc) est indicatif et reflète mieux la perception réelle,
        notamment sur les tons moyens. Une « marche haute » signale un pas de luminosité nettement
        plus grand que la moyenne de sa ramp — ce que l’œil voit et que le hex ne dit pas.
      </p>
    </>
  );
}
