import { nanoid } from "nanoid";
import { prisma } from "./db";
import { lookupGeo } from "./geo";
import { getClientIp, hashIp, isPrivateIp } from "./ip";
import { parseReferrer, parseUserAgent } from "./user-agent";

/**
 * Resolve qual IP consultar na geolocalização.
 * Em desenvolvimento, quem clica está na mesma máquina do servidor, então o IP chega como
 * 127.0.0.1/::1. Nesse caso retornamos `null`, que significa "descubra o IP público desta
 * máquina" (ou usamos GEO_DEV_IP, se definido, para simular outro local).
 */
function resolveIp(headers: Headers): { ip: string | null; lookupSelf: boolean } {
  const ip = getClientIp(headers);
  if (ip && !isPrivateIp(ip)) return { ip, lookupSelf: false };
  if (process.env.NODE_ENV !== "production") {
    if (process.env.GEO_DEV_IP) return { ip: process.env.GEO_DEV_IP, lookupSelf: false };
    return { ip: null, lookupSelf: true };
  }
  return { ip, lookupSelf: false };
}

/**
 * Fase síncrona do registro: grava o clique com o que já está nos headers (barato).
 * Retorna o id e o IP para a fase assíncrona de geolocalização.
 */
export async function createClick(linkId: string, headers: Headers) {
  const { ip, lookupSelf } = resolveIp(headers);

  const ua = headers.get("user-agent");
  const client = parseUserAgent(ua);
  const ref = parseReferrer(headers.get("referer"));
  const id = nanoid(16);

  await prisma.click.create({
    data: {
      id,
      linkId,
      ip,
      ipHash: hashIp(ip),
      ...client,
      referrer: ref.referrer,
      referrerHost: ref.host,
      language: headers.get("accept-language")?.split(",")[0]?.trim().slice(0, 16) ?? null,
      userAgent: ua?.slice(0, 500) ?? null,
    },
  });

  return { id, ip, lookupSelf };
}

/** Fase assíncrona: roda depois que o redirect já foi enviado (via `after()`). */
export async function enrichClickGeo(clickId: string, headers: Headers, ip: string | null, lookupSelf = false) {
  if (!ip && !lookupSelf) return;
  const geo = await lookupGeo(headers, ip);
  // No modo "descobrir meu IP", o IP real só é conhecido agora: atualiza IP e hash.
  const resolvedIp = lookupSelf && geo.ip ? geo.ip : null;

  await prisma.click.update({
    where: { id: clickId },
    data: {
      ...(resolvedIp ? { ip: resolvedIp, ipHash: hashIp(resolvedIp) } : {}),
      geoSource: geo.source,
      country: geo.country,
      countryCode: geo.countryCode,
      region: geo.region,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
      postalCode: geo.postalCode,
      timezone: geo.timezone,
      isp: geo.isp,
      asn: geo.asn,
    },
  });
}
