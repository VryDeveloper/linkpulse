import { NextResponse } from "next/server";
import { getDemoLink, getDemoSnapshot } from "@/lib/demo";

/** Endpoint público consultado pela página /demo a cada poucos segundos (polling). */
export async function GET() {
  const link = await getDemoLink();
  const snapshot = await getDemoSnapshot(link.id);
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
