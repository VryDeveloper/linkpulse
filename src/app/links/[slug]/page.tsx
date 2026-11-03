import type { Metadata } from "next";
import Link from "next/link";
import { LinkAnalytics } from "@/components/link-analytics";

export const metadata: Metadata = { title: "Analytics — LinkPulse", robots: { index: false } };

// A página é só a "casca": os dados são buscados no navegador com a chave guardada no IndexedDB.
export default async function LinkAnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)]">
        ← Meus links
      </Link>
      <LinkAnalytics slug={decodeURIComponent(slug)} />
    </main>
  );
}
