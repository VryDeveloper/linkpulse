import type { Breakdown } from "@/lib/stats";
import { Flag } from "./flag";

/** Ranking horizontal: rótulo e valor em texto, a barra é só o reforço visual da magnitude. */
export function BarList({ title, items, total }: { title: string; items: Breakdown[]; total: number }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <section className="card p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Sem dados no período.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {items.map((item) => {
            const pct = total ? Math.round((item.count / total) * 100) : 0;
            return (
              <li
                key={item.label}
                className="group relative flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]"
                title={`${item.label}: ${item.count.toLocaleString("pt-BR")} cliques (${pct}%)`}
              >
                <span
                  aria-hidden
                  className="absolute inset-y-1 left-0 rounded-r-[4px] bg-[var(--series-ip)] opacity-[0.16] transition-opacity group-hover:opacity-25"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
                <span className="relative flex min-w-0 items-center gap-2">
                  <Flag code={item.countryCode} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="relative shrink-0 tabular-nums text-[var(--text-secondary)]">
                  {item.count.toLocaleString("pt-BR")} <span className="text-[var(--text-muted)]">· {pct}%</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
