import { ContrastChecker } from '@/components/contrast-checker';
import { PageHeader } from '@/components/page-header';
import { PaletteEditor } from '@/components/palette-editor';
import { PaletteGrid } from '@/components/palette-grid';
import { PaletteProof } from '@/components/palette-proof';
import { Badge } from '@/components/ui/badge';
import { figmaTokenData } from '@/lib/figma-tokens';
import { paletteGrid } from '@/lib/palettes';
import { BASELINE_SPEC } from '@/lib/generator';

/**
 * La page Palette, dans l'ordre où la question se pose.
 *
 * Elle empilait cinq sections qui parlaient de la même chose sans se rejoindre : la
 * palette livrée, un générateur, un éditeur qui répétait le générateur, un
 * comparateur, et des « règles » qui redisaient ce que la grille montrait déjà. Le
 * tableau de dérivation y figurait deux fois, à l'identique, et rien ne disait laquelle
 * des deux palettes affichées était la vraie.
 *
 * Il n'y en a qu'une, et elle obéit à une règle. La page le raconte donc dans cet
 * ordre : voici la palette livrée ; voici la règle, et la preuve mesurée qu'elle la
 * retrouve ; voici de quoi la déplacer ; voici de quoi mesurer une paire.
 */
export default function PalettesPage() {
  const data = paletteGrid();

  const shades = data.ramps.reduce((sum, ramp) => sum + ramp.shades.length, 0);

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
        blurb="Ces nuances ne sont pas choisies une par une : elles découlent de cinq nombres et d’une contrainte de contraste. Ci-dessous, la palette livrée, la règle qui la produit, et ce qui les sépare."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[11px]">
              {shades} nuances
            </Badge>
            <Badge variant="outline" className="font-mono text-[11px]">
              {data.singles.length} isolées
            </Badge>
          </div>
        }
      />

      <div className="space-y-8">
        <PaletteGrid data={data} />
        <PaletteProof />
        <PaletteEditor baseline={BASELINE_SPEC} />
        <ContrastChecker swatches={swatches} />
      </div>

      <p className="text-muted-foreground mt-8 max-w-3xl text-xs leading-relaxed">
        Palette lue dans <span className="font-mono">{figmaTokenData.source.file}</span>, extraite
        par le MCP Figma. La règle vient de{' '}
        <span className="font-mono">spec/palette.baseline.json</span>, seule vérité écrite à la
        main.
      </p>
    </>
  );
}
