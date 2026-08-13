'use client';

import { useEffect, useRef } from 'react';

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
  if (state) params.set('state', state);
  const src = `/preview${params.size ? `?${params}` : ''}`;

  useEffect(() => {
    const apply = () => {
      const doc = frameRef.current?.contentDocument;
      const target = doc?.getElementById('ds-token-overrides');
      if (!target) return;

      const entries = Object.entries(overrides);
      target.textContent = entries.length
        ? `:root {\n${entries.map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}`
        : '';
    };

    apply();

    // Le contenu de l'iframe se recharge quand `src` change : réappliquer au load.
    const frame = frameRef.current;
    frame?.addEventListener('load', apply);
    return () => frame?.removeEventListener('load', apply);
  }, [overrides, src]);

  return <iframe ref={frameRef} src={src} title={title} className={className} />;
}
