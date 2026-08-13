import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EMPTY_OVERRIDES, serializeOverrides, type OverrideState } from '@/lib/token-overrides';
import { getModeInfo } from '@/server/mode';

const FILE = join(process.cwd(), 'token-overrides.json');

/**
 * Lit et écrit les redéfinitions de tokens sémantiques.
 *
 * Comme pour les décisions de composant, l'écriture n'existe qu'en mode local : la
 * démo publique sert des snapshots (ADR 009).
 */
export async function GET() {
  try {
    return Response.json(JSON.parse(await readFile(FILE, 'utf8')) as OverrideState);
  } catch {
    return Response.json(EMPTY_OVERRIDES);
  }
}

export async function PUT(request: Request) {
  if (getModeInfo().mode !== 'local') {
    return Response.json({ error: 'Écriture indisponible en mode démo.' }, { status: 403 });
  }

  const state = (await request.json()) as OverrideState;
  const stamped: OverrideState = { ...state, updatedAt: new Date().toISOString() };
  await writeFile(FILE, serializeOverrides(stamped), 'utf8');
  return Response.json({ saved: stamped.overrides.length });
}
