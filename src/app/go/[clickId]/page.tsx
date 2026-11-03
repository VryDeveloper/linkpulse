import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { destinationFor } from "@/lib/demo";
import { PreciseLocationGate } from "./precise-location-gate";

export default async function GoPage({ params }: { params: Promise<{ clickId: string }> }) {
  const { clickId } = await params;
  const click = await prisma.click.findUnique({
    where: { id: clickId },
    select: { preciseStatus: true, link: { select: { url: true, slug: true } } },
  });
  if (!click) notFound();

  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const destination = destinationFor(click.link, clickId, base);
  if (click.preciseStatus) redirect(destination);

  const host = new URL(destination).hostname;

  return (
    <main className="min-h-dvh grid place-items-center p-4">
      <PreciseLocationGate clickId={clickId} destination={destination} destinationHost={host} />
    </main>
  );
}
