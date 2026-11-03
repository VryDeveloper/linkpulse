import Link from "next/link";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { CreateLinkForm } from "@/components/create-link-form";
import { CopyButton } from "@/components/copy-button";

export default async function Home({ searchParams }: { searchParams: Promise<{ notFound?: string }> }) {
  const { notFound } = await searchParams;
  const baseUrl = await getBaseUrl();
  const links = await prisma.link.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { clicks: { where: { isBot: false } } } } },
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Seus links</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Encurte uma URL e acompanhe cada clique: país, cidade, dispositivo, navegador e origem.
        </p>
      </section>

      {notFound && (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
          O link <code className="font-mono">/{notFound}</code> não existe.
        </p>
      )}

      <CreateLinkForm baseUrl={baseUrl} />

      <section className="card overflow-hidden">
        {links.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--text-secondary)]">Nenhum link ainda. Crie o primeiro acima.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {links.map((link) => {
              const short = `${baseUrl}/${link.slug}`;
              return (
                <li key={link.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <a href={short} target="_blank" className="font-mono text-sm font-medium text-[var(--accent)]">
                        {short.replace(/^https?:\/\//, "")}
                      </a>
                      {link.preciseGeo && (
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                          GPS
                        </span>
                      )}
                    </div>
                    {link.title && <p className="mt-0.5 text-sm">{link.title}</p>}
                    <p className="truncate text-xs text-[var(--text-muted)]">{link.url}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums">{link._count.clicks.toLocaleString("pt-BR")}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">cliques</p>
                    </div>
                    <CopyButton value={short} />
                    <Link
                      href={`/links/${link.slug}`}
                      className="rounded-md bg-[var(--surface-2)] px-3 py-1 text-xs font-medium hover:bg-[var(--border)]"
                    >
                      Analytics →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
