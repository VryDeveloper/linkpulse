"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLocalLink, saveLocalLink, shortUrlFor, type LocalLink } from "@/lib/local-links";
import { RANGES, type Breakdown, type MapPoint, type RangeKey } from "@/lib/stats-shared";
import { BarList } from "./bar-list";
import { ClickMapPanel } from "./click-map-panel";
import { ClicksChart } from "./clicks-chart";
import { CopyButton } from "./copy-button";
import { RecentClicks, type ClickJSON } from "./recent-clicks";
import { StatTile } from "./stat-tile";

interface StatsResponse {
  link: Omit<LocalLink, "token">;
  stats: {
    total: number;
    bots: number;
    uniques: number;
    preciseCount: number;
    timeseries: Breakdown[];
    countries: Breakdown[];
    cities: Breakdown[];
    browsers: Breakdown[];
    oses: Breakdown[];
    devices: Breakdown[];
    referrers: Breakdown[];
    points: MapPoint[];
    recent: ClickJSON[];
  };
}

type State =
  | { kind: "loading" }
  | { kind: "no-access"; reason: "missing" | "invalid" }
  | { kind: "ready"; data: StatsResponse };

const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Lê a chave do link: do fragmento #chave=… (link de acesso) ou do IndexedDB deste navegador. */
async function resolveToken(slug: string): Promise<{ token: string | null; fromUrl: boolean }> {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const fromHash = hash.get("chave");
  if (fromHash) {
    // Tira a chave da barra de endereço (não fica no histórico nem em prints de tela).
    history.replaceState(null, "", window.location.pathname + window.location.search);
    return { token: fromHash, fromUrl: true };
  }
  try {
    const local = await getLocalLink(slug);
    return { token: local?.token ?? null, fromUrl: false };
  } catch {
    return { token: null, fromUrl: false };
  }
}

export function LinkAnalytics({ slug }: { slug: string }) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<State>({ kind: "loading" });

  // 1. Descobre a chave (uma vez).
  useEffect(() => {
    let cancelled = false;
    resolveToken(slug).then(async ({ token, fromUrl }) => {
      if (cancelled) return;
      if (!token) return setState({ kind: "no-access", reason: "missing" });
      // Veio por link de acesso: valida e salva neste navegador para as próximas visitas.
      if (fromUrl) {
        const res = await fetch(`/api/links/${encodeURIComponent(slug)}/stats?range=7d`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return setState({ kind: "no-access", reason: "invalid" });
        const { link } = (await res.json()) as StatsResponse;
        await saveLocalLink({ ...link, token }).catch(() => {});
      }
      setToken(token);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // 2. Busca o analytics sempre que o período muda.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/links/${encodeURIComponent(slug)}/stats?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return setState({ kind: "no-access", reason: "invalid" });
        setState({ kind: "ready", data: (await res.json()) as StatsResponse });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug, token, range]);

  if (state.kind === "loading") {
    return <div className="card h-64 animate-pulse" aria-busy />;
  }

  if (state.kind === "no-access") {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">Sem acesso a este link neste navegador</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
          {state.reason === "invalid"
            ? "A chave de acesso não confere ou o link foi excluído."
            : "Os links ficam salvos no navegador onde foram criados. Para ver em outro aparelho, use o “Link de acesso” na lista de links do navegador original."}
        </p>
        <Link href="/" className="mt-5 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
          Criar um link
        </Link>
      </div>
    );
  }

  const { link, stats } = state.data;
  const short = shortUrlFor(link.slug);
  const topCountry = stats.countries[0];

  return (
    <div className="space-y-5">
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
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={r === range}
              className={`rounded-md px-3 py-1 ${r === range ? "bg-[var(--surface-2)] font-medium" : "text-[var(--text-secondary)]"}`}
            >
              {RANGES[r]} dias
            </button>
          ))}
        </nav>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Cliques" value={fmt(stats.total)} hint={stats.bots ? `+${fmt(stats.bots)} de bots/previews (excluídos)` : "humanos"} />
        <StatTile label="Visitantes únicos" value={fmt(stats.uniques)} hint="por endereço IP" />
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
    </div>
  );
}
