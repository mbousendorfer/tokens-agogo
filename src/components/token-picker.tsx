'use client';

import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import type { Candidate } from '@/lib/candidates';
import { cn } from '@/lib/utils';

const HEX = /^#[0-9a-f]{3,8}$/i;

function Swatch({ value }: { value: string | null }) {
  if (!value || !HEX.test(value)) return null;
  return (
    <span
      className="inline-block size-3 shrink-0 rounded-[3px] border"
      style={{ background: value }}
    />
  );
}

/**
 * Le sélecteur de token — le cœur de l'app (ADR 011).
 *
 * Les candidats arrivent déjà triés : tier sémantique d'abord, puis pertinence pour la
 * propriété CSS de la déclaration. Ce tri est une aide à la lecture, pas une
 * recommandation : c'est l'intention qui décide, pas la ressemblance (ADR 003).
 */
export function TokenPicker({
  current,
  chosen,
  candidates,
  onChoose,
  onClear,
}: {
  current: string;
  chosen: string | null;
  candidates: Candidate[];
  onChoose: (token: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? candidates.filter((candidate) => candidate.name.includes(needle))
      : candidates;
    return matching.slice(0, 60);
  }, [candidates, query]);

  const chosenCandidate = candidates.find((candidate) => candidate.name === chosen);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-1.5 rounded-md border px-2 py-1 text-left font-mono text-xs',
            chosen
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'hover:bg-secondary/50 border-dashed',
          )}
        >
          {chosen ? (
            <>
              <Swatch value={chosenCandidate?.value ?? null} />
              <span className="truncate">{chosen}</span>
            </>
          ) : (
            <span className="text-muted-foreground">choisir un token…</span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[460px] p-0" align="start">
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrer…"
            className="h-8 font-mono text-xs"
          />
          <p className="text-muted-foreground mt-1.5 px-1 text-[11px]">
            Remplace <span className="font-mono">{current}</span>
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="text-muted-foreground px-3 py-6 text-center text-xs">
              Aucun token ne correspond.
            </p>
          )}

          {filtered.map((candidate) => (
            <button
              key={candidate.name}
              type="button"
              onClick={() => {
                onChoose(candidate.name);
                setOpen(false);
                setQuery('');
              }}
              className={cn(
                'hover:bg-secondary/60 flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-xs',
                candidate.name === chosen && 'bg-secondary',
              )}
            >
              <Swatch value={candidate.value} />
              <span className="flex-1 truncate">{candidate.name}</span>
              <span className="text-muted-foreground shrink-0 tabular-nums">{candidate.value}</span>
              {candidate.sameValue && (
                <span
                  className="shrink-0 text-emerald-600 dark:text-emerald-400"
                  title="Rend exactement la même valeur qu'aujourd'hui"
                >
                  =
                </span>
              )}
            </button>
          ))}
        </div>

        {chosen && (
          <div className="border-t p-2">
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground w-full px-1 text-left text-xs"
            >
              Annuler ce choix
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
