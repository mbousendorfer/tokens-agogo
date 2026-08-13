import { PageHeader } from '@/components/page-header';
import { PaletteGrid } from '@/components/palette-grid';
import { Badge } from '@/components/ui/badge';
import { figmaTokenData } from '@/lib/figma-tokens';
import { paletteGrid } from '@/lib/palettes';

export default function PalettesPage() {
  const data = paletteGrid();

  const shades = data.ramps.reduce((sum, ramp) => sum + ramp.shades.length, 0);
  const offLadder = data.ramps.reduce(
    (sum, ramp) => sum + ramp.shades.filter((shade) => shade.ladderDelta !== null).length,
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Référence"
        title="Palette"
        blurb="Les ramps alignées sur une même échelle de luminosité. Cliquez une nuance pour ses mesures et ses usages."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[11px]">
              {shades} nuances
            </Badge>
            {offLadder > 0 && (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {offLadder} hors échelle
              </Badge>
            )}
          </div>
        }
      />

      <PaletteGrid data={data} />

      <p className="text-muted-foreground mt-10 max-w-3xl text-xs leading-relaxed">
        Palette lue dans <span className="font-mono">{figmaTokenData.source.file}</span>. Une
        palette bien construite pose toutes ses ramps sur la même échelle de luminosité : l’échelle
        affichée ici est la médiane des L OKLCH par barreau, calculée sur les ramps qui partagent le
        même jeu de barreaux. Une nuance qui s’en écarte de plus de 0,008 L porte un coin marqué —
        c’est l’écart que l’œil commence à voir, et que le hex ne dit pas.
      </p>
    </>
  );
}
