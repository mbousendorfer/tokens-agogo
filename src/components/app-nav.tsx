'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Vues">
      {NAV.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            title={item.blurb}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              active
                ? 'bg-secondary text-secondary-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
