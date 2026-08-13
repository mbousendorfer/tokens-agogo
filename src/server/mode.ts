import 'server-only';

/**
 * L'app tourne dans deux modes (ADR 009).
 *
 * - `local`  : `DS_REPO_PATH` pointe sur le repo design system. Lecture des fichiers
 *              réels, écriture possible. Mode de travail.
 * - `demo`   : pas de `DS_REPO_PATH`. Snapshots commités dans `data/`, lecture seule.
 *
 * Tout accès disque passe par `src/server/`, jamais depuis un composant.
 */
export type AppMode = 'local' | 'demo';

export type ModeInfo = {
  mode: AppMode;
  /** Chemin du repo design system, en mode local uniquement. */
  dsRepoPath: string | null;
};

export function getModeInfo(): ModeInfo {
  const dsRepoPath = process.env.DS_REPO_PATH?.trim() || null;
  return {
    mode: dsRepoPath ? 'local' : 'demo',
    dsRepoPath,
  };
}
