import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bearerToken, getOwnedLink } from "@/lib/ownership";

/** Exclui o link e todos os cliques dele. Só quem tem a chave pode excluir. */
export async function DELETE(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const link = await getOwnedLink(slug, bearerToken(req.headers));
  if (!link) return NextResponse.json({ error: "Link não encontrado" }, { status: 404 });
  await prisma.link.delete({ where: { id: link.id } });
  return new NextResponse(null, { status: 204 });
}
