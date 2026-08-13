import { ComingAtStep, PageHeader } from '@/components/page-header';

export default function PalettesPage() {
  return (
    <>
      <PageHeader
        title="Palettes"
        blurb="Les ramps de couleur, leur régularité perceptuelle et leur accessibilité."
      />
      <ComingAtStep step="6">
        <p>
          Édition des ramps — valeur, renommage, ajout ou retrait d’une couleur ou d’un rung — avec
          la portée du changement affichée avant confirmation.
        </p>
        <p>
          Contrôle de contraste de chaque rung contre les surfaces sémantiques : WCAG AA bloquant,
          score APCA en complément.
        </p>
      </ComingAtStep>
    </>
  );
}
