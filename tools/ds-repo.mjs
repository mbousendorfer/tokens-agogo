/**
 * Accès en lecture au repo design system, depuis les scripts de `tools/`.
 *
 * La baseline du projet est `master` (ADR 001), qui n'est pas forcément la branche
 * sortie dans le working tree — le repo local peut être sur autre chose. On lit donc
 * par `git show <ref>:<path>` plutôt que par le système de fichiers, ce qui rend les
 * scripts indépendants de l'état du checkout.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const DEFAULT_DS_REF = 'master';

/** Résout le repo design system : `--ds-root`, puis `DS_REPO_PATH`, puis `../design-system`. */
export function resolveDsRoot(argv = process.argv.slice(2)) {
  const flag = argv.find((a) => a.startsWith('--ds-root='))?.slice('--ds-root='.length);
  const root = resolve(flag || process.env.DS_REPO_PATH || '../design-system');

  if (!existsSync(join(root, '.git'))) {
    throw new Error(
      `Repo design system introuvable : ${root}\n` +
        `Passer --ds-root=/chemin/vers/design-system ou définir DS_REPO_PATH.`,
    );
  }
  return root;
}

/** Résout la ref git à lire : `--ds-ref`, sinon `master`. */
export function resolveDsRef(argv = process.argv.slice(2)) {
  return argv.find((a) => a.startsWith('--ds-ref='))?.slice('--ds-ref='.length) || DEFAULT_DS_REF;
}

function git(dsRoot, args) {
  return execFileSync('git', ['-C', dsRoot, ...args], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
}

/** Le sha court de la ref, pour tracer d'où vient un artefact généré. */
export function refSha(dsRoot, ref) {
  return git(dsRoot, ['rev-parse', '--short', ref]).trim();
}

/** Liste les fichiers versionnés sous `path` à cette ref. */
export function listFiles(dsRoot, ref, path) {
  return git(dsRoot, ['ls-tree', '-r', '--name-only', ref, '--', path]).split('\n').filter(Boolean);
}

/** Lit un fichier à cette ref. */
export function readFileAtRef(dsRoot, ref, path) {
  return git(dsRoot, ['show', `${ref}:${path}`]);
}

/** Lit un fichier binaire à cette ref — les fontes, notamment. */
export function readBinaryAtRef(dsRoot, ref, path) {
  return execFileSync('git', ['-C', dsRoot, 'show', `${ref}:${path}`], {
    encoding: 'buffer',
    maxBuffer: 256 * 1024 * 1024,
  });
}

/**
 * Matérialise une arborescence du repo dans un dossier local.
 *
 * Style Dictionary lit des globs sur disque : il faut donc extraire les tokens de la
 * ref avant de le lancer. Retourne les chemins relatifs extraits.
 */
export function materialize(dsRoot, ref, srcPath, destDir) {
  const files = listFiles(dsRoot, ref, srcPath);
  for (const file of files) {
    const dest = join(destDir, file.slice(srcPath.length).replace(/^\//, ''));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileAtRef(dsRoot, ref, file));
  }
  return files;
}
