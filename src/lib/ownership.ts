import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";

/**
 * Posse de links sem contas de usuário:
 * ao criar um link o servidor gera uma chave secreta aleatória, devolve ela UMA vez e guarda só
 * o hash. A chave fica no IndexedDB do navegador de quem criou e é enviada como
 * `Authorization: Bearer <chave>` para ver o analytics ou excluir o link.
 */
export function generateManageToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string | null | undefined, storedHash: string | null): boolean {
  if (!token || !storedHash) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function bearerToken(headers: Headers): string | null {
  const auth = headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7).trim() || null : null;
}

/** Busca o link só se a chave conferir. Responde igual para "não existe" e "chave errada". */
export async function getOwnedLink(slug: string, token: string | null) {
  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link || !tokenMatches(token, link.manageTokenHash)) return null;
  return link;
}

/** Dados de um link que podem ir para o navegador do dono (sem o hash da chave). */
export function publicLink(link: { slug: string; url: string; title: string | null; preciseGeo: boolean; createdAt: Date }) {
  return { slug: link.slug, url: link.url, title: link.title, preciseGeo: link.preciseGeo, createdAt: link.createdAt.toISOString() };
}
