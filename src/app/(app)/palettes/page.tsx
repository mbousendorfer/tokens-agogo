import { ContrastChecker } from '@/components/contrast-checker';
import { PageHeader } from '@/components/page-header';
import { PaletteEditor } from '@/components/palette-editor';
import { PaletteGrid } from '@/components/palette-grid';
import { PaletteRules } from '@/components/palette-rules';
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

  // Toutes les nuances nommées, pour le comparateur de contraste.
  const swatches = [
    ...data.ramps.flatMap((ramp) =>
      ramp.shades.map((shade) => ({
        token: shade.token,
        label: `${ramp.name}-${shade.rung}`,
        hex: shade.hex,
        ramp: ramp.name,
      })),
    ),
    ...data.singles.map((single) => ({
      token: single.token,
      label: single.label,
      hex: single.hex,
      ramp: 'isolées',
    })),
  ];

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

      <div className="space-y-8">
        <PaletteGrid data={data} />

        <PaletteEditor
          initial={data.ramps.map((ramp) => ({
            name: ramp.name,
            shades: ramp.shades.map((shade) => ({ rung: shade.rung, hex: shade.hex })),
          }))}
          ladder={data.ladder}
          usages={Object.fromEntries(
            data.ramps.flatMap((ramp) => ramp.shades.map((shade) => [shade.token, shade.usages])),
          )}
        />
        <ContrastChecker swatches={swatches} />
        <PaletteRules data={data} />
      </div>

      <p className="text-muted-foreground mt-8 max-w-3xl text-xs leading-relaxed">
        Palette lue dans <span className="font-mono">{figmaTokenData.source.file}</span>, extraite
        par le MCP Figma.
      </p>
    </>
  );
}
