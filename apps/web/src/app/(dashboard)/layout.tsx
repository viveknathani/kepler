import { KeplerShell } from '@/components/kepler/shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <KeplerShell>{children}</KeplerShell>;
}
