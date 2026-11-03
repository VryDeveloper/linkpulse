import { isPrivateIp } from "./ip";

export type GeoSource = "edge-headers" | "ipwho.is" | "edge-headers+ipwho.is" | "none";

export interface GeoResult {
  source: GeoSource;
  /** IP público resolvido pelo provedor (útil quando o servidor só vê um IP local). */
  ip: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  postalCode: string | null;
  timezone: string | null;
  isp: string | null;
  asn: number | null;
}

export const EMPTY_GEO: GeoResult = {
  source: "none",
  ip: null,
  country: null,
  countryCode: null,
  region: null,
  city: null,
  latitude: null,
  longitude: null,
  postalCode: null,
  timezone: null,
  isp: null,
  asn: null,
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
 * Provedor 1: headers de geo injetados pela edge (custo zero, latência zero).
 * Vercel: x-vercel-ip-*  |  Cloudflare (Managed Transform "visitor location"): cf-ip*
 */
export function geoFromHeaders(headers: Headers): GeoResult | null {
  const countryCode = headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry");
  if (!countryCode || countryCode === "XX" || countryCode === "T1") return null;

  return {
    ...EMPTY_GEO,
    source: "edge-headers",
    countryCode: countryCode.toUpperCase(),
    country: countryName(countryCode),
    region: decode(headers.get("x-vercel-ip-country-region") ?? headers.get("cf-region")),
    city: decode(headers.get("x-vercel-ip-city") ?? headers.get("cf-ipcity")),
    latitude: num(headers.get("x-vercel-ip-latitude") ?? headers.get("cf-iplatitude")),
    longitude: num(headers.get("x-vercel-ip-longitude") ?? headers.get("cf-iplongitude")),
    postalCode: headers.get("x-vercel-ip-postal-code") ?? headers.get("cf-postal-code"),
    timezone: headers.get("x-vercel-ip-timezone") ?? headers.get("cf-timezone"),
  };
}

interface IpWhoIsResponse {
  success: boolean;
  ip?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  postal?: string;
  connection?: { asn?: number; org?: string; isp?: string };
  timezone?: { id?: string };
}

/**
 * Provedor 2: API pública de geolocalização por IP (localização + provedor de internet).
 * Com `ip = null`, consulta o IP público de quem faz a requisição (usado em desenvolvimento,
 * quando o servidor roda na mesma máquina de quem clica).
 */
export async function geoFromApi(
  ip: string | null,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 2500,
): Promise<GeoResult | null> {
  if (ip && isPrivateIp(ip)) return null;
  try {
    const res = await fetchImpl(`https://ipwho.is/${ip ? encodeURIComponent(ip) : ""}?lang=pt-BR`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as IpWhoIsResponse;
    if (!data.success || !data.country_code) return null;
    return {
      source: "ipwho.is",
      ip: data.ip ?? ip,
      countryCode: data.country_code.toUpperCase(),
      country: countryName(data.country_code) ?? data.country ?? null,
      region: data.region || null,
      city: data.city || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      postalCode: data.postal || null,
      timezone: data.timezone?.id || null,
      isp: data.connection?.isp || data.connection?.org || null,
      asn: data.connection?.asn ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Combina os provedores: a localização dos headers da edge tem prioridade (é a mais confiável),
 * e a API completa o que falta (provedor de internet, CEP, fuso). Nunca lança erro.
 *
 * `ip = null` significa "descubra o IP público desta máquina" (modo desenvolvimento).
 */
export async function lookupGeo(
  headers: Headers,
  ip: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<GeoResult> {
  const edge = geoFromHeaders(headers);
  const api = await geoFromApi(ip, fetchImpl);

  if (edge && api) {
    const merged: GeoResult = { ...api, source: "edge-headers+ipwho.is" };
    for (const [key, value] of Object.entries(edge) as [keyof GeoResult, GeoResult[keyof GeoResult]][]) {
      if (key !== "source" && value !== null) (merged as unknown as Record<string, unknown>)[key] = value;
    }
    return merged;
  }
  return edge ?? api ?? { ...EMPTY_GEO, ip };
}
