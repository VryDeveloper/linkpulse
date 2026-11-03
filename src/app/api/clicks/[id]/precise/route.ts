import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { preciseLocationSchema } from "@/lib/validation";

const WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = preciseLocationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  // Só aceita a localização uma vez, em uma janela curta após o clique e em links com modo preciso.
  const click = await prisma.click.findUnique({
    where: { id },
    select: { createdAt: true, preciseStatus: true, link: { select: { preciseGeo: true } } },
  });
  if (!click || !click.link.preciseGeo) return NextResponse.json({ error: "Clique não encontrado" }, { status: 404 });
  if (click.preciseStatus || Date.now() - click.createdAt.getTime() > WINDOW_MS) {
    return NextResponse.json({ error: "Clique já registrado" }, { status: 409 });
  }

  const data = parsed.data;
  await prisma.click.update({
    where: { id },
    data:
      data.status === "granted"
        ? {
            preciseStatus: "granted",
            preciseLatitude: data.latitude,
            preciseLongitude: data.longitude,
            preciseAccuracy: data.accuracy,
          }
        : { preciseStatus: data.status },
  });

  return new NextResponse(null, { status: 204 });
}
