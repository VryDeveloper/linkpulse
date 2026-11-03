import type { Metadata } from "next";
import QRCode from "qrcode";
import { getBaseUrl } from "@/lib/base-url";
import { DEMO_SLUG, getDemoLink, getDemoSnapshot } from "@/lib/demo";
import { CopyButton } from "@/components/copy-button";
import { LiveDemo } from "@/components/live-demo";

export const metadata: Metadata = {
  title: "Demo ao vivo — LinkPulse",
  description: "Abra o link no celular e veja seu clique aparecer no mapa em tempo real.",
};

export default async function DemoPage() {
  const [link, baseUrl] = await Promise.all([getDemoLink(), getBaseUrl()]);
  const shortUrl = `${baseUrl}/${DEMO_SLUG}`;
  const [snapshot, qrSvg] = await Promise.all([
    getDemoSnapshot(link.id),
    // QR sempre preto no branco: leitores de câmera falham com QR invertido no modo escuro.
    QRCode.toString(shortUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b0b0b", light: "#ffffff" } }),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">Demo ao vivo</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Clique e veja de onde você clicou.</h1>
          <p className="mt-3 max-w-xl text-[var(--text-secondary)]">
            Escaneie o QR code ou abra o link no celular (ou mande para um amigo). Em poucos segundos seu clique aparece no mapa abaixo, com
            cidade, operadora e aparelho. Se você permitir, o GPS dá a precisão de metros.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={shortUrl}
              target="_blank"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 font-mono text-sm font-medium text-white"
            >
              {shortUrl.replace(/^https?:\/\//, "")}
            </a>
            <CopyButton value={shortUrl} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 max-sm:hidden">
          <div
            className="size-44 rounded-xl bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
            role="img"
            aria-label={`QR code para ${shortUrl}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <span className="text-xs text-[var(--text-muted)]">Aponte a câmera do celular</span>
        </div>
      </section>

      <LiveDemo initial={snapshot} />

      <section className="card grid gap-4 p-6 text-sm text-[var(--text-secondary)] md:grid-cols-3">
        <div>
          <h2 className="font-medium text-[var(--text)]">1. Redirect instantâneo</h2>
          <p className="mt-1">
            O clique é gravado e você é redirecionado na hora. A geolocalização por IP roda depois da resposta, com{" "}
            <code className="font-mono text-xs">after()</code> do Next.js.
          </p>
        </div>
        <div>
          <h2 className="font-medium text-[var(--text)]">2. Geo em camadas</h2>
          <p className="mt-1">
            Headers da edge (Vercel) dão cidade e coordenadas. Uma API de IP completa a operadora. O GPS só entra com o
            seu consentimento.
          </p>
        </div>
        <div>
          <h2 className="font-medium text-[var(--text)]">3. Privacidade</h2>
          <p className="mt-1">
            Nesta página pública o IP aparece mascarado e as coordenadas são arredondadas para ~1 km. Bots e previews
            de link ficam fora das métricas.
          </p>
        </div>
      </section>
    </main>
  );
}
