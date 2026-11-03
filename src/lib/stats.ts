import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { countryName } from "./geo";

export const TIMEZONE = process.env.APP_TIMEZONE ?? "America/Sao_Paulo";
export const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;
export type RangeKey = keyof typeof RANGES;

export interface Breakdown {
  label: string;
  count: number;
  /** Quando presente, a UI mostra a bandeira do país ao lado do rótulo. */
  countryCode?: string | null;
}

export interface MapPoint {
  lat: number;
  lng: number;
  count: number;
  label: string;
  precise: boolean;
  accuracy: number | null;
}

/** Converte um Date para 'YYYY-MM-DD' no fuso do dashboard. */
export function dayKey(date: Date, timeZone = TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Preenche os dias sem clique com zero, para o gráfico não "pular" datas. */
export function fillDays(rows: { day: string; count: number }[], days: number, now = new Date()): Breakdown[] {
  const map = new Map(rows.map((r) => [r.day, r.count]));
  const out: Breakdown[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(new Date(now.getTime() - i * 86_400_000));
    out.push({ label: key, count: map.get(key) ?? 0 });
  }
  return out;
}

/**
 * Agrupa pontos próximos (grade de ~1 km) para o mapa não renderizar milhares de marcadores.
 * Cliques com GPS e por IP ficam em grupos separados porque têm significados diferentes.
 */
export function clusterPoints(
  rows: { lat: number; lng: number; precise: boolean; accuracy: number | null; label: string }[],
): MapPoint[] {
  const groups = new Map<string, MapPoint>();
  for (const r of rows) {
    const key = `${r.precise ? "p" : "i"}:${r.lat.toFixed(2)}:${r.lng.toFixed(2)}`;
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { lat: r.lat, lng: r.lng, count: 1, label: r.label, precise: r.precise, accuracy: r.accuracy });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

async function breakdown(
  field: "countryCode" | "city" | "browser" | "os" | "device" | "referrerHost",
  where: Prisma.ClickWhereInput,
  take = 8,
) {
  const rows = await prisma.click.groupBy({
    by: [field],
    where,
    _count: { _all: true },
    orderBy: { _count: { [field]: "desc" } },
    take,
  });
  return rows.map((r) => ({ key: r[field] as string | null, count: r._count._all }));
}

export async function getLinkStats(linkId: string, range: RangeKey) {
  const days = RANGES[range];
  const since = new Date(Date.now() - days * 86_400_000);
  const where: Prisma.ClickWhereInput = { linkId, isBot: false, createdAt: { gte: since } };

  const [total, bots, uniques, preciseCount, perDay, countries, cities, browsers, oses, devices, referrers, geoRows, recent] =
    await Promise.all([
      prisma.click.count({ where }),
      prisma.click.count({ where: { linkId, isBot: true, createdAt: { gte: since } } }),
      prisma.click.groupBy({ by: ["ipHash"], where }).then((r) => r.length),
      prisma.click.count({ where: { ...where, preciseStatus: "granted" } }),
      prisma.$queryRaw<{ day: string; count: number }[]>`
        SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TIMEZONE}), 'YYYY-MM-DD') AS day,
               COUNT(*)::int AS count
        FROM "Click"
        WHERE "linkId" = ${linkId} AND "isBot" = false AND "createdAt" >= ${since}
        GROUP BY 1`,
      breakdown("countryCode", where),
      prisma.click.groupBy({
        by: ["city", "countryCode"],
        where: { ...where, city: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { city: "desc" } },
        take: 8,
      }),
      breakdown("browser", where),
      breakdown("os", where),
      breakdown("device", where),
      breakdown("referrerHost", where),
      prisma.click.findMany({
        where: { ...where, OR: [{ latitude: { not: null } }, { preciseLatitude: { not: null } }] },
        select: {
          latitude: true,
          longitude: true,
          preciseLatitude: true,
          preciseLongitude: true,
          preciseAccuracy: true,
          city: true,
          country: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
      prisma.click.findMany({
        where: { linkId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ]);

  const label = (k: string | null, fallback: string) => k ?? fallback;

  return {
    days,
    total,
    bots,
    uniques,
    preciseCount,
    timeseries: fillDays(perDay, days),
    countries: countries.map((c) => ({
      label: c.key ? (countryName(c.key) ?? c.key) : "Desconhecido",
      countryCode: c.key,
      count: c.count,
    })),
    cities: cities.map((c) => ({
      label: c.city ?? "Desconhecida",
      countryCode: c.countryCode,
      count: c._count._all,
    })),
    browsers: browsers.map((b) => ({ label: label(b.key, "Outro"), count: b.count })),
    oses: oses.map((o) => ({ label: label(o.key, "Outro"), count: o.count })),
    devices: devices.map((d) => ({ label: deviceLabel(d.key), count: d.count })),
    referrers: referrers.map((r) => ({ label: label(r.key, "Acesso direto"), count: r.count })),
    points: clusterPoints(
      geoRows.map((r) => {
        const precise = r.preciseLatitude !== null && r.preciseLongitude !== null;
        return {
          lat: (precise ? r.preciseLatitude : r.latitude)!,
          lng: (precise ? r.preciseLongitude : r.longitude)!,
          precise,
          accuracy: precise ? r.preciseAccuracy : null,
          label: [r.city, r.country].filter(Boolean).join(", ") || "Local desconhecido",
        };
      }),
    ),
    recent,
  };
}

export type LinkStats = Awaited<ReturnType<typeof getLinkStats>>;

export function deviceLabel(device: string | null): string {
  const labels: Record<string, string> = {
    desktop: "Desktop",
    mobile: "Celular",
    tablet: "Tablet",
    smarttv: "Smart TV",
    console: "Console",
    wearable: "Wearable",
  };
  return device ? (labels[device] ?? device) : "Desconhecido";
}
