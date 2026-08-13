import { ComingAtStep, PageHeader } from '@/components/page-header';

export default function TokensPage() {
  return (
    <>
      <PageHeader
        title="Tokens"
        blurb="Chaîne de résolution, valeur finale, et tous les usages réels dans le code."
      />
      <ComingAtStep step="6">
        <p>
          Les tokens des deux systèmes, filtrables, avec leur chaîne de résolution complète et leurs
          call sites réels — fichier, ligne, sélecteur, état, propriété.
        </p>
        <p>
          Les deux axes de dette y sont présentés séparément, parce qu’ils ne se corrigent pas au
          même endroit ni au même prix.
        </p>
      </ComingAtStep>
    </>
  );
}
