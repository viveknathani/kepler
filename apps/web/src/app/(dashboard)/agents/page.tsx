import { Bot } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeading } from '@/components/kepler/page-heading';

export default function AgentsPage() {
  const names = ['github-scanner', 'paper-scanner', 'analyst', 'judge', 'curator', 'reporter'];
  return <><PageHeading title="Agents" description="Installed technical capabilities. User taste comes from profiles." /><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{names.map((name) => <Card key={name}><CardHeader><div className="mb-3 grid size-9 place-items-center rounded-sm border border-primary/20 bg-primary/10 text-primary"><Bot size={17} /></div><CardTitle className="text-base">{name}</CardTitle><CardDescription>Built-in · version 1</CardDescription></CardHeader></Card>)}</div></>;
}
