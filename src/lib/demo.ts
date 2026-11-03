import type { Click, Link } from "@prisma/client";
import { prisma } from "./db";
import { clusterPoints, deviceLabel, type MapPoint } from "./stats";

export const DEMO_SLUG = process.env.DEMO_SLUG || "ao-vivo";
/** Destino do link de demo: a página que mostra ao visitante o que foi capturado do clique dele. */
export const DEMO_THANKS_PATH = "/demo/seu-clique";

/** Busca o link de demonstração, criando-o na primeira visita (assim o deploy não depende de seed). */
export async function getDemoLink(): Promise<Link> {
  return prisma.link.upsert({
    where: { slug: DEMO_SLUG },
    update: {},
    create: {
      slug: DEMO_SLUG,
      url: DEMO_THANKS_PATH,
      title: "Demo ao vivo do LinkPulse",
      preciseGeo: true,
    },
  });
}

/**
 * URL final de um clique. Links internos (começando com "/") são resolvidos no próprio domínio,
 * e o link de demo recebe o id do clique para a página "seu clique" saber o que mostrar.
 */
export function destinationFor(link: Pick<Link, "url" | "slug">, clickId: string | null, base: string): string {
  const url = new URL(link.url, base);
  if (link.slug === DEMO_SLUG && clickId) url.searchParams.set("c", clickId);
  return url.toString();
}

/** Mascara o IP para exibição pública: 177.37.120.5 → 177.37.x.x | 2804:14c:65::1 → 2804:14c:x:x… */
export function maskIp(ip: string | null): string | null {
  if (!ip) return null;
  const v4 = ip.split(".");
  if (v4.length === 4) return `${v4[0]}.${v4[1]}.x.x`;
  const v6 = ip.split(":").filter(Boolean);
  if (v6.length >= 2) return `${v6[0]}:${v6[1]}:x:x…`;
  return "x.x.x.x";
}

/** Dados de um clique que podem aparecer numa página pública (sem IP completo, UA ou GPS exato). */
export interface PublicClick {
  id: string;
  createdAt: string;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  isp: string | null;
  /** Coordenadas arredondadas para ~1 km. */
  lat: number | null;
  lng: number | null;
  precise: boolean;
  device: string;
  hardware: string | null;
  os: string | null;
  browser: string | null;
  referrerHost: string | null;
  located: boolean;
}

const round2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);

export function toPublicClick(c: Click): PublicClick {
  const precise = c.preciseLatitude !== null && c.preciseLongitude !== null;
  return {
    id: c.id,
    createdAt: c.createdAt.toISOString(),
    ip: maskIp(c.ip),
    city: c.city,
    region: c.region,
    country: c.country,
    countryCode: c.countryCode,
    isp: c.isp,
    lat: round2(precise ? c.preciseLatitude : c.latitude),
    lng: round2(precise ? c.preciseLongitude : c.longitude),
    precise,
    device: deviceLabel(c.device),
    hardware: [c.deviceVendor, c.deviceModel].filter(Boolean).join(" ") || null,
    os: [c.os, c.osVersion].filter(Boolean).join(" ") || null,
    browser: c.browser,
    referrerHost: c.referrerHost,
    located: c.geoSource !== null,
  };
}

/** Cliques humanos recentes do link de demo, já mascarados. */
export async function getDemoClicks(linkId: string, opts: { since?: Date; take?: number } = {}) {
  const clicks = await prisma.click.findMany({
    where: { linkId, isBot: false, ...(opts.since ? { createdAt: { gt: opts.since } } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 30,
  });
  return clicks.map(toPublicClick);
}

export interface DemoSnapshot {
  total: number;
  countries: number;
  cities: number;
  precise: number;
  points: MapPoint[];
  clicks: PublicClick[];
  generatedAt: string;
}

/** Tudo o que a página pública precisa, num formato seguro para enviar ao navegador. */
export async function getDemoSnapshot(linkId: string): Promise<DemoSnapshot> {
  const where = { linkId, isBot: false };
  const [total, countries, cities, precise, geoRows, clicks] = await Promise.all([
    prisma.click.count({ where }),
    prisma.click.groupBy({ by: ["countryCode"], where: { ...where, countryCode: { not: null } } }).then((r) => r.length),
    prisma.click.groupBy({ by: ["city", "countryCode"], where: { ...where, city: { not: null } } }).then((r) => r.length),
    prisma.click.count({ where: { ...where, preciseStatus: "granted" } }),
    prisma.click.findMany({
      where: { ...where, OR: [{ latitude: { not: null } }, { preciseLatitude: { not: null } }] },
      select: { latitude: true, longitude: true, preciseLatitude: true, preciseLongitude: true, city: true, country: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    getDemoClicks(linkId, { take: 20 }),
  ]);

  return {
    total,
    countries,
    cities,
    precise,
    // Coordenadas arredondadas (~1 km) e sem raio de precisão: o GPS exato não sai do servidor.
    points: clusterPoints(
      geoRows.map((r) => {
        const isPrecise = r.preciseLatitude !== null && r.preciseLongitude !== null;
        return {
          lat: round2(isPrecise ? r.preciseLatitude : r.latitude)!,
          lng: round2(isPrecise ? r.preciseLongitude : r.longitude)!,
          precise: isPrecise,
          accuracy: null,
          label: [r.city, r.country].filter(Boolean).join(", ") || "Local desconhecido",
        };
      }),
    ),
    clicks,
    generatedAt: new Date().toISOString(),
  };
}
