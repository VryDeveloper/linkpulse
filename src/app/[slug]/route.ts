import { after, NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createClick, enrichClickGeo } from "@/lib/clicks";
import { isPrefetch } from "@/lib/user-agent";
import { destinationFor } from "@/lib/demo";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const link = await prisma.link.findUnique({ where: { slug }, select: { id: true, slug: true, url: true, preciseGeo: true } });

  if (!link) {
    return NextResponse.redirect(new URL(`/?notFound=${encodeURIComponent(slug)}`, req.url), 302);
  }

  const headers = new Headers(req.headers);
  let target = destinationFor(link, null, req.url);

  // Pré-carregamento do navegador: redireciona sem contar (o clique real vem depois).
  if (isPrefetch(headers)) {
    return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const click = await createClick(link.id, headers);
    // Geolocalização por IP acontece depois da resposta: o usuário não espera pela API de geo.
    after(() => enrichClickGeo(click.id, headers, click.ip, click.lookupSelf).catch((err) => console.error("geo enrich failed", err)));

    target = link.preciseGeo
      ? new URL(`/go/${click.id}`, req.url).toString()
      : destinationFor(link, click.id, req.url);
  } catch (err) {
    // Analytics nunca pode quebrar o redirecionamento.
    console.error("click tracking failed", err);
  }

  // 302 (e não 301) para o navegador não cachear o redirect e cada clique chegar ao servidor.
  return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": "no-store" } });
}
