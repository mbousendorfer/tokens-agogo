import type { Metadata } from 'next';
import { Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import Link from 'next/link';
import { AppNav } from '@/components/app-nav';
import { ModeBadge } from '@/components/mode-badge';
import { cookies } from 'next/headers';
import { ThemeToggle, type Theme } from '@/components/theme-toggle';
import '../globals.css';

/** La voix : titres et chiffres-clés. Variable, avec un axe optique. */
const display = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  display: 'swap',
});

/** Le texte d'interface : précis, chaleureux, lisible en petit. */
const sans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

/**
 * La vraie typographie de travail de cette app : les noms de tokens sont partout,
 * en tableau. Plex Mono est étroit et tient la colonne sans se déformer.
 */
const mono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tokens à gogo',
  description: 'Cockpit de migration des design tokens du Design System Agorapulse.',
};

/**
 * Layout racine de l'app, stylé par Tailwind et shadcn.
 *
 * Le CSS du design system n'entre JAMAIS ici : il émet des sélecteurs de balises
 * globaux qui entrent en collision avec le preflight Tailwind. Il vit uniquement
 * dans l'iframe de `/preview`, qui a son propre layout racine nu (ADR 005).
 *
 * D'où les deux route groups `(app)` et `(preview)` : chacun porte son propre
 * `<html>`, sans quoi le layout de preview serait imbriqué dans celui-ci.
 */
export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Le thème vient du cookie : le serveur rend directement la bonne classe, donc ni
  // flash au chargement, ni script de rattrapage, ni divergence d'hydratation.
  const theme = ((await cookies()).get('theme')?.value as Theme) || 'dark';
  const dark = theme !== 'light';

  return (
    <html
      lang="fr"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full${dark ? 'dark' : ''}`}
      style={{ colorScheme: dark ? 'dark' : 'light' }}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col antialiased">
        <header className="bg-background/85 sticky top-0 z-20 backdrop-blur-md">
          <div className="mx-auto flex h-12 w-full max-w-[1600px] items-center gap-5 px-5">
            <Link href="/" className="group flex shrink-0 items-baseline gap-1.5">
              <span className="font-display text-[15px] leading-none font-semibold tracking-tight">
                Tokens
              </span>
              <span className="text-signal font-mono text-[11px] leading-none">à&nbsp;gogo</span>
            </Link>

            <span className="bg-hairline h-4 w-px shrink-0" aria-hidden />

            {/* La nav défile plutôt que de passer sous le badge quand la place manque. */}
            <div className="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto">
              <AppNav />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden md:block">
                <ModeBadge />
              </span>
              <ThemeToggle initial={theme} />
            </div>
          </div>
          <div className="bg-hairline h-px w-full" aria-hidden />
        </header>

        <main className="relative z-[1] mx-auto w-full max-w-[1600px] flex-1 px-5 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
