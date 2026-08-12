'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, FileText, GitBranch, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  ['/reports', FileText, 'Reports'],
  ['/workflows', GitBranch, 'Workflows'],
  ['/profiles', UserRound, 'Profiles'],
  ['/agents', Bot, 'Agents'],
] as const;

const wordmark = {
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
} as const;

function KeplerWordmark() {
  return (
    <svg
      aria-label="Kepler"
      className="h-8 w-[174px] text-primary"
      role="img"
      viewBox="0 0 137 27"
    >
      {'KEPLER'
        .split('')
        .flatMap((letter, letterIndex) =>
          wordmark[letter as keyof typeof wordmark].flatMap((row, rowIndex) =>
            row
              .split('')
              .map((pixel, columnIndex) =>
                pixel === '1' ? (
                  <rect
                    key={`${letterIndex}-${rowIndex}-${columnIndex}`}
                    fill="currentColor"
                    height="3"
                    width="3"
                    x={letterIndex * 23 + columnIndex * 4}
                    y={rowIndex * 4}
                  />
                ) : null,
              ),
          ),
        )}
    </svg>
  );
}

export function KeplerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="border-b border-border bg-[#1a1c20] md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r">
        <div className="flex h-[72px] items-center justify-center border-b px-5">
          <KeplerWordmark />
        </div>
        <nav className="flex overflow-auto md:flex-col">
          {nav.map(([href, Icon, label]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className={cn(
                  'relative flex h-12 shrink-0 items-center gap-3 px-5 text-sm text-muted-foreground transition hover:bg-muted/70 hover:text-foreground md:border-b md:border-border',
                  active && 'bg-[#2a2d33] text-foreground',
                )}
              >
                <Icon size={16} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0">
        <div className="p-5 md:p-8">{children}</div>
      </main>
    </div>
  );
}
