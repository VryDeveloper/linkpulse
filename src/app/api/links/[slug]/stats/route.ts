import { NextResponse } from "next/server";
import { bearerToken, getOwnedLink, publicLink } from "@/lib/ownership";
import { getLinkStats, RANGES, type RangeKey } from "@/lib/stats";

/** Analytics completo de um link (inclui IPs). Exige a chave do dono. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const link = await getOwnedLink(slug, bearerToken(req.headers));
  if (!link) return NextResponse.json({ error: "Link não encontrado ou sem acesso" }, { status: 404 });

  const rawRange = new URL(req.url).searchParams.get("range");
  const range: RangeKey = rawRange && rawRange in RANGES ? (rawRange as RangeKey) : "30d";
  const stats = await getLinkStats(link.id, range);

  return NextResponse.json({ link: publicLink(link), stats }, { headers: { "Cache-Control": "no-store" } });
}
