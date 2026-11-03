import { UAParser } from "ua-parser-js";

export interface ClientInfo {
  device: string;
  deviceVendor: string | null;
  deviceModel: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  isBot: boolean;
}

// Crawlers e geradores de preview (WhatsApp, Slack, Telegram…) “clicam” no link ao gerar o card.
const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|embedly|curl|wget|python-requests|httpclient|headless|lighthouse/i;

export function parseUserAgent(ua: string | null): ClientInfo {
  if (!ua) {
    return {
      device: "unknown",
      deviceVendor: null,
      deviceModel: null,
      browser: null,
      browserVersion: null,
      os: null,
      osVersion: null,
      isBot: true,
    };
  }

  const isBot = BOT_PATTERN.test(ua);
  const r = new UAParser(ua).getResult();
  const type = r.device.type; // mobile | tablet | smarttv | console | wearable | undefined

  return {
    device: isBot ? "bot" : (type ?? "desktop"),
    deviceVendor: r.device.vendor ?? null,
    // Chrome no Android envia o modelo como "K" por privacidade (UA reduzido): não é um modelo real.
    deviceModel: r.device.model && r.device.model !== "K" ? r.device.model : null,
    browser: r.browser.name ?? null,
    browserVersion: r.browser.version ?? null,
    os: r.os.name ?? null,
    osVersion: r.os.version ?? null,
    isBot,
  };
}

export function parseReferrer(referrer: string | null): { referrer: string | null; host: string | null } {
  if (!referrer) return { referrer: null, host: null };
  try {
    const url = new URL(referrer);
    return { referrer: url.toString().slice(0, 500), host: url.hostname.replace(/^www\./, "") };
  } catch {
    return { referrer: null, host: null };
  }
}

/** Requisições de pré-carregamento (o navegador antecipa o link) não são cliques reais. */
export function isPrefetch(headers: Headers): boolean {
  const purpose = `${headers.get("sec-purpose") ?? ""} ${headers.get("purpose") ?? ""} ${headers.get("x-moz") ?? ""}`;
  return /prefetch|prerender/i.test(purpose);
}
