import { createHash } from "node:crypto";

/** Extrai o IP do cliente respeitando os proxies mais comuns (Vercel, Cloudflare, Nginx). */
export function getClientIp(headers: Headers): string | null {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const c of candidates) {
    const ip = c?.trim();
    if (ip) return ip.replace(/^::ffff:/, "");
  }
  return null;
}

/** IPs de loopback, redes privadas (RFC 1918), link-local e ULA não têm geolocalização. */
export function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip === "localhost") return true;
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127) // CGNAT
    );
  }
  const lower = ip.toLowerCase();
  return lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

/** Pseudonimiza o IP: permite contar visitantes únicos sem guardar o dado pessoal. */
export function hashIp(ip: string | null, salt = process.env.IP_HASH_SALT ?? ""): string {
  return createHash("sha256")
    .update(`${salt}:${ip ?? "unknown"}`)
    .digest("hex")
    .slice(0, 32);
}
