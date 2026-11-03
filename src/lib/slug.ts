import { customAlphabet } from "nanoid";

// Sem caracteres ambíguos (0/O, 1/l/I) para facilitar digitar o link.
const alphabet = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
export const generateSlug = customAlphabet(alphabet, 7);

export const SLUG_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

/** Segmentos de rota que não podem virar slug porque colidem com páginas do app. */
export const RESERVED_SLUGS = new Set(["api", "links", "go", "demo", "dashboard", "_next", "favicon.ico", "robots.txt"]);

export function isValidCustomSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug.toLowerCase());
}
