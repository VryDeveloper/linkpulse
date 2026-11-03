"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  accessUrl,
  listLocalLinks,
  onLocalLinksChange,
  removeLocalLink,
  shortUrlFor,
  type LocalLink,
} from "@/lib/local-links";
import { CopyButton } from "./copy-button";

type Status = "loading" | "ready" | "unsupported";

export function MyLinks() {
  const [links, setLinks] = useState<LocalLink[]>([]);
  const [clicks, setClicks] = useState<Record<string, number>>({});
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status>("loading");

  const load = useCallback(async () => {
    let local: LocalLink[];
    try {
      local = await listLocalLinks();
    } catch {
      setStatus("unsupported");
      return;
    }
    setLinks(local);
    setStatus("ready");
    if (local.length === 0) return;

    // Busca o total de cliques no servidor, provando a posse de cada link com a chave.
    try {
      const res = await fetch("/api/links/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: local.map(({ slug, token }) => ({ slug, token })) }),
      });
      if (!res.ok) return;
      const data: { links: { slug: string; clicks: number }[]; missing: string[] } = await res.json();
      setClicks(Object.fromEntries(data.links.map((l) => [l.slug, l.clicks])));
      setMissing(new Set(data.missing));
    } catch {
      // Sem rede: a lista local continua aparecendo, só sem os totais.
    }
  }, []);

  useEffect(() => {
    // load() só altera o estado depois de awaits (leitura do IndexedDB), não de forma síncrona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return onLocalLinksChange(load);
  }, [load]);

  async function remove(link: LocalLink, alsoDeleteOnServer: boolean) {
    const msg = alsoDeleteOnServer
      ? `Excluir /${link.slug} definitivamente? O link para de funcionar e todos os cliques são apagados.`
      : `Remover /${link.slug} da lista deste navegador?`;
    if (!confirm(msg)) return;
    if (alsoDeleteOnServer) {
      const res = await fetch(`/api/links/${encodeURIComponent(link.slug)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${link.token}` },
      });
      if (!res.ok && res.status !== 404) return alert("Não foi possível excluir. Tente de novo.");
    }
    await removeLocalLink(link.slug);
  }

  if (status === "loading") {
    return <div className="card h-40 animate-pulse" aria-busy />;
  }

  if (status === "unsupported") {
    return (
      <p className="card p-6 text-sm text-[var(--text-secondary)]">
        Este navegador bloqueou o armazenamento local, então não é possível guardar seus links aqui. Tente desativar o
        bloqueio de dados do site ou usar outro navegador.
      </p>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Meus links</h2>
        <p className="text-xs text-[var(--text-muted)]">Salvos apenas neste navegador</p>
      </div>

      {links.length === 0 ? (
        <p className="card p-8 text-center text-sm text-[var(--text-secondary)]">
          Você ainda não criou nenhum link neste navegador.
        </p>
      ) : (
        <ul className="card divide-y divide-[var(--border)] overflow-hidden">
          {links.map((link) => {
            const short = shortUrlFor(link.slug);
            const gone = missing.has(link.slug);
            return (
              <li key={link.slug} className={`flex flex-col gap-3 p-4 lg:flex-row lg:items-center ${gone ? "opacity-60" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={short} target="_blank" className="font-mono text-sm font-medium text-[var(--accent)]">
                      {short.replace(/^https?:\/\//, "")}
                    </a>
                    {link.preciseGeo && (
                      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">GPS</span>
                    )}
                    {gone && <span className="text-xs text-[#d03b3b]">não existe mais no servidor</span>}
                  </div>
                  {link.title && <p className="mt-0.5 text-sm">{link.title}</p>}
                  <p className="truncate text-xs text-[var(--text-muted)]">{link.url}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="mr-2 text-right">
                    <p className="text-lg font-semibold tabular-nums">{(clicks[link.slug] ?? 0).toLocaleString("pt-BR")}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">cliques</p>
                  </div>
                  {!gone && <CopyButton value={short} />}
                  {!gone && (
                    <CopyButton
                      value={accessUrl(window.location.origin, link)}
                      label="Link de acesso"
                      title="Abre o analytics deste link em outro aparelho. Guarde em segredo: quem tiver esse endereço vê os dados dos cliques."
                    />
                  )}
                  {!gone && (
                    <Link
                      href={`/links/${encodeURIComponent(link.slug)}`}
                      className="rounded-md bg-[var(--surface-2)] px-3 py-1 text-xs font-medium hover:bg-[var(--border)]"
                    >
                      Analytics →
                    </Link>
                  )}
                  <button
                    onClick={() => remove(link, !gone)}
                    className="rounded-md px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[#d03b3b]"
                    title={gone ? "Remover da lista" : "Excluir link"}
                  >
                    {gone ? "Remover" : "Excluir"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
