import Link from "next/link";
import { CreateLinkForm } from "@/components/create-link-form";
import { MyLinks } from "@/components/my-links";

export default async function Home({ searchParams }: { searchParams: Promise<{ notFound?: string }> }) {
  const { notFound } = await searchParams;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Encurte um link e veja quem clicou</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Grátis e sem cadastro. Seus links ficam guardados neste navegador, e cada clique registra país, cidade,
          operadora, aparelho e horário.{" "}
          <Link href="/demo" className="text-[var(--accent)] hover:underline">
            Ver a demo ao vivo →
          </Link>
        </p>
      </section>

      {notFound && (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
          O link <code className="font-mono">/{notFound}</code> não existe.
        </p>
      )}

      <CreateLinkForm />
      <MyLinks />
    </main>
  );
}
