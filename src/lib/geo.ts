import { isPrivateIp } from "./ip";

export type GeoSource = "edge-headers" | "ipwho.is" | "none";

export interface GeoResult {
  source: GeoSource;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const EMPTY_GEO: GeoResult = {
  source: "none",
  country: null,
  countryCode: null,
  region: null,
  city: null,
  latitude: null,
  longitude: null,
};

const regionNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });

export function countryName(code: string | null | undefined): string | null {
  if (!code || !/^[A-Z]{2}$/i.test(code)) return null;
  try {
    return regionNames.of(code.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}

function num(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function decode(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Provedor 1 — headers de geo injetados pela edge (custo zero, latência zero).
 * Vercel: x-vercel-ip-*  |  Cloudflare (Managed Transform "visitor location"): cf-ip*
 */
export function geoFromHeaders(headers: Headers): GeoResult | null {
  const countryCode = headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry");
  if (!countryCode || countryCode === "XX" || countryCode === "T1") return null;

  return {
    source: "edge-headers",
    countryCode: countryCode.toUpperCase(),
    country: countryName(countryCode),
    region: decode(headers.get("x-vercel-ip-country-region") ?? headers.get("cf-region")),
    city: decode(headers.get("x-vercel-ip-city") ?? headers.get("cf-ipcity")),
    latitude: num(headers.get("x-vercel-ip-latitude") ?? headers.get("cf-iplatitude")),
    longitude: num(headers.get("x-vercel-ip-longitude") ?? headers.get("cf-iplongitude")),
  };
}

interface IpWhoIsResponse {
  success: boolean;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

/** Provedor 2 — API pública de geolocalização por IP (fallback quando não há headers de edge). */
export async function geoFromApi(
  ip: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 2000,
): Promise<GeoResult | null> {
  if (isPrivateIp(ip)) return null;
  try {
    const res = await fetchImpl(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code,region,city,latitude,longitude`,
      { signal: AbortSignal.timeout(timeoutMs) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as IpWhoIsResponse;
    if (!data.success || !data.country_code) return null;
    return {
      source: "ipwho.is",
      countryCode: data.country_code.toUpperCase(),
      country: countryName(data.country_code) ?? data.country ?? null,
      region: data.region || null,
      city: data.city || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    };
  } catch {
    return null;
  }
}

/** Cadeia de provedores: tenta o mais barato primeiro e nunca lança erro. */
export async function lookupGeo(
  headers: Headers,
  ip: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<GeoResult> {
  const fromEdge = geoFromHeaders(headers);
  if (fromEdge) return fromEdge;
  if (ip) {
    const fromApi = await geoFromApi(ip, fetchImpl);
    if (fromApi) return fromApi;
  }
  return EMPTY_GEO;
}
