import { describe, expect, it } from "vitest";
import { bearerToken, generateManageToken, hashToken, tokenMatches } from "@/lib/ownership";

describe("chave de dono do link", () => {
  it("gera chaves longas, aleatórias e seguras para URL", () => {
    const a = generateManageToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(generateManageToken());
  });

  it("confere a chave pelo hash (o servidor não guarda a chave)", () => {
    const token = generateManageToken();
    const stored = hashToken(token);
    expect(stored).not.toContain(token);
    expect(tokenMatches(token, stored)).toBe(true);
    expect(tokenMatches(generateManageToken(), stored)).toBe(false);
  });

  it("recusa chave ausente e links sem dono (criados antes do recurso)", () => {
    expect(tokenMatches(null, hashToken("x"))).toBe(false);
    expect(tokenMatches("x", null)).toBe(false);
  });

  it("lê o header Authorization: Bearer", () => {
    expect(bearerToken(new Headers({ authorization: "Bearer abc" }))).toBe("abc");
    expect(bearerToken(new Headers({ authorization: "Basic abc" }))).toBeNull();
    expect(bearerToken(new Headers())).toBeNull();
  });
});
