'use client';

import { Button } from '@/components/ui/button';

/**
 * Exporte le changeset en Markdown.
 *
 * Le fichier est lisible par un humain **et** directement applicable par un agent dans
 * le repo du design system : chaque opération nomme son token, son fichier et sa ligne.
 */
export function DownloadChangeset({ markdown }: { markdown: string }) {
  const download = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'changeset.md';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Button onClick={download} className="shrink-0">
      Exporter changeset.md
    </Button>
  );
}
