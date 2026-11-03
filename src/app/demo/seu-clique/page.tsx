import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DEMO_SLUG } from "@/lib/demo";
import { deviceLabel, TIMEZONE } from "@/lib/stats";
import { Flag } from "@/components/flag";
import { RefreshUntil } from "@/components/refresh-until";

export const metadata: Metadata = { title: "Seu clique — LinkPulse", robots: { index: false } };

function Row({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-44 shrink-0 text-sm text-[var(--text-secondary)]">{label}</dt>
      <dd className="min-w-0 break-words">
        {value ?? <span className="text-[var(--text-muted)]">não identificado</span>}
        {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </dd>
    </div>
  );
}

export default async function YourClickPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const click = c
    ? await prisma.click.findFirst({ where: { id: c, link: { slug: DEMO_SLUG } } })
    : null;
  if (!click) redirect("/demo");

  const pending = click.geoSource === null;
  const place = [click.city, click.region].filter(Boolean).join(", ");
  const gps =
    click.preciseStatus === "granted"
      ? `Compartilhado (precisão de ±${Math.round(click.preciseAccuracy ?? 0)} m)`
      : click.preciseStatus === "denied"
        ? "Você preferiu não compartilhar"
        : click.preciseStatus
          ? "Indisponível no aparelho"
          : "Não solicitado";

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <RefreshUntil pending={pending} />

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">Clique registrado</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Isso é o que um link encurtado sabe sobre você.</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Tudo abaixo foi capturado no instante do clique, sem você preencher nada.
        </p>
      </div>

      <section className="card px-5 py-2">
        <dl className="divide-y divide-[var(--border)]">
          <Row
            label="Quando"
            value={click.createdAt.toLocaleString("pt-BR", { timeZone: click.timezone ?? TIMEZONE, dateStyle: "short", timeStyle: "medium" })}
            hint={click.timezone ? `No seu fuso: ${click.timezone}` : undefined}
          />
          <Row
            label="Onde"
            value={
              pending ? (
                <span className="text-[var(--text-muted)]">Localizando…</span>
              ) : click.country ? (
                <span className="inline-flex items-center gap-2">
                  <Flag code={click.countryCode} />
                  {place ? `${place} · ${click.country}` : click.country}
                </span>
              ) : null
            }
            hint={!pending ? "Estimado pelo IP: mostra onde a sua operadora conecta você à internet" : undefined}
          />
          <Row label="Endereço IP" value={click.ip && <span className="font-mono">{click.ip}</span>} hint="Na página pública ele aparece mascarado" />
          <Row label="Operadora / provedor" value={pending ? <span className="text-[var(--text-muted)]">Consultando…</span> : click.isp} />
          <Row label="GPS" value={gps} />
          <Row
            label="Aparelho"
            value={[deviceLabel(click.device), [click.deviceVendor, click.deviceModel].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
          />
          <Row label="Sistema" value={[click.os, click.osVersion].filter(Boolean).join(" ") || null} />
          <Row label="Navegador" value={[click.browser, click.browserVersion].filter(Boolean).join(" ") || null} />
          <Row label="Idioma" value={click.language} />
          <Row label="Veio de" value={click.referrerHost ?? "Acesso direto (QR code, app ou link digitado)"} />
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/demo" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
          Ver meu clique no mapa ao vivo →
        </Link>
        <a
          href="https://github.com/VryDeveloper/linkpulse"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
        >
          Ver o código no GitHub
        </a>
      </div>
    </main>
  );
}
