"use client";

import { useCallback, useRef, useState } from "react";

type Status = "idle" | "asking" | "redirecting";

const GEO_TIMEOUT_MS = 10_000;

export function PreciseLocationGate({
  clickId,
  destination,
  destinationHost,
}: {
  clickId: string;
  destination: string;
  destinationHost: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const done = useRef(false);

  const finish = useCallback(
    async (payload: Record<string, unknown>) => {
      if (done.current) return;
      done.current = true;
      setStatus("redirecting");
      try {
        await fetch(`/api/clicks/${clickId}/precise`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } finally {
        window.location.replace(destination);
      }
    },
    [clickId, destination],
  );

  const share = () => {
    if (!("geolocation" in navigator)) return finish({ status: "unavailable" });
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        finish({
          status: "granted",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) =>
        finish({
          status: err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : "unavailable",
        }),
      { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: 60_000 },
    );
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
      <p className="text-sm text-[var(--text-secondary)]">Você está indo para</p>
      <p className="mt-1 break-all text-lg font-semibold">{destinationHost}</p>

      <p className="mt-5 text-sm leading-relaxed text-[var(--text-secondary)]">
        O autor deste link pede sua localização para estatísticas de alcance. É opcional: as coordenadas ficam
        associadas apenas a este clique, sem nome nem endereço de IP.
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={share}
          disabled={status !== "idle"}
          className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {status === "asking" ? "Aguardando permissão…" : "Compartilhar localização"}
        </button>
        <button
          onClick={() => finish({ status: "denied" })}
          disabled={status === "redirecting"}
          className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          Continuar sem compartilhar
        </button>
      </div>

      {status === "redirecting" && (
        <p className="mt-4 text-center text-sm text-[var(--text-secondary)]" role="status">
          Redirecionando…
        </p>
      )}
    </div>
  );
}
