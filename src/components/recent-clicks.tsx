import type { Click } from "@prisma/client";
import { deviceLabel, TIMEZONE } from "@/lib/stats-shared";

/** Clique como chega pela API (datas viram texto no JSON). */
export type ClickJSON = Omit<Click, "createdAt"> & { createdAt: string };
import { Flag } from "./flag";

const dateTime = (d: Date | string, timeZone: string) =>
  new Date(d).toLocaleString("pt-BR", { timeZone, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

function localTimeOfVisitor(c: ClickJSON): string | null {
  if (!c.timezone || c.timezone === TIMEZONE) return null;
  try {
    return `${dateTime(c.createdAt, c.timezone)} (${c.timezone})`;
  } catch {
    return null;
  }
}

const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" ");

function deviceSummary(c: ClickJSON): string {
  if (c.isBot) return "Bot / preview";
  const hardware = join(c.deviceVendor, c.deviceModel);
  return [deviceLabel(c.device), hardware || join(c.os, c.osVersion)].filter(Boolean).join(" · ");
}

const GEO_SOURCES: Record<string, string> = {
  "edge-headers": "Headers da edge (Vercel/Cloudflare)",
  "ipwho.is": "API ipwho.is",
  "edge-headers+ipwho.is": "Edge + ipwho.is",
  none: "Não foi possível localizar",
};

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
      <dt className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children ?? "—"}</dd>
    </div>
  );
}

function ClickDetails({ c }: { c: ClickJSON }) {
  const coords = c.latitude !== null && c.longitude !== null ? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}` : null;
  const gps =
    c.preciseLatitude !== null && c.preciseLongitude !== null
      ? `${c.preciseLatitude.toFixed(6)}, ${c.preciseLongitude.toFixed(6)}`
      : null;

  return (
    <div className="space-y-5 border-t border-[var(--border)] bg-[var(--bg)] px-4 py-4">
      <section>
        <h3 className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Quando</h3>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Data e hora (Brasília)">{dateTime(c.createdAt, TIMEZONE)}</Field>
          <Field label="Hora local de quem clicou">{localTimeOfVisitor(c) ?? (c.timezone ? "Mesmo fuso" : null)}</Field>
          <Field label="UTC">{new Date(c.createdAt).toISOString().replace("T", " ").slice(0, 19)}</Field>
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Rede</h3>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Endereço IP">{c.ip && <span className="font-mono">{c.ip}</span>}</Field>
          <Field label="Provedor de internet">{c.isp}</Field>
          <Field label="ASN">{c.asn && <span className="font-mono">AS{c.asn}</span>}</Field>
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Localização</h3>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="País">
            {c.country && (
              <span className="inline-flex items-center gap-1.5">
                <Flag code={c.countryCode} /> {c.country}
              </span>
            )}
          </Field>
          <Field label="Estado / região">{c.region}</Field>
          <Field label="Cidade">{c.city}</Field>
          <Field label="CEP">{c.postalCode}</Field>
          <Field label="Fuso horário">{c.timezone}</Field>
          <Field label="Coordenadas (aprox. pelo IP)">
            {coords && (
              <a
                className="font-mono text-[var(--accent)] hover:underline"
                href={`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=11/${c.latitude}/${c.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                {coords}
              </a>
            )}
          </Field>
          <Field label="Fonte da localização">{c.geoSource ? (GEO_SOURCES[c.geoSource] ?? c.geoSource) : "Processando…"}</Field>
          <Field label="GPS (com consentimento)">
            {gps ? (
              <a
                className="font-mono text-[var(--accent)] hover:underline"
                href={`https://www.openstreetmap.org/?mlat=${c.preciseLatitude}&mlon=${c.preciseLongitude}#map=17/${c.preciseLatitude}/${c.preciseLongitude}`}
                target="_blank"
                rel="noreferrer"
              >
                {gps} (±{Math.round(c.preciseAccuracy ?? 0)} m)
              </a>
            ) : c.preciseStatus === "denied" ? (
              "Recusado pelo visitante"
            ) : c.preciseStatus === "timeout" || c.preciseStatus === "unavailable" ? (
              "Indisponível no aparelho"
            ) : (
              "Não solicitado"
            )}
          </Field>
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Dispositivo</h3>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Tipo">{c.isBot ? "Bot / preview de link" : deviceLabel(c.device)}</Field>
          <Field label="Fabricante e modelo">{join(c.deviceVendor, c.deviceModel) || null}</Field>
          <Field label="Sistema operacional">{join(c.os, c.osVersion) || null}</Field>
          <Field label="Navegador">{join(c.browser, c.browserVersion) || null}</Field>
          <Field label="Idioma">{c.language}</Field>
          <Field label="Origem (referrer)">{c.referrer ?? "Acesso direto (sem referrer)"}</Field>
          <Field label="User agent" wide>
            <span className="font-mono text-xs text-[var(--text-secondary)]">{c.userAgent}</span>
          </Field>
        </dl>
      </section>
    </div>
  );
}

export function RecentClicks({ clicks }: { clicks: ClickJSON[] }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-baseline justify-between px-4 pt-4">
        <h2 className="text-sm font-medium">Últimos cliques</h2>
        <p className="text-xs text-[var(--text-muted)]">Clique em uma linha para ver todos os dados</p>
      </div>

      <div className="mt-3 hidden grid-cols-[150px_1.4fr_130px_1.2fr_110px_16px] gap-3 border-y border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-xs text-[var(--text-secondary)] md:grid">
        <span>Quando</span>
        <span>Local</span>
        <span>IP</span>
        <span>Dispositivo</span>
        <span>Origem</span>
        <span />
      </div>

      {clicks.length === 0 && <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">Nenhum clique no período.</p>}

      <ul className="divide-y divide-[var(--border)] max-md:mt-3 max-md:border-t max-md:border-[var(--border)]">
        {clicks.map((c) => (
          <li key={c.id}>
            <details className="group">
              <summary
                className={`grid cursor-pointer list-none gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm hover:bg-[var(--surface-2)] md:grid-cols-[150px_1.4fr_130px_1.2fr_110px_16px] md:items-center [&::-webkit-details-marker]:hidden ${c.isBot ? "text-[var(--text-muted)]" : ""}`}
              >
                <span className="tabular-nums">{dateTime(c.createdAt, TIMEZONE)}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <Flag code={c.countryCode} />
                  <span className="truncate">{[c.city, c.region, c.country].filter(Boolean).join(", ") || (c.geoSource ? "Não localizado" : "Localizando…")}</span>
                </span>
                <span className="truncate font-mono text-xs text-[var(--text-secondary)]">{c.ip ?? "—"}</span>
                <span className="truncate">{deviceSummary(c)}</span>
                <span className="truncate text-[var(--text-secondary)]">{c.referrerHost ?? "Direto"}</span>
                <span aria-hidden className="text-[var(--text-muted)] transition-transform group-open:rotate-90 max-md:hidden">
                  ›
                </span>
              </summary>
              <ClickDetails c={c} />
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
