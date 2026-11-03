import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { getLinkStats, RANGES, type RangeKey } from "@/lib/stats";
import { StatTile } from "@/components/stat-tile";
import { BarList } from "@/components/bar-list";
import { ClicksChart } from "@/components/clicks-chart";
import { ClickMapPanel } from "@/components/click-map-panel";
import { CopyButton } from "@/components/copy-button";
import { RecentClicks } from "@/components/recent-clicks";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export default async function LinkAnalytics({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { slug } = await params;
  const { range: rawRange } = await searchParams;
  const range: RangeKey = rawRange && rawRange in RANGES ? (rawRange as RangeKey) : "30d";

  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link) notFound();

  const [stats, baseUrl] = await Promise.all([getLinkStats(link.id, range), getBaseUrl()]);
  const short = `${baseUrl}/${link.slug}`;
  const topCountry = stats.countries[0];

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)]">
        ← Todos os links
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-xl font-semibold">{short.replace(/^https?:\/\//, "")}</h1>
            <CopyButton value={short} />
          </div>
          {link.title && <p className="mt-1">{link.title}</p>}
          <p className="truncate text-sm text-[var(--text-muted)]">→ {link.url}</p>
        </div>
        <nav className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 text-sm" aria-label="Período">
          {(Object.keys(RANGES) as RangeKey[]).map((r) => (
            <Link
              key={r}
              href={`?range=${r}`}
              aria-current={r === range ? "page" : undefined}
              className={`rounded-md px-3 py-1 ${r === range ? "bg-[var(--surface-2)] font-medium" : "text-[var(--text-secondary)]"}`}
            >
              {RANGES[r]} dias
            </Link>
          ))}
        </nav>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Cliques" value={fmt(stats.total)} hint={stats.bots ? `+${fmt(stats.bots)} de bots/previews (excluídos)` : "humanos"} />
        <StatTile label="Visitantes únicos" value={fmt(stats.uniques)} hint="por IP pseudonimizado" />
        <StatTile
          label="País principal"
          value={topCountry ? topCountry.label : "—"}
          hint={topCountry && stats.total ? `${Math.round((topCountry.count / stats.total) * 100)}% dos cliques` : undefined}
        />
        <StatTile
          label="Localização por GPS"
          value={link.preciseGeo ? fmt(stats.preciseCount) : "Desligado"}
          hint={
            link.preciseGeo
              ? stats.total
                ? `${Math.round((stats.preciseCount / stats.total) * 100)}% aceitaram compartilhar`
                : "aguardando cliques"
              : "ative o modo preciso ao criar o link"
          }
        />
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-medium">Cliques por dia</h2>
        <div className="mt-3">
          <ClicksChart data={stats.timeseries} />
        </div>
      </section>

      <ClickMapPanel points={stats.points} />

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <BarList title="Países" items={stats.countries} total={stats.total} />
        <BarList title="Cidades" items={stats.cities} total={stats.total} />
        <BarList title="Origem (referrer)" items={stats.referrers} total={stats.total} />
        <BarList title="Dispositivos" items={stats.devices} total={stats.total} />
        <BarList title="Navegadores" items={stats.browsers} total={stats.total} />
        <BarList title="Sistemas operacionais" items={stats.oses} total={stats.total} />
      </section>

      <RecentClicks clicks={stats.recent} />
    </main>
  );
}
