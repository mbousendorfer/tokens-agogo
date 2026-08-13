'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex min-w-0 items-center gap-0.5" aria-label="Vues">
      {NAV.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            title={item.blurb}
            className={cn(
              'relative rounded-md px-2.5 py-1 text-[13px] whitespace-nowrap transition-colors',
              active
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            {/* Le repère de position : un trait, comme sur une graduation. */}
            {active && (
              <span className="bg-signal absolute inset-x-2.5 -bottom-[7px] h-[2px] rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
