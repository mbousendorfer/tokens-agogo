import { PageHeader } from '@/components/page-header';
import { TokenTable } from '@/components/token-table';
import { danglingTokens, declarationData, tokenRows } from '@/lib/declarations';

export default function TokensPage() {
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

  // Deux dettes, qui ne se corrigent ni au même endroit ni au même prix.
  const definitionDebt = rows.filter((r) => r.tier === 'comp' && r.aliasOf?.startsWith('--ref-'));

  return (
    <>
      <PageHeader
        title="Tokens"
        blurb="Chaîne de résolution, valeur finale, et usages réels dans le code."
      />

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-5">
          <p className="text-sm font-medium">Dette de définition</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{definitionDebt.length}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            tokens de composant qui pointent vers une primitive au lieu d’un token sémantique. Se
            corrige <strong>en éditant des JSON</strong>, sans toucher un seul composant.
          </p>
        </div>
        <div className="rounded-lg border p-5">
          <p className="text-sm font-medium">Dette de call sites</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {counts.byTier.ref.toLocaleString('fr-FR')}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            usages de primitives brutes dans le code, sur {counts.uniqueByTier.ref} noms. Se corrige{' '}
            <strong>en éditant des feuilles de style</strong>, composant par composant.
          </p>
        </div>
      </section>

      {dangling.length > 0 && (
        <section className="border-destructive/30 bg-destructive/5 mb-8 rounded-lg border p-4">
          <p className="text-sm font-medium">
            {dangling.length} token{dangling.length > 1 ? 's' : ''} référencé
            {dangling.length > 1 ? 's' : ''} mais jamais défini
            {dangling.length > 1 ? 's' : ''}
          </p>
          <p className="text-muted-foreground mt-1 mb-2 text-xs">
            Ces règles tombent silencieusement dans le vide.
          </p>
          <ul className="space-y-1 font-mono text-xs">
            {dangling.map(({ token, usages, files }) => (
              <li key={token}>
                {token}{' '}
                <span className="text-muted-foreground">
                  — {usages} usage(s) ·{' '}
                  {files
                    .slice(0, 2)
                    .map((f) => f.split('/').slice(-1)[0])
                    .join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TokenTable rows={rows} />

      <p className="text-muted-foreground mt-4 text-xs">
        {declarationData.counts.total.toLocaleString('fr-FR')} déclarations relevées dans{' '}
        {declarationData.source.scannedFiles} fichiers (
        <code className="font-mono">{declarationData.source.ref}</code> @{' '}
        <code className="font-mono">{declarationData.source.sha}</code>).
      </p>
    </>
  );
}
