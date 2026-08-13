import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EMPTY_STATE, serializeState, type MigrationState } from '@/lib/decisions';
import { getModeInfo } from '@/server/mode';

const STATE_FILE = join(process.cwd(), 'migration-state.json');

/**
 * Lit et écrit `migration-state.json`.
 *
 * L'écriture n'existe qu'en mode local : la démo publique sert des snapshots et n'a
 * aucune raison d'avoir un droit d'écriture (ADR 009).
 */
export async function GET() {
  try {
    const content = await readFile(STATE_FILE, 'utf8');
    return Response.json(JSON.parse(content) as MigrationState);
  } catch {
    return Response.json(EMPTY_STATE);
  }
}

export async function PUT(request: Request) {
  if (getModeInfo().mode !== 'local') {
    return Response.json(
      { error: 'Écriture indisponible en mode démo : les décisions restent dans le navigateur.' },
      { status: 403 },
    );
  }

  const state = (await request.json()) as MigrationState;
  const stamped: MigrationState = { ...state, updatedAt: new Date().toISOString() };

  await writeFile(STATE_FILE, serializeState(stamped), 'utf8');
  return Response.json({ saved: stamped.decisions.length, updatedAt: stamped.updatedAt });
}
