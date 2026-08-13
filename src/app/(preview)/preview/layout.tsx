import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Preview' };

/**
 * Layout nu de l'iframe de preview.
 *
 * Il n'importe **pas** `globals.css` : Tailwind et le CSS du design system ne doivent
 * jamais cohabiter dans un même document. La couche CSS-UI émet des sélecteurs de
 * balises globaux (`h1..h4`, `p`, `small`, `blockquote`) et des classes génériques
 * (`.bold`, `.rounded`, `.center-block`) que le preflight Tailwind réinitialise aussi ;
 * l'ordre d'import déciderait du gagnant, et les deux issues sont fausses (ADR 005).
 *
 * Ordre des feuilles, qui compte :
 *   1. font-face      les fontes Averta
 *   2. tokens chaînés les `--ref/--sys/--comp`, alias laissés en `var()`
 *   3. css-ui         les 186 classes `.ap-*`, qui consomment ces tokens
 *   4. icônes
 *   5. #ds-token-overrides, vide, en dernier : le parent y écrit et gagne à
 *      spécificité égale.
 */
export default function PreviewLayout({ children }: LayoutProps<'/preview'>) {
  return (
    /*
      Deux nœuds de ce document sont écrits par le parent, pas par React : le bloc
      d'overrides ci-dessous, et l'attribut `data-force` posé ici même pour forcer un
      état. React les voit comme des divergences d'hydratation — l'un est signalé,
      l'autre fait re-rendre tout l'arbre. `suppressHydrationWarning` dit ce qui est
      vrai : ce contenu est piloté de l'extérieur, et l'écart est voulu.
    */
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/*
          `no-css-tags` déconseille les feuilles manuelles pour que Next les optimise.
          Ici c'est délibéré : ce CSS n'est pas celui de l'app, c'est celui du design
          system qu'on inspecte. Il ne doit ni passer par le bundler, ni être fusionné
          avec les styles de l'app, et son ordre de chargement est significatif.
        */}
        {/* eslint-disable @next/next/no-css-tags */}
        <link rel="stylesheet" href="/ds/style/css-ui/font-face.css" />
        <link rel="stylesheet" href="/ds/desktop.chained.css" />
        <link rel="stylesheet" href="/ds/style/css-ui/index.css" />
        <link rel="stylesheet" href="/ds/icons/ap-icons.css" />
        {/* eslint-enable @next/next/no-css-tags */}
        <style id="ds-token-overrides" suppressHydrationWarning />
      </head>
      {/*
        Le design system n'a pas de mode sombre : `color-scheme: light` empêche le
        navigateur d'inverser les contrôles natifs et le fond selon les préférences
        système, ce qui fausserait toute lecture de contraste.
      */}
      <body style={{ margin: 0, background: '#fff', colorScheme: 'light' }}>{children}</body>
    </html>
  );
}
