import { Badge } from '@/components/ui/badge';
import { getModeInfo } from '@/server/mode';

/**
 * Dit toujours d'où viennent les données affichées. En mode démo, l'app sert des
 * snapshots commités et n'écrit rien (ADR 009).
 */
export function ModeBadge() {
  const { mode, dsRepoPath } = getModeInfo();

  if (mode === 'demo') {
    return (
      <Badge variant="outline" title="Snapshots commités, lecture seule">
        démo · lecture seule
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" title={`Lit et écrit ${dsRepoPath}`}>
      local · {dsRepoPath?.split('/').at(-1)}
    </Badge>
  );
}
