"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyButton } from "./copy-button";

export function CreateLinkForm({ baseUrl }: { baseUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError(null);
    setCreated(null);
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: data.get("url"),
        slug: data.get("slug") || undefined,
        title: data.get("title") || undefined,
        preciseGeo: data.get("preciseGeo") === "on",
      }),
    });
    setPending(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError(json.error ?? "Erro ao criar link");
    setCreated(`${baseUrl}/${json.slug}`);
    form.reset();
    router.refresh();
  }

  const input =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

  return (
    <form onSubmit={onSubmit} className="card p-5">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_200px_auto]">
        <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
          URL de destino
          <input name="url" type="url" required placeholder="https://exemplo.com/um-link-bem-comprido" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
          Alias (opcional)
          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg)] pl-3 focus-within:border-[var(--accent)]">
            <span className="text-sm text-[var(--text-muted)]">/</span>
            <input name="slug" placeholder="meu-link" pattern="[a-zA-Z0-9_\-]{3,32}" className="w-full bg-transparent px-1 py-2 text-sm outline-none" />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
          Título (opcional)
          <input name="title" maxLength={120} placeholder="Campanha de novembro" className={input} />
        </label>
        <button
          disabled={pending}
          className="self-end rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Encurtando…" : "Encurtar"}
        </button>
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm text-[var(--text-secondary)]">
        <input type="checkbox" name="preciseGeo" className="mt-0.5 accent-[var(--accent)]" />
        <span>
          <strong className="font-medium text-[var(--text)]">Modo localização precisa</strong> — mostra uma página
          antes do redirecionamento pedindo permissão de GPS. Sem ele, a localização é estimada pelo IP (nível de
          cidade).
        </span>
      </label>
      {error && <p className="mt-3 text-sm text-[#d03b3b]" role="alert">{error}</p>}
      {created && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
          <span className="text-[var(--text-secondary)]">Link criado:</span>
          <a href={created} target="_blank" className="font-mono font-medium text-[var(--accent)]">{created}</a>
          <CopyButton value={created} />
        </div>
      )}
    </form>
  );
}
