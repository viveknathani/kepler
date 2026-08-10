export function PageHeading({ title, description }: { title: string; description: string }) {
  return <div className="mb-6"><h1 className="text-xl font-medium tracking-[-0.02em]">{title}</h1><p className="mt-1.5 text-sm text-muted-foreground">{description}</p></div>;
}
