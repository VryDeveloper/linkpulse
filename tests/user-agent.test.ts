import { describe, expect, it } from "vitest";
import { isPrefetch, parseReferrer, parseUserAgent } from "@/lib/user-agent";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const WIN_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

describe("parseUserAgent", () => {
  it("identifica celular", () => {
    expect(parseUserAgent(IPHONE)).toMatchObject({
      device: "mobile",
      deviceVendor: "Apple",
      deviceModel: "iPhone",
      os: "iOS",
      osVersion: "17.5",
      browserVersion: "17.5",
      isBot: false,
    });
  });
  it("trata ausência de tipo como desktop", () => {
    expect(parseUserAgent(WIN_CHROME)).toMatchObject({ device: "desktop", browser: "Chrome", os: "Windows" });
  });
  it.each(["WhatsApp/2.23.20.0", "facebookexternalhit/1.1", "Slackbot-LinkExpanding 1.0", "curl/8.4.0"])(
    "marca %s como bot",
    (ua) => expect(parseUserAgent(ua).isBot).toBe(true),
  );
  it("UA vazio é tratado como bot", () => {
    expect(parseUserAgent(null).isBot).toBe(true);
  });
});

describe("parseReferrer", () => {
  it("extrai o host sem www", () => {
    expect(parseReferrer("https://www.linkedin.com/feed/").host).toBe("linkedin.com");
  });
  it("ignora referrer inválido", () => {
    expect(parseReferrer("not a url")).toEqual({ referrer: null, host: null });
  });
});

describe("modelo do aparelho", () => {
  it("lê o modelo de um Samsung", () => {
    const ua = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
    expect(parseUserAgent(ua)).toMatchObject({ deviceVendor: "Samsung", deviceModel: "SM-S918B", os: "Android", osVersion: "14" });
  });
  it("ignora o modelo genérico 'K' do UA reduzido do Chrome", () => {
    const ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
    expect(parseUserAgent(ua).deviceModel).toBeNull();
  });
});

describe("isPrefetch", () => {
  it("detecta pré-carregamento do navegador", () => {
    expect(isPrefetch(new Headers({ "sec-purpose": "prefetch;prerender" }))).toBe(true);
    expect(isPrefetch(new Headers({ purpose: "prefetch" }))).toBe(true);
    expect(isPrefetch(new Headers())).toBe(false);
  });
});
