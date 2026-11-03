export function PageSkeleton() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-8" aria-busy>
      <div className="h-7 w-48 animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="h-28 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
      <div className="h-64 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
    </main>
  );
}
