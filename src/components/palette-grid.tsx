'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import type { PaletteGridData, Shade } from '@/lib/palettes';
import { cn } from '@/lib/utils';

/**
 * La palette en grille : une ramp par ligne, un barreau par colonne.
 *
 * Le hex et le numéro vivent **dans** la pastille, écrits dans la couleur qui s'y lit
 * le mieux — c'est la pastille qu'on regarde, pas une cellule de tableau à côté.
 *
 * Aligner les barreaux rend visible ce qu'un tableau cache : les ramps devraient
 * partager la même échelle de luminosité. Là où une nuance s'en écarte, on affiche
 * l'écart en L OKLCH.
 */
export function PaletteGrid({ data }: { data: PaletteGridData }) {
  const [scope, setScope] = useState<'palette' | 'ladder' | 'usage'>('palette');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>plus clair</span>
          <span className="h-1.5 w-24 rounded-full bg-gradient-to-r from-white to-black dark:from-white dark:to-black" />
          <span>plus sombre</span>
        </div>

        <Separator orientation="vertical" className="!h-4" />

        <div className="flex gap-1">
          {(
            [
              ['palette', 'Palette'],
              ['ladder', 'Écarts d’échelle'],
              ['usage', 'Usages'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs transition-colors',
                scope === value
                  ? 'bg-secondary text-secondary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-secondary/50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {/* L'en-tête de barreaux, aligné sur la grille des ramps. */}
        <div className="flex gap-3">
          <div className="w-32 shrink-0" />
          <div
            className="grid flex-1 gap-1.5"
            style={{ gridTemplateColumns: `repeat(${data.rungs.length}, minmax(0, 1fr))` }}
          >
            {data.rungs.map((rung) => (
              <div
                key={rung}
                className="text-muted-foreground text-center font-mono text-[11px] tabular-nums"
              >
                {rung}
              </div>
            ))}
          </div>
        </div>

        {data.ramps.map((ramp) => (
          <div key={ramp.name} className="flex items-start gap-3">
            <div className="w-32 shrink-0 pt-1">
              <p className="text-[13px] leading-tight font-medium capitalize">{ramp.label}</p>
              <p className="text-muted-foreground text-[11px] leading-tight">
                échelle {ramp.scale}
              </p>
            </div>

            <div
              className="grid flex-1 gap-1.5"
              style={{ gridTemplateColumns: `repeat(${data.rungs.length}, minmax(0, 1fr))` }}
            >
              {data.rungs.map((rung) => {
                const shade = ramp.shades.find((item) => item.rung === rung);
                if (!shade) return <div key={rung} />;
                return <ShadeCell key={rung} shade={shade} scope={scope} />;
              })}
            </div>
          </div>
        ))}
      </div>

      {data.singles.length > 0 && (
        <section>
          <h2 className="font-display mb-1 text-[15px] font-semibold">Couleurs isolées</h2>
          <p className="text-muted-foreground mb-3 text-xs">
            Sans échelle : données de graphique, réseaux sociaux, dégradés.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.singles.map((single) => (
              <Link
                key={single.token}
                href={`/tokens/${encodeURIComponent(single.token)}`}
                title={`${single.token} — ${single.hex} · ${single.usages} usage(s)`}
                className="flex h-14 w-[104px] flex-col justify-between rounded-md p-1.5 ring-1 ring-black/10 transition-transform hover:scale-[1.03] dark:ring-white/10"
                style={{ backgroundColor: single.hex, color: single.ink }}
              >
                <span className="truncate text-[10px] leading-none opacity-80">{single.label}</span>
                <span className="font-mono text-[10px] leading-none opacity-90">
                  {single.hex.slice(1).toLowerCase()}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ShadeCell({ shade, scope }: { shade: Shade; scope: 'palette' | 'ladder' | 'usage' }) {
  const [open, setOpen] = useState(false);
  const deviates = shade.ladderDelta !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative flex h-[68px] w-full flex-col justify-between rounded-md p-1.5 text-left ring-1 transition-transform',
            'ring-black/10 hover:scale-[1.04] focus-visible:ring-2 dark:ring-white/12',
            open && 'scale-[1.04]',
          )}
          style={{ backgroundColor: shade.hex, color: shade.ink }}
        >
          <span className="font-mono text-[11px] leading-none tabular-nums opacity-85">
            {shade.rung}
          </span>

          {scope === 'palette' && (
            <span className="font-mono text-[10px] leading-none opacity-80">
              {shade.hex.slice(1).toLowerCase()}
            </span>
          )}

          {scope === 'ladder' && (
            <span className="font-mono text-[10px] leading-none opacity-90">
              {deviates
                ? `${shade.ladderDelta! > 0 ? '+' : '−'}${Math.abs(shade.ladderDelta!).toFixed(3)} L`
                : shade.lightness.toFixed(3)}
            </span>
          )}

          {scope === 'usage' && (
            <span className="font-mono text-[10px] leading-none tabular-nums opacity-90">
              {shade.usages || '—'}
            </span>
          )}

          {/* Le coin marqué : cette nuance ne tombe pas sur le barreau commun. */}
          {deviates && (
            <span
              aria-label="hors échelle"
              className="absolute top-0 right-0 size-0 border-t-[9px] border-l-[9px] border-t-current border-l-transparent opacity-45"
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72" align="center">
        <div className="flex items-center gap-2">
          <span
            className="swatch size-8"
            style={{ '--swatch': shade.hex } as React.CSSProperties}
          />
          <div className="min-w-0">
            <p className="truncate font-mono text-xs">{shade.token}</p>
            <p className="text-muted-foreground font-mono text-[11px]">{shade.hex}</p>
          </div>
        </div>

        <Separator className="my-3" />

        <dl className="space-y-1.5 text-xs">
          <Row label="Luminosité OKLCH" value={shade.lightness.toFixed(3)} />
          <Row label="Chroma" value={shade.chroma.toFixed(3)} />
          <Row label="Teinte" value={`${Math.round(shade.hue)}°`} />
          {deviates && (
            <Row
              label="Écart à l’échelle"
              value={`${shade.ladderDelta! > 0 ? '+' : '−'}${Math.abs(shade.ladderDelta!).toFixed(3)} L`}
              tone="caution"
            />
          )}
          <Row
            label="Sur blanc"
            value={`${shade.onWhite.ratio.toFixed(2)}:1 · ${shade.onWhite.level}`}
            tone={shade.onWhite.level === 'échec' ? 'muted' : 'default'}
          />
          <Row
            label="Sur noir"
            value={`${shade.onBlack.ratio.toFixed(2)}:1 · ${shade.onBlack.level}`}
            tone={shade.onBlack.level === 'échec' ? 'muted' : 'default'}
          />
          <Row label="APCA sur blanc" value={`Lc ${Math.round(shade.onWhite.lc)}`} />
        </dl>

        <Separator className="my-3" />

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">
            {shade.usages} usage{shade.usages > 1 ? 's' : ''}
          </Badge>
          <Link
            href={`/tokens/${encodeURIComponent(shade.token)}`}
            className="text-xs hover:underline"
          >
            Voir les call sites →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Row({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'muted' | 'caution';
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'font-mono tabular-nums',
          tone === 'muted' && 'text-muted-foreground',
          tone === 'caution' && 'text-caution',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
