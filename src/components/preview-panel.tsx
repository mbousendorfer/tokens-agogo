'use client';

import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PreviewFrame } from '@/components/preview-frame';
import { cn } from '@/lib/utils';

/** Ce que le panneau montre : la baseline, les deux, ou les décisions seules. */
const MODES = ['avant', 'comparer', 'après'] as const;
export type PreviewMode = (typeof MODES)[number];

const MIN_WIDTH = 340;
const MAX_WIDTH = 1100;
const DEFAULT_WIDTH = 620;

/**
 * En deçà, deux colonnes seraient plus étroites qu'un `datepicker` : la comparaison
 * bascule alors en haut/bas, où chaque rendu garde toute la largeur du panneau.
 */
const SIDE_BY_SIDE_FROM = 620;

/*
  La largeur du panneau vit hors de React, dans le `localStorage` : on la règle une
  fois pour le composant qu'on regarde, et on navigue ensuite de composant en
  composant sans avoir à la reprendre.

  Elle se lit par `useSyncExternalStore` et non par un effet : le serveur rend la
  largeur par défaut, le client relit la sienne au premier rendu qui suit
  l'hydratation, et React absorbe l'écart. Un `setState` dans un effet, lui, ferait
  un rendu en cascade à chaque montage du panneau.
*/
const WIDTH_KEY = 'tokens-agogo:preview-width';

const widthListeners = new Set<() => void>();

/** Le dernier instantané servi, gardé stable : `getSnapshot` doit être idempotent. */
let currentWidth: number | null = null;

function subscribeWidth(listener: () => void) {
  widthListeners.add(listener);
  return () => void widthListeners.delete(listener);
}

function readWidth() {
  if (currentWidth === null) {
    const stored = Number(safeRead(WIDTH_KEY));
    currentWidth = stored ? clamp(stored) : DEFAULT_WIDTH;
  }
  return currentWidth;
}

function writeWidth(next: number, { persist }: { persist: boolean }) {
  currentWidth = clamp(next);
  if (persist) safeWrite(WIDTH_KEY, String(currentWidth));
  for (const listener of widthListeners) listener();
}

// Le stockage peut être refusé — navigation privée, iframe tierce. Un panneau qui
// oublie sa largeur est un désagrément ; un panneau qui jette est une page blanche.
function safeRead(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* tant pis */
  }
}

/**
 * Le panneau de preview : le composant réel, avant et après les décisions.
 *
 * Il est docké à droite du tableau, plein hauteur et redimensionnable, parce que le
 * travail consiste à décider une ligne et à regarder ce qu'elle fait — pas à faire
 * défiler la page pour retrouver un cadre de 220 px (ADR 012).
 *
 * « Avant » rend la baseline `master` sans aucun override ; « après » applique les
 * décisions en cours. Les deux cadres restent montés en permanence, y compris quand
 * un seul est visible : les remonter reparserait tout le CSS du design system et
 * perdrait la position de défilement à chaque bascule.
 */
export function PreviewPanel({
  specimens,
  specimen,
  onSpecimen,
  states,
  state,
  onState,
  overrides,
  onClose,
}: {
  specimens: { id: string; story: string }[];
  specimen: string | undefined;
  onSpecimen: (id: string) => void;
  states: string[];
  state: string;
  onState: (state: string) => void;
  overrides: Record<string, string>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<PreviewMode>('comparer');
  const [resizing, setResizing] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  const width = useSyncExternalStore(subscribeWidth, readWidth, () => DEFAULT_WIDTH);

  const startResize = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    // Le bord droit du panneau ne bouge pas quand on le redimensionne : on mesure
    // depuis lui, et pas depuis le bord de la fenêtre — la vue est centrée.
    const right = panelRef.current?.getBoundingClientRect().right ?? window.innerWidth;

    // On n'écrit dans le stockage qu'au relâchement : un glisser produit des
    // centaines de `pointermove`.
    const move = (moveEvent: PointerEvent) =>
      writeWidth(right - moveEvent.clientX, { persist: false });

    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      setResizing(false);
      writeWidth(readWidth(), { persist: true });
    };

    setResizing(true);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  }, []);

  const forced = state === 'défaut' || state === 'tous' ? null : state;
  const sideBySide = width >= SIDE_BY_SIDE_FROM;
  const applied = Object.keys(overrides).length;

  return (
    <aside
      ref={panelRef}
      // La largeur passe par une variable : une largeur en ligne s'appliquerait à
      // toutes les tailles d'écran, alors que le panneau ne se dock qu'à partir de `lg`.
      style={{ '--preview-width': `${width}px` } as React.CSSProperties}
      className={cn(
        'bg-surface relative flex w-full shrink-0 flex-col overflow-hidden rounded-lg border',
        'h-[26rem] lg:sticky lg:top-[4.5rem] lg:h-[calc(100dvh-6rem)] lg:w-[var(--preview-width)]',
      )}
    >
      {/* La poignée : le panneau n'a de bonne largeur que celle du composant regardé. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionner le panneau"
        onPointerDown={startResize}
        onDoubleClick={() => writeWidth(DEFAULT_WIDTH, { persist: true })}
        title="Glisser pour redimensionner · double-clic pour réinitialiser"
        className="bg-hairline/60 hover:bg-signal absolute top-0 bottom-0 left-0 z-10 hidden w-1 cursor-col-resize lg:block"
      />

      <div className="flex items-center gap-2 border-b py-1.5 pr-2 pl-3">
        <span className="text-muted-foreground font-mono text-[11px] tracking-wide uppercase">
          Preview
        </span>

        <ToggleGroup
          type="single"
          size="sm"
          value={mode}
          onValueChange={(value) => value && setMode(value as PreviewMode)}
          aria-label="Ce que la preview montre"
          className="ml-auto"
        >
          {MODES.map((item) => (
            <ToggleGroupItem
              key={item}
              value={item}
              className="px-2 text-xs"
              title={
                item === 'avant'
                  ? 'La baseline master, sans aucune décision'
                  : item === 'après'
                    ? 'Le rendu avec vos décisions'
                    : 'Les deux, pour comparer'
              }
            >
              {item}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fermer la preview"
          className="size-7"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b py-1.5 pr-2 pl-3">
        {specimens.length > 1 && (
          <ToggleGroup
            type="single"
            size="sm"
            value={specimen}
            onValueChange={(value) => value && onSpecimen(value)}
            aria-label="Spécimen"
          >
            {specimens.map((item) => (
              <ToggleGroupItem key={item.id} value={item.id} className="px-2 text-xs">
                {item.story}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}

        {/*
          Une pseudo-classe ne se déclenche pas de l'extérieur : la preview applique
          des règles dérivées du CSS réel du design system, où `:hover` devient une
          marque posée sur un ancêtre. L'état choisi filtre aussi le tableau — on
          regarde le composant dans un état, on traite les déclarations de cet état.
        */}
        <ToggleGroup
          type="single"
          size="sm"
          value={state}
          onValueChange={(value) => value && onState(value)}
          aria-label="État forcé"
        >
          {states.map((item) => (
            <ToggleGroupItem key={item} value={item} className="px-2 text-xs">
              {item}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1',
          sideBySide ? 'flex-row divide-x' : 'flex-col divide-y',
          // Pendant le glisser, le pointeur passerait dans l'iframe et le parent
          // cesserait de recevoir `pointermove` : la poignée resterait collée.
          resizing && '[&_iframe]:pointer-events-none',
        )}
      >
        <Pane label="avant" hint="baseline master" hidden={mode === 'après'}>
          <PreviewFrame
            specimenId={specimen}
            state={forced}
            overrides={EMPTY_OVERRIDES}
            title="Preview avant décisions"
            className="h-full w-full bg-white"
          />
        </Pane>

        <Pane
          label="après"
          hint={applied ? `${applied} token(s) réécrit(s)` : 'aucune décision appliquée'}
          hidden={mode === 'avant'}
        >
          <PreviewFrame
            specimenId={specimen}
            state={forced}
            overrides={overrides}
            title="Preview après décisions"
            className="h-full w-full bg-white"
          />
        </Pane>
      </div>
    </aside>
  );
}

/**
 * Un volet du panneau. Il se cache sans se démonter : le cadre qu'il contient garde
 * son document, son CSS déjà parsé et sa position de défilement.
 */
function Pane({
  label,
  hint,
  hidden,
  children,
}: {
  label: string;
  hint: string;
  hidden: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', hidden && 'hidden')}>
      <div className="text-muted-foreground flex items-baseline gap-2 px-2 py-1 text-[10px]">
        <span className="text-foreground font-mono tracking-wide uppercase">{label}</span>
        <span className="truncate">{hint}</span>
      </div>
      {children}
    </div>
  );
}

/** Stable entre deux rendus : sinon l'effet du cadre « avant » se rejouerait sans fin. */
const EMPTY_OVERRIDES: Record<string, string> = {};

function clamp(value: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)));
}
