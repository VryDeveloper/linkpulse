import { nanoid } from "nanoid";
import { prisma } from "./db";
import { lookupGeo } from "./geo";
import { getClientIp, hashIp, isPrivateIp } from "./ip";
import { parseReferrer, parseUserAgent } from "./user-agent";

/**
 * Fase síncrona do registro: grava o clique com o que já está nos headers (barato).
 * Retorna o id e o IP para a fase assíncrona de geolocalização.
 */
export async function createClick(linkId: string, headers: Headers) {
  let ip = getClientIp(headers);
  if (process.env.NODE_ENV !== "production" && process.env.GEO_DEV_IP && (!ip || isPrivateIp(ip))) {
    ip = process.env.GEO_DEV_IP;
  }

  const ua = headers.get("user-agent");
  const client = parseUserAgent(ua);
  const ref = parseReferrer(headers.get("referer"));
  const id = nanoid(16);

  await prisma.click.create({
    data: {
      id,
      linkId,
      ipHash: hashIp(ip),
      device: client.device,
      browser: client.browser,
      os: client.os,
      isBot: client.isBot,
      referrer: ref.referrer,
      referrerHost: ref.host,
      language: headers.get("accept-language")?.split(",")[0]?.trim().slice(0, 16) ?? null,
      userAgent: ua?.slice(0, 500) ?? null,
    },
  });

  return { id, ip };
}

/** Fase assíncrona: roda depois que o redirect já foi enviado (via `after()`). */
export async function enrichClickGeo(clickId: string, headers: Headers, ip: string | null) {
  const geo = await lookupGeo(headers, ip);
  await prisma.click.update({
    where: { id: clickId },
    data: {
      geoSource: geo.source,
      country: geo.country,
      countryCode: geo.countryCode,
      region: geo.region,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
    },
  });
}
