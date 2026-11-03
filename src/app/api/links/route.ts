import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getClientIp, hashIp } from "@/lib/ip";
import { generateManageToken, hashToken, publicLink } from "@/lib/ownership";
import { generateSlug } from "@/lib/slug";
import { createLinkSchema } from "@/lib/validation";

/** Máximo de links criados por IP por hora (evita uso do encurtador para spam). */
const MAX_LINKS_PER_HOUR = 30;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const { url, slug: custom, title, preciseGeo } = parsed.data;

  // Encurtar um link do próprio encurtador criaria redirecionamentos em cadeia.
  if (new URL(url).host === new URL(req.url).host) {
    return NextResponse.json({ error: "Esse link já é do LinkPulse" }, { status: 400 });
  }

  const creatorIpHash = hashIp(getClientIp(req.headers));
  const recent = await prisma.link.count({
    where: { creatorIpHash, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= MAX_LINKS_PER_HOUR) {
    return NextResponse.json({ error: "Muitos links criados em pouco tempo. Tente de novo em alguns minutos." }, { status: 429 });
  }

  const manageToken = generateManageToken();

  // Slug customizado: tenta uma vez. Slug gerado: tenta de novo em caso de colisão.
  for (let attempt = 0; attempt < (custom ? 1 : 5); attempt++) {
    try {
      const link = await prisma.link.create({
        data: {
          url,
          slug: custom ?? generateSlug(),
          title: title || null,
          preciseGeo,
          manageTokenHash: hashToken(manageToken),
          creatorIpHash,
        },
      });
      // A chave só é devolvida aqui, uma única vez. O servidor guarda apenas o hash.
      return NextResponse.json({ ...publicLink(link), manageToken }, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        if (custom) return NextResponse.json({ error: "Esse alias já está em uso" }, { status: 409 });
        continue;
      }
      throw err;
    }
  }
  return NextResponse.json({ error: "Não foi possível gerar um slug único" }, { status: 500 });
}
