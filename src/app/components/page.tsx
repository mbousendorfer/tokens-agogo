import { ComingAtStep, PageHeader } from '@/components/page-header';

export default function ComponentsPage() {
  return (
    <>
      <PageHeader
        title="Composants"
        blurb="Ce que Figma prescrit face à ce que le code fait, état par état."
      />
      <ComingAtStep step="5">
        <p>
          La vue principale de l’app. Pour chaque composant, chaque variante et chaque état, elle
          confronte le binding prescrit dans Figma à la déclaration réelle du code, et produit un
          verdict : conforme, à migrer, non spécifié, ou exception assumée.
        </p>
        <p>
          Elle a besoin de l’index de déclarations (étape 3) et de l’import des bindings Figma
          (étape 4).
        </p>
      </ComingAtStep>
    </>
  );
}
