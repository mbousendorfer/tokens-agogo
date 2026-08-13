'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * L'iframe de preview, et le canal qui y injecte les overrides de tokens.
 *
 * L'iframe est **same-origin** : on écrit directement dans son `contentDocument`, sans
 * `postMessage`, sans sérialisation, sans aller-retour. Le bloc `<style>` cible est
 * déjà en dernier dans le `<head>` du layout de preview, donc à spécificité égale il
 * gagne (ADR 005).
 *
 * Comme la feuille de tokens est chaînée (`--sys-x: var(--ref-y)`), modifier une seule
 * primitive suffit : la cascade re-résout nativement toute sa descendance (ADR 004).
 *
 * Le cadre ne se remonte jamais. Rebooter coûte le reparse de tout le CSS du design
 * system et de ses masques d'icônes, perd la position de défilement, et le panneau en
 * affiche deux côte à côte — donc le double (ADR 012). Changer de spécimen navigue le
 * cadre en place, changer d'état ne le navigue même pas.
 */
export function PreviewFrame({
  specimenId,
  componentName,
  state,
  overrides,
  className,
  title = 'Preview du design system',
}: {
  specimenId?: string;
  componentName?: string;
  /** Force un état sur le spécimen : `hover`, `focus`, `active`, `disabled`… */
  state?: string | null;
  overrides: Record<string, string>;
  className?: string;
  title?: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const params = new URLSearchParams();
  if (specimenId) params.set('specimen', specimenId);
  else if (componentName) params.set('component', componentName);
  const src = `/preview${params.size ? `?${params}` : ''}`;

  /*
    `src` n'est posé qu'au montage, et React n'y retouche plus : affecter l'attribut
    `src` d'une iframe déjà chargée empile une entrée dans l'historique du **parent**,
    et le bouton Précédent du navigateur se met alors à rejouer les spécimens un par
    un au lieu de quitter la page. `location.replace()` navigue sans rien empiler.
  */
  const [initialSrc] = useState(src);
  const shown = useRef(src);

  useEffect(() => {
    if (shown.current === src) return;
    shown.current = src;
    frameRef.current?.contentWindow?.location.replace(src);
  }, [src]);

  useEffect(() => {
    const frame = frameRef.current;

    const apply = () => {
      const doc = frame?.contentDocument;
      if (!doc) return;

      const target = doc.getElementById('ds-token-overrides');
      if (target) {
        const entries = Object.entries(overrides);
        target.textContent = entries.length
          ? `:root {\n${entries.map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}`
          : '';
      }

      // L'état forcé est un attribut posé sur `<html>`, que les règles dérivées
      // reconnaissent comme ancêtre (voir `force-states.tsx`). Le passer par l'URL
      // rechargerait le cadre à chaque bascule hover → focus.
      if (state) doc.documentElement.setAttribute('data-force', state);
      else doc.documentElement.removeAttribute('data-force');
    };

    apply();

    // Après une navigation, le document est neuf : tout est à réappliquer.
    frame?.addEventListener('load', apply);
    return () => frame?.removeEventListener('load', apply);
  }, [overrides, state, src]);

  return <iframe ref={frameRef} src={initialSrc} title={title} className={className} />;
}
