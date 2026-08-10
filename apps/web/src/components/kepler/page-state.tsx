import { Card, CardContent } from '@/components/ui/card';

export function PageState({ message, error = false }: { message: string; error?: boolean }) {
  return <Card className={error ? 'border-red-900/60 bg-red-950/20' : 'border-dashed'}><CardContent className={error ? 'py-5 text-sm text-red-300' : 'grid min-h-52 place-items-center text-sm text-muted-foreground'}>{message}</CardContent></Card>;
}
