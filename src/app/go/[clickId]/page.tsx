import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PreciseLocationGate } from "./precise-location-gate";

export default async function GoPage({ params }: { params: Promise<{ clickId: string }> }) {
  const { clickId } = await params;
  const click = await prisma.click.findUnique({
    where: { id: clickId },
    select: { preciseStatus: true, link: { select: { url: true } } },
  });
  if (!click) notFound();
  if (click.preciseStatus) redirect(click.link.url);

  let host = click.link.url;
  try {
    host = new URL(click.link.url).hostname;
  } catch {}

  return (
    <main className="min-h-dvh grid place-items-center p-4">
      <PreciseLocationGate clickId={clickId} destination={click.link.url} destinationHost={host} />
    </main>
  );
}
