import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/slug";
import { createLinkSchema } from "@/lib/validation";

export async function GET() {
  const links = await prisma.link.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { clicks: { where: { isBot: false } } } } },
  });
  return NextResponse.json(
    links.map(({ _count, ...l }) => ({ ...l, clicks: _count.clicks })),
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const { url, slug: custom, title, preciseGeo } = parsed.data;

  // Slug customizado: tenta uma vez. Slug gerado: tenta de novo em caso de colisão.
  for (let attempt = 0; attempt < (custom ? 1 : 5); attempt++) {
    try {
      const link = await prisma.link.create({
        data: { url, slug: custom ?? generateSlug(), title: title || null, preciseGeo },
      });
      return NextResponse.json(link, { status: 201 });
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
