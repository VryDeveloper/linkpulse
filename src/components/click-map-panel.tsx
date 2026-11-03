"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "@/lib/stats";
import type { MapFocus } from "./click-map";

// Leaflet acessa `window`, então o mapa só renderiza no cliente.
const ClickMap = dynamic(() => import("./click-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-[var(--text-muted)]">Carregando mapa…</div>,
});

export function ClickMapPanel({ points, focus, title = "Mapa de cliques" }: { points: MapPoint[]; focus?: MapFocus | null; title?: string }) {
  const hasGps = points.some((p) => p.precise);
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
        <h2 className="text-sm font-medium">{title}</h2>
        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-[var(--series-ip)]" /> Estimado por IP
          </span>
          {hasGps && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-[var(--series-gps)]" /> GPS (com consentimento)
            </span>
          )}
        </div>
      </div>
      <div className="relative z-0 mt-3 h-[380px]">
        {points.length === 0 ? (
          <p className="grid h-full place-items-center text-sm text-[var(--text-muted)]">Nenhum clique geolocalizado ainda.</p>
        ) : (
          <ClickMap points={points} focus={focus} />
        )}
      </div>
    </section>
  );
}
