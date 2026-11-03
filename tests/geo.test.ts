import { describe, expect, it, vi } from "vitest";
import { geoFromApi, geoFromHeaders, lookupGeo } from "@/lib/geo";

const IPWHO_FORTALEZA = {
  success: true,
  ip: "177.37.0.1",
  country: "Brazil",
  country_code: "BR",
  region: "Ceará",
  city: "Fortaleza",
  latitude: -3.7,
  longitude: -38.5,
  postal: "60000-000",
  connection: { asn: 28126, isp: "Brisanet" },
  timezone: { id: "America/Fortaleza" },
};

const ok = (body: unknown) => {
  const f = vi.fn<(url: string) => Promise<Response>>(async () => new Response(JSON.stringify(body), { status: 200 }));
  return f as typeof f & typeof fetch;
};

describe("geoFromHeaders", () => {
  it("lê os headers da Vercel (cidade vem URL-encoded)", () => {
    const geo = geoFromHeaders(
      new Headers({
        "x-vercel-ip-country": "BR",
        "x-vercel-ip-country-region": "SP",
        "x-vercel-ip-city": "S%C3%A3o%20Paulo",
        "x-vercel-ip-latitude": "-23.55",
        "x-vercel-ip-longitude": "-46.63",
        "x-vercel-ip-postal-code": "01000",
        "x-vercel-ip-timezone": "America/Sao_Paulo",
      }),
    );
    expect(geo).toMatchObject({
      source: "edge-headers",
      countryCode: "BR",
      country: "Brasil",
      city: "São Paulo",
      latitude: -23.55,
      postalCode: "01000",
      timezone: "America/Sao_Paulo",
    });
  });
  it("lê os headers da Cloudflare", () => {
    expect(geoFromHeaders(new Headers({ "cf-ipcountry": "pt", "cf-ipcity": "Lisboa" }))).toMatchObject({
      countryCode: "PT",
      city: "Lisboa",
      latitude: null,
    });
  });
  it("ignora país desconhecido (XX) e Tor (T1)", () => {
    expect(geoFromHeaders(new Headers({ "cf-ipcountry": "XX" }))).toBeNull();
    expect(geoFromHeaders(new Headers({ "cf-ipcountry": "T1" }))).toBeNull();
  });
});

describe("geoFromApi", () => {
  it("mapeia a resposta do ipwho.is, incluindo provedor, CEP e fuso", async () => {
    const geo = await geoFromApi("177.37.0.1", ok(IPWHO_FORTALEZA));
    expect(geo).toMatchObject({
      source: "ipwho.is",
      ip: "177.37.0.1",
      country: "Brasil",
      city: "Fortaleza",
      longitude: -38.5,
      postalCode: "60000-000",
      timezone: "America/Fortaleza",
      isp: "Brisanet",
      asn: 28126,
    });
  });
  it("sem IP, consulta o IP público da própria máquina (modo dev)", async () => {
    const f = ok(IPWHO_FORTALEZA);
    const geo = await geoFromApi(null, f);
    expect(f.mock.calls[0][0]).toMatch(/^https:\/\/ipwho\.is\/\?/);
    expect(geo?.ip).toBe("177.37.0.1");
  });
  it("não consulta a API para IPs privados", async () => {
    const f = ok({});
    expect(await geoFromApi("192.168.0.1", f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
  it("retorna null quando a API falha", async () => {
    const failing = vi.fn(async () => {
      throw new Error("timeout");
    }) as unknown as typeof fetch;
    expect(await geoFromApi("8.8.8.8", failing)).toBeNull();
    expect(await geoFromApi("8.8.8.8", ok({ success: false }))).toBeNull();
  });
});

describe("lookupGeo", () => {
  it("combina: localização da edge tem prioridade, a API completa provedor e CEP", async () => {
    const geo = await lookupGeo(
      new Headers({ "x-vercel-ip-country": "BR", "x-vercel-ip-city": "Natal" }),
      "177.37.0.1",
      ok(IPWHO_FORTALEZA),
    );
    expect(geo).toMatchObject({ source: "edge-headers+ipwho.is", city: "Natal", isp: "Brisanet", postalCode: "60000-000" });
  });
  it("usa só a edge quando a API falha", async () => {
    const geo = await lookupGeo(new Headers({ "x-vercel-ip-country": "US" }), "8.8.8.8", ok({ success: false }));
    expect(geo.source).toBe("edge-headers");
  });
  it("retorna geo vazia sem lançar erro", async () => {
    const geo = await lookupGeo(new Headers(), "10.0.0.1");
    expect(geo.source).toBe("none");
  });
});
