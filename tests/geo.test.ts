import { describe, expect, it, vi } from "vitest";
import { geoFromApi, geoFromHeaders, lookupGeo } from "@/lib/geo";

describe("geoFromHeaders", () => {
  it("lê os headers da Vercel (cidade vem URL-encoded)", () => {
    const geo = geoFromHeaders(
      new Headers({
        "x-vercel-ip-country": "BR",
        "x-vercel-ip-country-region": "SP",
        "x-vercel-ip-city": "S%C3%A3o%20Paulo",
        "x-vercel-ip-latitude": "-23.55",
        "x-vercel-ip-longitude": "-46.63",
      }),
    );
    expect(geo).toMatchObject({ source: "edge-headers", countryCode: "BR", country: "Brasil", city: "São Paulo", latitude: -23.55 });
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
  const ok = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;

  it("mapeia a resposta do ipwho.is", async () => {
    const geo = await geoFromApi(
      "177.37.0.1",
      ok({ success: true, country: "Brazil", country_code: "BR", region: "Ceará", city: "Fortaleza", latitude: -3.7, longitude: -38.5 }),
    );
    expect(geo).toMatchObject({ source: "ipwho.is", country: "Brasil", city: "Fortaleza", longitude: -38.5 });
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
  it("usa headers da edge antes de chamar a API", async () => {
    const f = vi.fn() as unknown as typeof fetch;
    const geo = await lookupGeo(new Headers({ "x-vercel-ip-country": "US" }), "8.8.8.8", f);
    expect(geo.source).toBe("edge-headers");
    expect(f).not.toHaveBeenCalled();
  });
  it("retorna geo vazia sem lançar erro", async () => {
    const geo = await lookupGeo(new Headers(), null);
    expect(geo.source).toBe("none");
  });
});
