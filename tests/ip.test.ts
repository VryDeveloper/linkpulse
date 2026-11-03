import { describe, expect, it } from "vitest";
import { getClientIp, hashIp, isPrivateIp } from "@/lib/ip";

describe("getClientIp", () => {
  it("prefere cf-connecting-ip e depois o primeiro IP do x-forwarded-for", () => {
    expect(getClientIp(new Headers({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("1.1.1.1");
    expect(getClientIp(new Headers({ "x-forwarded-for": "8.8.8.8, 10.0.0.1" }))).toBe("8.8.8.8");
  });
  it("remove o prefixo IPv4-mapped", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "::ffff:200.1.2.3" }))).toBe("200.1.2.3");
  });
  it("retorna null sem headers", () => {
    expect(getClientIp(new Headers())).toBeNull();
  });
});

describe("isPrivateIp", () => {
  it.each(["127.0.0.1", "10.1.2.3", "192.168.0.10", "172.20.0.1", "::1", "fd00::1", "100.64.0.1"])("%s é privado", (ip) =>
    expect(isPrivateIp(ip)).toBe(true),
  );
  it.each(["8.8.8.8", "177.37.0.1", "172.32.0.1", "2804:14c::1"])("%s é público", (ip) => expect(isPrivateIp(ip)).toBe(false));
});

describe("hashIp", () => {
  it("é determinístico, depende do salt e não contém o IP", () => {
    const a = hashIp("8.8.8.8", "s1");
    expect(a).toBe(hashIp("8.8.8.8", "s1"));
    expect(a).not.toBe(hashIp("8.8.8.8", "s2"));
    expect(a).not.toContain("8.8.8.8");
    expect(a).toHaveLength(32);
  });
});
