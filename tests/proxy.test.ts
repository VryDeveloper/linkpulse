import { describe, expect, it } from "vitest";
import { checkBasicAuth, isProtectedPath, safeEqual } from "@/proxy";

const basic = (user: string, pass: string) => `Basic ${btoa(`${user}:${pass}`)}`;

describe("isProtectedPath", () => {
  it.each(["/dashboard", "/links/abc", "/api/links"])("%s é protegido", (p) => expect(isProtectedPath(p)).toBe(true));
  it.each(["/", "/demo", "/demo/seu-clique", "/api/demo", "/abc123", "/go/xyz", "/api/clicks/x/precise", "/linksz", "/dashboardx"])("%s é público", (p) => {
    expect(isProtectedPath(p)).toBe(false);
  });
});

describe("checkBasicAuth", () => {
  it("aceita usuário e senha corretos", () => {
    expect(checkBasicAuth(basic("admin", "s3nha:com:dois-pontos"), "admin", "s3nha:com:dois-pontos")).toBe(true);
  });
  it("recusa senha errada, usuário errado e header inválido", () => {
    expect(checkBasicAuth(basic("admin", "errada"), "admin", "certa")).toBe(false);
    expect(checkBasicAuth(basic("root", "certa"), "admin", "certa")).toBe(false);
    expect(checkBasicAuth("Basic %%%", "admin", "certa")).toBe(false);
    expect(checkBasicAuth(null, "admin", "certa")).toBe(false);
  });
});

describe("safeEqual", () => {
  it("compara strings de tamanhos diferentes", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
