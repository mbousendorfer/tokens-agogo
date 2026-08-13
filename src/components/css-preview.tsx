'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export type CssLine = {
  file: string;
  line: number;
  selector: string | null;
  property: string | null;
  token: string;
  /** Le token retenu, quand une décision a été prise sur cette déclaration. */
  to: string | null;
};

/**
 * Le CSS du composant, tel qu'il est et tel qu'il deviendrait.
 *
 * Reconstruit depuis l'index de déclarations, groupé par sélecteur comme dans le
 * fichier source. Les lignes décidées sont montrées en remplacement — c'est la
 * relecture qui manquait entre « j'ai choisi » et « j'exporte ».
 */
export function CssPreview({ lines }: { lines: CssLine[] }) {
  const blocks = useMemo(() => {
    const map = new Map<string, CssLine[]>();
    for (const line of lines) {
      const key = line.selector || '(hors sélecteur)';
      map.set(key, [...(map.get(key) ?? []), line]);
    }
    return [...map.entries()].map(([selector, items]) => ({
      selector,
      items: items.sort((a, b) => a.line - b.line),
      changed: items.filter((item) => item.to).length,
    }));
  }, [lines]);

  const changed = lines.filter((line) => line.to).length;

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="bg-muted/40 text-muted-foreground flex items-center justify-between border-b px-3 py-1.5 text-[11px]">
        <span className="font-mono">{lines[0]?.file.split('/').at(-1) ?? 'CSS'}</span>
        <span className="tabular-nums">
          {changed > 0 ? `${changed} déclaration(s) modifiée(s)` : 'aucune modification'}
        </span>
      </div>

      <pre className="max-h-[420px] overflow-auto p-3 font-mono text-[11px] leading-relaxed">
        {blocks.map(({ selector, items, changed: blockChanged }) => (
          <div key={selector} className={cn('mb-3', blockChanged && 'bg-positive/[0.04]')}>
            <span className="text-muted-foreground">{selector}</span>
            <span className="text-muted-foreground"> {'{'}</span>
            {items.map((item) => (
              <div key={`${item.line}-${item.token}`} className="pl-4">
                <span className="text-muted-foreground">{item.property ?? '/* valeur */'}: </span>
                {item.to ? (
                  <>
                    <span className="text-destructive line-through decoration-1 opacity-60">
                      var({item.token})
                    </span>{' '}
                    <span className="text-positive">var({item.to})</span>
                  </>
                ) : (
                  <span>var({item.token})</span>
                )}
                <span className="text-muted-foreground">;</span>
              </div>
            ))}
            <span className="text-muted-foreground">{'}'}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
