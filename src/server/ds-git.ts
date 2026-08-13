import 'server-only';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getModeInfo } from './mode';

const run = promisify(execFile);

export type Branch = { name: string; sha: string; subject: string; date: string };

/**
 * Les branches du repo design system.
 *
 * Les scripts `ds:*` lisent par `git show <ref>:<path>` : changer de branche ici ne
 * demande donc pas de toucher au checkout du design system, seulement de régénérer
 * les snapshots pour cette ref.
 */
export async function listBranches(): Promise<Branch[]> {
  const { dsRepoPath } = getModeInfo();
  if (!dsRepoPath) return [];

  const { stdout } = await run('git', [
    '-C',
    dsRepoPath,
    'for-each-ref',
    '--sort=-committerdate',
    '--format=%(refname:short)%09%(objectname:short)%09%(committerdate:short)%09%(contents:subject)',
    'refs/heads',
    'refs/remotes/origin',
  ]);

  const seen = new Set<string>();
  return (
    stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [ref, sha, date, ...subject] = line.split('\t');
        return { name: ref.replace(/^origin\//, ''), sha, date, subject: subject.join('\t') };
      })
      // Une branche locale et son homologue distante sont la même : on garde la plus récente.
      .filter((branch) => (seen.has(branch.name) ? false : (seen.add(branch.name), true)))
      .slice(0, 40)
  );
}

/** Régénère les snapshots pour une ref. Long : c'est tout le pipeline `ds:sync`. */
export async function syncRef(ref: string): Promise<{ ok: boolean; output: string }> {
  const { dsRepoPath } = getModeInfo();
  if (!dsRepoPath)
    return { ok: false, output: 'Mode démo : le repo design system n’est pas accessible.' };

  // La ref vient d'une liste que l'on a produite, mais elle traverse une requête :
  // on la revalide avant de la passer à git.
  if (!/^[\w.\-/]+$/.test(ref)) return { ok: false, output: `Ref invalide : ${ref}` };

  const steps = [
    ['tools/build-chained-tokens.mjs'],
    ['tools/copy-ds-assets.mjs'],
    ['tools/build-specimens.mjs'],
    ['tools/build-usage-index.mjs'],
  ];

  const output: string[] = [];
  for (const [script] of steps) {
    const { stdout } = await run('node', [script, `--ds-root=${dsRepoPath}`, `--ds-ref=${ref}`], {
      cwd: process.cwd(),
      maxBuffer: 64 * 1024 * 1024,
    });
    output.push(stdout.trim());
  }

  return { ok: true, output: output.join('\n') };
}
