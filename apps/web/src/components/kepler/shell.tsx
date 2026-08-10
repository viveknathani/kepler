'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, ChevronDown, FileText, GitBranch, RefreshCw, Search, Sparkles, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  ['/reports', FileText, 'Reports'],
  ['/workflows', GitBranch, 'Workflows'],
  ['/runs', RefreshCw, 'Runs'],
  ['/profiles', UserRound, 'Profiles'],
  ['/agents', Bot, 'Agents'],
] as const;

export function KeplerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = nav.find(([href]) => pathname === href || pathname.startsWith(`${href}/`))?.[2] ?? 'Kepler';
  return <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
    <aside className="border-b border-border bg-black md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r">
      <div className="flex h-[72px] items-center gap-3 border-b px-5"><div className="size-6 rounded-full bg-[radial-gradient(circle_at_35%_35%,#55d66f,#238636_58%,#125824)] shadow-[0_0_18px_rgba(55,164,75,0.28)]" /><div className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">Kepler</span><span className="text-xs text-muted-foreground">Personal workspace</span></div><ChevronDown size={14} className="text-muted-foreground" /></div>
      <div className="p-3"><div className="flex h-10 items-center gap-2 rounded-md border bg-[#0a0a0a] px-3 text-muted-foreground"><Search size={15} /><span className="flex-1 text-sm">Find</span><kbd className="rounded border px-1.5 py-0.5 text-[10px]">F</kbd></div></div>
      <nav className="flex gap-1 overflow-auto px-3 md:flex-col">{nav.map(([href, Icon, label]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} prefetch={false} className={cn('flex h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition hover:bg-[#151515] hover:text-foreground', active && 'bg-[#1f1f1f] text-foreground')}><Icon size={16} strokeWidth={1.8} />{label}</Link>;
      })}</nav>
      <div className="mt-auto hidden border-t p-3 md:block"><div className="mb-3 rounded-lg border bg-[#0a0a0a] p-4"><div className="mb-2 flex items-center gap-2 text-sm font-medium"><Sparkles size={14} />Kepler agents</div><p className="text-xs leading-5 text-muted-foreground">Research that gets sharper with every signal.</p></div><div className="flex items-center gap-3 px-2 py-2"><div className="grid size-7 place-items-center rounded-full bg-[#262626] text-xs">V</div><span className="text-sm">viveknathani</span></div></div>
    </aside>
    <main className="min-w-0"><header className="grid h-[72px] grid-cols-[1fr_auto_1fr] items-center border-b bg-black px-5 md:px-8"><span /><p className="text-sm font-medium">{section}</p><div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground"><Sparkles size={15} />Agent</div></header><div className="p-5 md:p-8">{children}</div></main>
  </div>;
}
