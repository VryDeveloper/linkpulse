import { describe, expect, it } from "vitest";
import type { Click } from "@prisma/client";
import { DEMO_SLUG, destinationFor, maskIp, toPublicClick } from "@/lib/demo";

describe("maskIp", () => {
  it("mascara IPv4 e IPv6", () => {
    expect(maskIp("177.37.120.5")).toBe("177.37.x.x");
    expect(maskIp("2804:14c:65:1::1")).toBe("2804:14c:x:x…");
    expect(maskIp(null)).toBeNull();
  });
});

describe("destinationFor", () => {
  const base = "https://lnk.app/abc";
  it("mantém URLs externas", () => {
    expect(destinationFor({ slug: "x", url: "https://github.com/a" }, "id1", base)).toBe("https://github.com/a");
  });
  it("resolve caminhos internos no próprio domínio", () => {
    expect(destinationFor({ slug: "x", url: "/demo" }, null, base)).toBe("https://lnk.app/demo");
  });
  it("no link de demo, envia o id do clique", () => {
    expect(destinationFor({ slug: DEMO_SLUG, url: "/demo/seu-clique" }, "abc123", base)).toBe(
      "https://lnk.app/demo/seu-clique?c=abc123",
    );
  });
});

describe("toPublicClick", () => {
  const click = {
    id: "c1",
    linkId: "l1",
    createdAt: new Date("2026-11-03T12:00:00Z"),
    ip: "177.37.120.5",
    ipHash: "h",
    geoSource: "ipwho.is",
    country: "Brasil",
    countryCode: "BR",
    region: "Ceará",
    city: "Fortaleza",
    latitude: -3.731862,
    longitude: -38.526669,
    postalCode: "60000-000",
    timezone: "America/Fortaleza",
    isp: "Brisanet",
    asn: 28126,
    preciseLatitude: -3.7412345,
    preciseLongitude: -38.5298765,
    preciseAccuracy: 12,
    preciseStatus: "granted",
    device: "mobile",
    deviceVendor: "Samsung",
    deviceModel: "SM-S918B",
    browser: "Samsung Internet",
    browserVersion: "26.0",
    os: "Android",
    osVersion: "14",
    referrerHost: "instagram.com",
    referrer: "https://instagram.com/p/secreto",
    language: "pt-BR",
    userAgent: "Mozilla/5.0 ...",
    isBot: false,
  } satisfies Click;

  it("não expõe IP completo, GPS exato, user agent, CEP nem referrer completo", () => {
    const pub = toPublicClick(click);
    const json = JSON.stringify(pub);
    expect(pub.ip).toBe("177.37.x.x");
    expect(pub.lat).toBe(-3.74);
    expect(pub.lng).toBe(-38.53);
    for (const secret of ["177.37.120.5", "-3.7412345", "Mozilla", "60000-000", "/p/secreto"]) {
      expect(json).not.toContain(secret);
    }
  });
  it("mantém o que é útil para a demo", () => {
    expect(toPublicClick(click)).toMatchObject({ city: "Fortaleza", isp: "Brisanet", device: "Celular", hardware: "Samsung SM-S918B", precise: true });
  });
});
