import { UAParser } from "ua-parser-js";

export interface ClientInfo {
  device: string;
  browser: string | null;
  os: string | null;
  isBot: boolean;
}

// Crawlers e geradores de preview (WhatsApp, Slack, Telegram…) “clicam” no link ao gerar o card.
const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|embedly|curl|wget|python-requests|httpclient|headless|lighthouse/i;

export function parseUserAgent(ua: string | null): ClientInfo {
  if (!ua) return { device: "unknown", browser: null, os: null, isBot: true };

  const isBot = BOT_PATTERN.test(ua);
  const result = new UAParser(ua).getResult();
  const type = result.device.type; // mobile | tablet | smarttv | console | wearable | undefined

  return {
    device: isBot ? "bot" : (type ?? "desktop"),
    browser: result.browser.name ?? null,
    os: result.os.name ?? null,
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
