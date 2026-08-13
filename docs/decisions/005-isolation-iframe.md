# 005 — Isolation du CSS du design system par iframe same-origin

- **Date** : 2026-08-13
- **Statut** : accepté

## Contexte

L'app doit afficher les vrais composants du design system, stylés par les vrais tokens, tout en étant elle-même construite avec Tailwind et shadcn/ui.

La couche CSS-UI du design system (`libs/ui-theme/assets/style/css-ui/`) n'est pas neutre : au-delà de ses 186 classes `.ap-*`, elle émet des sélecteurs de balises globaux — `h1, h2, h3, h4`, `p`, `small`, `blockquote`, `embed` — et des classes génériques `.bold`, `.italic`, `.rounded`, `.center-block`, `.large`, `.small`. Le preflight Tailwind réinitialise exactement les mêmes balises.

Charger les deux dans le même document donne un résultat déterminé par l'ordre d'import, et les deux ordres possibles sont faux : soit le design system casse la mise en page de l'app, soit l'app fausse le rendu du design system.

## Décision

Le CSS du design system ne rentre **jamais** dans le document principal. La preview est une route `/preview` au layout nu, affichée dans une **iframe same-origin**.

L'iframe charge, dans cet ordre : `font-face.css`, `tokens.chained.css`, `css-ui.css`, `ap-icons.css`, puis un `<style id="ds-token-overrides">` vide en fin de `<head>`. Le parent y écrit directement via `iframe.contentDocument` — pas de `postMessage`, pas de sérialisation, pas d'aller-retour.

L'ordre garantit que les overrides gagnent : même spécificité, déclarés en dernier.

## Conséquences

- Isolation totale dans les deux sens.
- Sémantiques `position: fixed` correctes pour `.ap-dialog`, `.ap-snackbar`, `.ap-tooltip` — elles se positionnent par rapport au cadre de preview, pas à la fenêtre de l'app.
- Contrôle de la largeur du viewport gratuit, ce qui couvre l'axe desktop/mobile du design system (`desktop_variables.css` vs `mobile_variables.css`).
- Une iframe par surface de preview, à ne pas multiplier inutilement.

## Alternatives écartées

- **Shadow DOM + `adoptedStyleSheets`** — fonctionne (les custom properties traversent la frontière shadow), mais `@font-face` y est ignoré et devrait vivre dans le document hôte, ce qui réintroduit un effet de bord global ; et `position: fixed` s'échappe du shadow root, cassant l'illusion du cadre de preview. Reste le repli si on veut un jour des mini-previews inline dans le flux du document.
- **`<iframe srcDoc>`** — son URL de base est `about:srcdoc`, ce qui casse toutes les URL relatives : fontes, `url()` dans le CSS. Il faudrait absolutiser chaque asset et re-sérialiser le document à chaque édition.
- **Scoper le CSS du design system sous un préfixe** — revient à modifier le CSS qu'on prétend prévisualiser fidèlement.
