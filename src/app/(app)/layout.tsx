import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { AppNav } from '@/components/app-nav';
import { ModeBadge } from '@/components/mode-badge';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background flex min-h-full flex-col">
        <header className="bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-6 px-6">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Tokens à gogo
            </Link>
            <AppNav />
            <div className="ml-auto">
              <ModeBadge />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
