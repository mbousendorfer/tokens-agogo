import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { FigmaTokenReference } from '@/components/figma-token-reference';
import { SysTokenEditor, type SysRow } from '@/components/sys-token-editor';
import { PageHeader, Stat } from '@/components/page-header';
import { TokenTable } from '@/components/token-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { danglingTokens, declarationData, tokenRows } from '@/lib/declarations';
import { EMPTY_STATE, type MigrationState } from '@/lib/decisions';
import { figmaTokenData, targetTokens } from '@/lib/figma-tokens';
import { usageCount } from '@/lib/declarations';
import { blastRadius } from '@/lib/token-overrides';
import { getModeInfo } from '@/server/mode';

async function readState(): Promise<MigrationState> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), 'migration-state.json'), 'utf8'));
  } catch {
    return EMPTY_STATE;
  }
}

export const dynamic = 'force-dynamic';

export default async function TokensPage() {
  const state = await readState();
  const rows = tokenRows().map(({ name, tier, aliasOf, value, usages, orphan }) => ({
    name,
    tier,
    aliasOf,
    value,
    usages,
    orphan,
  }));

  const { counts } = declarationData;
  const dangling = danglingTokens();
  const decided = new Set(state.decisions.map((decision) => decision.from));

  // Ce qu'il reste : les tokens réellement consommés dont aucune déclaration n'est décidée.
  const toMigrate = rows.filter((row) => !row.orphan && !decided.has(row.name));

  /*
    Les tokens sémantiques redéfinissables, avec leur portée.

    Un `sys` ne se choisit pas comme un token de composant : il pointe vers une
    primitive, et c'est ce pointage qu'on redéfinit. Les candidats sont donc les
    primitives, pas tous les tokens.
  */
  const targets = targetTokens();
  const primitives = targets
    .filter((token) => token.tier === 'ref')
    .map((token) => ({
      name: token.name,
      tier: token.tier,
      group: token.group,
      display: token.display,
      value: token.value,
      accessibleValue: token.accessibleValue,
      sameValue: false,
      relevance: 0,
    }));

  const aliasIndex = targets.map((token) => ({ name: token.name, aliasOf: token.aliasOf }));

  const sysRows: SysRow[] = targets
    .filter((token) => token.tier === 'sys')
    .map((token) => {
      const radius = blastRadius(token.name, aliasIndex, usageCount);
      return {
        token: token.name,
        leaf: token.leaf,
        group: token.group,
        aliasOf: token.aliasOf,
        value: token.value,
        accessibleValue: token.accessibleValue,
        dependents: radius.dependents.length,
        callSites: radius.callSites,
        // Les primitives de même genre que la valeur actuelle : une couleur ne
        // remplace pas un espacement.
        primitives: primitives.filter((candidate) =>
          token.value && candidate.value
            ? /^#/.test(token.value) === /^#/.test(candidate.value)
            : true,
        ),
      };
    });

  return (
    <>
      <PageHeader
        eyebrow="Variables"
        title="Tokens"
        blurb="D’un côté la cible définie dans Figma, de l’autre l’existant à migrer."
      />

      <Tabs defaultValue="cible">
        <TabsList className="mb-5">
          <TabsTrigger value="cible" className="text-xs">
            Cible — Figma
            <span className="text-muted-foreground ml-1.5 tabular-nums">
              {figmaTokenData.counts.total}
            </span>
          </TabsTrigger>
          <TabsTrigger value="semantique" className="text-xs">
            Sémantiques — redéfinir
            <span className="text-muted-foreground ml-1.5 tabular-nums">{sysRows.length}</span>
          </TabsTrigger>
          <TabsTrigger value="existant" className="text-xs">
            Existant — à migrer
            <span className="text-muted-foreground ml-1.5 tabular-nums">{rows.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="semantique">
          <p className="text-muted-foreground mb-4 max-w-3xl text-xs leading-relaxed">
            Un token sémantique dit vers quelle primitive il pointe. Le redéfinir déplace d’un coup
            tout ce qui en dépend — la portée est affichée sur chaque ligne, avant de toucher quoi
            que ce soit. Rien n’est écrit dans le design system avant l’export.
          </p>
          <SysTokenEditor rows={sysRows} canWrite={getModeInfo().mode === 'local'} />
        </TabsContent>

        <TabsContent value="cible">
          <FigmaTokenReference tokens={targetTokens()} />
          <p className="text-muted-foreground mt-6 max-w-3xl text-xs leading-relaxed">
            Lu dans <span className="font-mono">{figmaTokenData.source.file}</span> via le MCP
            Figma. La valeur affichée est le token pointé, comme dans le panneau Variables — un
            token qui alias <span className="font-mono">Colors/Grey/grey-1000</span> se lit comme
            tel, pas comme sa couleur résolue.
          </p>
        </TabsContent>

        <TabsContent value="existant">
          <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="À migrer"
              value={toMigrate.length}
              detail="tokens consommés dont aucune déclaration n’est décidée"
              tone="caution"
            />
            <Stat
              label="Décidés"
              value={decided.size}
              detail={`${state.decisions.length} déclaration(s) au total`}
              tone={decided.size > 0 ? 'signal' : 'neutral'}
            />
            <Stat
              label="Orphelins"
              value={rows.filter((row) => row.orphan).length}
              detail="définis, jamais consommés — suppression sans revue visuelle"
            />
            <Stat
              label="Sans définition"
              value={dangling.length}
              detail="référencés par le code, définis nulle part"
            />
          </section>

          {dangling.length > 0 && (
            <section className="border-destructive/30 bg-destructive/5 mb-6 rounded-lg border p-4">
              <p className="text-sm font-medium">
                {dangling.length} token{dangling.length > 1 ? 's' : ''} référencé
                {dangling.length > 1 ? 's' : ''} mais défini{dangling.length > 1 ? 's' : ''} nulle
                part
              </p>
              <p className="text-muted-foreground mt-1 mb-2 text-xs">
                Ces règles tombent silencieusement dans le vide.
              </p>
              <ul className="space-y-0.5 font-mono text-xs">
                {dangling.map(({ token, usages, files }) => (
                  <li key={token}>
                    {token}{' '}
                    <span className="text-muted-foreground">
                      — {usages} usage(s) ·{' '}
                      {files
                        .slice(0, 2)
                        .map((f) => f.split('/').at(-1))
                        .join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <TokenTable rows={rows} />

          <p className="text-muted-foreground mt-4 text-xs">
            {counts.total.toLocaleString('fr-FR')} déclarations relevées dans{' '}
            {declarationData.source.scannedFiles} fichiers (
            <code className="font-mono">{declarationData.source.ref}</code> @{' '}
            <code className="font-mono">{declarationData.source.sha}</code>).
          </p>
        </TabsContent>
      </Tabs>
    </>
  );
}
