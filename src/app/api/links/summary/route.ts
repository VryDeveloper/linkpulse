import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { publicLink, tokenMatches } from "@/lib/ownership";

const bodySchema = z.object({
  links: z.array(z.object({ slug: z.string().max(64), token: z.string().max(128) })).max(500),
});

/**
 * Recebe os links guardados no navegador (slug + chave) e devolve os dados atualizados e o total
 * de cliques de cada um. Links com chave inválida ou excluídos voltam em `missing`.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const tokens = new Map(parsed.data.links.map((l) => [l.slug, l.token]));
  const rows = await prisma.link.findMany({
    where: { slug: { in: [...tokens.keys()] } },
    include: { _count: { select: { clicks: { where: { isBot: false } } } } },
  });

  const owned = rows.filter((l) => tokenMatches(tokens.get(l.slug), l.manageTokenHash));
  const found = new Set(owned.map((l) => l.slug));

  return NextResponse.json({
    links: owned.map((l) => ({ ...publicLink(l), clicks: l._count.clicks })),
    missing: [...tokens.keys()].filter((s) => !found.has(s)),
  });
}
