/** Lecture de `data/tokens.json` depuis les scripts, sans passer par l'app. */
import { existsSync, readFileSync } from 'node:fs';

const TOKENS_FILE = 'data/tokens.json';

export function allTokensFromFile(file = TOKENS_FILE) {
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, 'utf8')).tokens ?? [];
}
