/**
 * Popula o banco com links e cliques de demonstração (dados sintéticos).
 * Uso: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import { createHash, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

const CITIES = [
  { city: "São Paulo", region: "São Paulo", cc: "BR", country: "Brasil", lat: -23.55, lng: -46.63, w: 30 },
  { city: "Rio de Janeiro", region: "Rio de Janeiro", cc: "BR", country: "Brasil", lat: -22.91, lng: -43.17, w: 16 },
  { city: "Belo Horizonte", region: "Minas Gerais", cc: "BR", country: "Brasil", lat: -19.92, lng: -43.94, w: 9 },
  { city: "Curitiba", region: "Paraná", cc: "BR", country: "Brasil", lat: -25.43, lng: -49.27, w: 7 },
  { city: "Porto Alegre", region: "Rio Grande do Sul", cc: "BR", country: "Brasil", lat: -30.03, lng: -51.23, w: 6 },
  { city: "Recife", region: "Pernambuco", cc: "BR", country: "Brasil", lat: -8.05, lng: -34.88, w: 6 },
  { city: "Salvador", region: "Bahia", cc: "BR", country: "Brasil", lat: -12.97, lng: -38.5, w: 5 },
  { city: "Fortaleza", region: "Ceará", cc: "BR", country: "Brasil", lat: -3.73, lng: -38.52, w: 5 },
  { city: "Brasília", region: "Distrito Federal", cc: "BR", country: "Brasil", lat: -15.79, lng: -47.88, w: 6 },
  { city: "Manaus", region: "Amazonas", cc: "BR", country: "Brasil", lat: -3.12, lng: -60.02, w: 3 },
  { city: "Lisboa", region: "Lisboa", cc: "PT", country: "Portugal", lat: 38.72, lng: -9.14, w: 4 },
  { city: "Porto", region: "Porto", cc: "PT", country: "Portugal", lat: 41.15, lng: -8.61, w: 2 },
  { city: "Buenos Aires", region: "Buenos Aires", cc: "AR", country: "Argentina", lat: -34.6, lng: -58.38, w: 2 },
  { city: "Miami", region: "Florida", cc: "US", country: "Estados Unidos", lat: 25.76, lng: -80.19, w: 2 },
  { city: "Nova York", region: "New York", cc: "US", country: "Estados Unidos", lat: 40.71, lng: -74.0, w: 2 },
  { city: "Londres", region: "England", cc: "GB", country: "Reino Unido", lat: 51.51, lng: -0.13, w: 1 },
  { city: "Tóquio", region: "Tokyo", cc: "JP", country: "Japão", lat: 35.68, lng: 139.69, w: 1 },
];

const CLIENTS = [
  { device: "mobile", deviceVendor: "Apple", deviceModel: "iPhone", browser: "Mobile Safari", browserVersion: "18.1", os: "iOS", osVersion: "18.1", w: 24 },
  { device: "mobile", deviceVendor: "Samsung", deviceModel: "SM-S918B", browser: "Samsung Internet", browserVersion: "26.0", os: "Android", osVersion: "14", w: 8 },
  { device: "mobile", deviceVendor: "Motorola", deviceModel: "moto g84 5G", browser: "Chrome", browserVersion: "130.0.0.0", os: "Android", osVersion: "14", w: 10 },
  { device: "mobile", deviceVendor: null, deviceModel: null, browser: "Chrome", browserVersion: "130.0.0.0", os: "Android", osVersion: "10", w: 18 },
  { device: "desktop", deviceVendor: null, deviceModel: null, browser: "Chrome", browserVersion: "130.0.0.0", os: "Windows", osVersion: "10", w: 20 },
  { device: "desktop", deviceVendor: null, deviceModel: null, browser: "Edge", browserVersion: "130.0.0.0", os: "Windows", osVersion: "10", w: 5 },
  { device: "desktop", deviceVendor: "Apple", deviceModel: "Macintosh", browser: "Safari", browserVersion: "18.1", os: "macOS", osVersion: "10.15.7", w: 8 },
  { device: "desktop", deviceVendor: null, deviceModel: null, browser: "Firefox", browserVersion: "132.0", os: "Linux", osVersion: null, w: 3 },
  { device: "tablet", deviceVendor: "Apple", deviceModel: "iPad", browser: "Mobile Safari", browserVersion: "18.1", os: "iOS", osVersion: "18.1", w: 3 },
];

const ISPS = [
  { isp: "Claro S.A.", asn: 28573, w: 25 },
  { isp: "Telefonica Brasil S.A (Vivo)", asn: 26599, w: 25 },
  { isp: "TIM S/A", asn: 26615, w: 15 },
  { isp: "Oi S.A.", asn: 7738, w: 8 },
  { isp: "Brisanet", asn: 28126, w: 5 },
  { isp: "Algar Telecom", asn: 16735, w: 4 },
];
const FOREIGN_ISP: Record<string, { isp: string; asn: number }> = {
  PT: { isp: "MEO", asn: 3243 },
  AR: { isp: "Telecom Argentina", asn: 7303 },
  US: { isp: "Comcast Cable", asn: 7922 },
  GB: { isp: "BT", asn: 2856 },
  JP: { isp: "NTT", asn: 4713 },
};
const TIMEZONES: Record<string, string> = {
  PT: "Europe/Lisbon",
  AR: "America/Argentina/Buenos_Aires",
  GB: "Europe/London",
  JP: "Asia/Tokyo",
};

const REFERRERS = [
  { host: "instagram.com", w: 22 },
  { host: "linkedin.com", w: 14 },
  { host: null, w: 30 },
  { host: "x.com", w: 7 },
  { host: "google.com", w: 9 },
  { host: "github.com", w: 6 },
  { host: "youtube.com", w: 5 },
];

function pick<T extends { w: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.w, 0);
  let r = Math.random() * total;
  for (const i of items) if ((r -= i.w) <= 0) return i;
  return items[items.length - 1];
}

const jitter = (v: number, amount: number) => v + (Math.random() - 0.5) * amount;

async function main() {
  await prisma.click.deleteMany();
  await prisma.link.deleteMany();

  // Cada link recebe uma chave de dono, como se tivesse sido criado pelo site.
  const tokens = new Map<string, string>();
  const owned = (slug: string) => {
    const token = randomBytes(24).toString("base64url");
    tokens.set(slug, token);
    return createHash("sha256").update(token).digest("hex");
  };

  const links = await Promise.all([
    prisma.link.create({
      data: { slug: "portfolio", url: "https://github.com/VryDeveloper", title: "Meu portfólio no GitHub", manageTokenHash: owned("portfolio") },
    }),
    prisma.link.create({
      data: {
        slug: "evento-tech",
        url: "https://example.com/meetup-novembro",
        title: "Meetup de tecnologia — inscrições",
        preciseGeo: true,
        manageTokenHash: owned("evento-tech"),
      },
    }),
    prisma.link.create({
      data: { slug: "curriculo", url: "https://example.com/curriculo.pdf", title: "Currículo (PDF)", manageTokenHash: owned("curriculo") },
    }),
  ]);

  const volumes = [900, 420, 160];
  const now = Date.now();

  for (const [i, link] of links.entries()) {
    // IPs fictícios das faixas reservadas para documentação (RFC 5737): não pertencem a ninguém.
    const visitors = Array.from({ length: Math.round(volumes[i] * 0.6) }, (_, v) => {
      const block = ["192.0.2", "198.51.100", "203.0.113"][v % 3];
      return `${block}.${(v * 7) % 254 + 1}`;
    });
    const data = Array.from({ length: volumes[i] }, () => {
      // Mais cliques nos dias recentes, com um pico ~10 dias atrás (simula uma divulgação).
      const daysAgo = Math.random() < 0.25 ? jitter(10, 3) : Math.pow(Math.random(), 1.6) * 89;
      const place = pick(CITIES);
      const client = pick(CLIENTS);
      const ref = pick(REFERRERS);
      const precise = link.preciseGeo && Math.random() < 0.55;
      const visitor = visitors[Math.floor(Math.random() * visitors.length)];
      const net = FOREIGN_ISP[place.cc] ?? pick(ISPS);
      const lat = jitter(place.lat, 0.12);
      const lng = jitter(place.lng, 0.12);
      return {
        id: nanoid(16),
        linkId: link.id,
        createdAt: new Date(now - Math.max(0, daysAgo) * 86_400_000),
        ip: visitor,
        ipHash: createHash("sha256").update(visitor).digest("hex").slice(0, 32),
        geoSource: "ipwho.is",
        country: place.country,
        countryCode: place.cc,
        region: place.region,
        city: place.city,
        latitude: place.lat,
        longitude: place.lng,
        postalCode: null,
        timezone: TIMEZONES[place.cc] ?? (place.cc === "US" ? (place.lng < -85 ? "America/Chicago" : "America/New_York") : "America/Sao_Paulo"),
        isp: net.isp,
        asn: net.asn,
        preciseStatus: link.preciseGeo ? (precise ? "granted" : "denied") : null,
        preciseLatitude: precise ? lat : null,
        preciseLongitude: precise ? lng : null,
        preciseAccuracy: precise ? Math.round(8 + Math.random() * 60) : null,
        device: client.device,
        deviceVendor: client.deviceVendor,
        deviceModel: client.deviceModel,
        browser: client.browser,
        browserVersion: client.browserVersion,
        os: client.os,
        osVersion: client.osVersion,
        referrerHost: ref.host,
        referrer: ref.host ? `https://${ref.host}/` : null,
        language: place.cc === "BR" ? "pt-BR" : place.cc === "PT" ? "pt-PT" : "en-US",
        isBot: false,
      };
    });
    // Alguns previews de bots (WhatsApp, Slack) para mostrar o filtro funcionando.
    for (let b = 0; b < Math.round(volumes[i] * 0.05); b++) {
      data.push({
        ...data[b],
        id: nanoid(16),
        device: "bot",
        browser: null as unknown as string,
        os: null as unknown as string,
        isBot: true,
      });
    }
    await prisma.click.createMany({ data });
  }

  const base = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  console.log(`Seed concluído: ${links.length} links.`);
  console.log("Abra os links de acesso abaixo para adicioná-los aos \"Meus links\" do seu navegador:");
  for (const [slug, token] of tokens) console.log(`  ${base}/links/${slug}#chave=${token}`);
}

main().finally(() => prisma.$disconnect());
