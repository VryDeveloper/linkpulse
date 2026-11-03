import { describe, expect, it } from "vitest";
import { clusterPoints, fillDays } from "@/lib/stats";
import { isValidCustomSlug } from "@/lib/slug";
import { createLinkSchema } from "@/lib/validation";

describe("fillDays", () => {
  it("preenche dias sem clique com zero", () => {
    const now = new Date("2026-11-03T15:00:00Z");
    const out = fillDays([{ day: "2026-11-02", count: 4 }], 3, now);
    expect(out).toEqual([
      { label: "2026-11-01", count: 0 },
      { label: "2026-11-02", count: 4 },
      { label: "2026-11-03", count: 0 },
    ]);
  });
});

describe("clusterPoints", () => {
  it("agrupa pontos próximos e separa GPS de IP", () => {
    const base = { label: "SP", accuracy: null };
    const out = clusterPoints([
      { ...base, lat: -23.551, lng: -46.631, precise: false },
      { ...base, lat: -23.552, lng: -46.632, precise: false },
      { ...base, lat: -23.551, lng: -46.631, precise: true },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ count: 2, precise: false });
  });
});

describe("validação de links", () => {
  it("rejeita slugs reservados e inválidos", () => {
    expect(isValidCustomSlug("api")).toBe(false);
    expect(isValidCustomSlug("ab")).toBe(false);
    expect(isValidCustomSlug("meu-link_1")).toBe(true);
  });
  it("aceita só http(s)", () => {
    expect(createLinkSchema.safeParse({ url: "javascript:alert(1)" }).success).toBe(false);
    expect(createLinkSchema.safeParse({ url: "ftp://x.com" }).success).toBe(false);
    expect(createLinkSchema.safeParse({ url: "https://x.com" }).success).toBe(true);
  });
});
