"use client";

import { useEffect, useMemo, useState } from "react";
import type { DemoSnapshot, PublicClick } from "@/lib/demo";
import type { MapFocus } from "./click-map";
import { ClickMapPanel } from "./click-map-panel";
import { Flag } from "./flag";
import { StatTile } from "./stat-tile";

const POLL_MS = 4000;
const fmt = (n: number) => n.toLocaleString("pt-BR");

function timeAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 10) return "agora";
  if (s < 60) return `há ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Faz polling do snapshot público enquanto a aba estiver visível. */
function useLiveSnapshot(initial: DemoSnapshot) {
  const [snapshot, setSnapshot] = useState(initial);
  const [lastUpdate, setLastUpdate] = useState(() => Date.now());
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    async function tick() {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/demo", { cache: "no-store" });
          if (!res.ok) throw new Error(String(res.status));
          const next = (await res.json()) as DemoSnapshot;
          if (cancelled) return;
          setSnapshot(next);
          setLastUpdate(Date.now());
          setOnline(true);
        } catch {
          if (!cancelled) setOnline(false);
        }
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    }

    timer = setTimeout(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return { snapshot, lastUpdate, online };
}

/** Relógio que avança a cada segundo para os textos "há Xs". */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function ClickRow({ c, isNew, now }: { c: PublicClick; isNew: boolean; now: number }) {
  const place = [c.city, c.region, c.country].filter(Boolean).join(", ");
  return (
    <li className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 ${isNew ? "row-new" : ""}`}>
      <span className="w-20 shrink-0 text-xs tabular-nums text-[var(--text-muted)]">{timeAgo(c.createdAt, now)}</span>
      <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <Flag code={c.countryCode} />
        <span className="truncate">{place || (c.located ? "Local não identificado" : "Localizando…")}</span>
        {c.precise && (
          <span className="shrink-0 rounded-full border border-[var(--border)] px-1.5 py-px text-[10px] text-[var(--text-secondary)]">
            GPS
          </span>
        )}
      </span>
      <span className="truncate text-sm text-[var(--text-secondary)] sm:w-56">
        {[c.device, c.hardware ?? c.os].filter(Boolean).join(" · ")}
      </span>
      <span className="truncate text-xs text-[var(--text-muted)] sm:w-40">
        {[c.isp, c.ip].filter(Boolean).join(" · ") || "—"}
      </span>
    </li>
  );
}

export function LiveDemo({ initial }: { initial: DemoSnapshot }) {
  const { snapshot, lastUpdate, online } = useLiveSnapshot(initial);
  const now = useNow();

  // Ids já vistos quando a página abriu: o que aparecer depois é "novo" e ganha destaque.
  const [seenAtLoad] = useState(() => new Set(initial.clicks.map((c) => c.id)));
  const newest = snapshot.clicks[0];
  const newestIsNew = newest && !seenAtLoad.has(newest.id);

  const focus: MapFocus | null = useMemo(
    () =>
      newestIsNew && newest.lat !== null && newest.lng !== null
        ? { key: `${newest.id}-${newest.lat}`, lat: newest.lat, lng: newest.lng }
        : null,
    [newestIsNew, newest],
  );

  const secondsSince = Math.max(0, Math.round((now - lastUpdate) / 1000));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]" role="status" aria-live="polite">
        <span
          aria-hidden
          className={`inline-block size-2 rounded-full ${online ? "live-dot bg-[#1baf7a]" : "bg-[var(--text-muted)]"}`}
        />
        {online ? <>Ao vivo · atualizado {secondsSince < 2 ? "agora" : `há ${secondsSince}s`}</> : "Reconectando…"}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Cliques" value={fmt(snapshot.total)} hint="humanos (bots e previews excluídos)" />
        <StatTile label="Países" value={fmt(snapshot.countries)} />
        <StatTile label="Cidades" value={fmt(snapshot.cities)} />
        <StatTile
          label="Compartilharam GPS"
          value={fmt(snapshot.precise)}
          hint={snapshot.total ? `${Math.round((snapshot.precise / snapshot.total) * 100)}% dos cliques` : undefined}
        />
      </section>

      <ClickMapPanel points={snapshot.points} focus={focus} title="Onde clicaram" />

      <section className="card overflow-hidden">
        <div className="flex items-baseline justify-between px-4 pt-4">
          <h2 className="text-sm font-medium">Cliques recentes</h2>
          <p className="text-xs text-[var(--text-muted)]">IPs mascarados nesta página pública</p>
        </div>
        {snapshot.clicks.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
            Nenhum clique ainda. Seja o primeiro: escaneie o QR code acima.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {snapshot.clicks.map((c) => (
              <ClickRow key={c.id} c={c} now={now} isNew={!seenAtLoad.has(c.id)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
