import { NextResponse, type NextRequest } from "next/server";

/**
 * Protege o painel (lista de links, analytics e API de criação) com HTTP Basic Auth.
 * Os links curtos (/:slug), a página de consentimento (/go) e a API de GPS continuam públicos.
 *
 * - ADMIN_PASSWORD definido: pede usuário/senha (usuário: ADMIN_USER ou "admin").
 * - Sem ADMIN_PASSWORD em produção: o painel fica bloqueado (falha segura).
 * - Sem ADMIN_PASSWORD em desenvolvimento: painel aberto.
 */
export function isProtectedPath(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/links") || pathname.startsWith("/api/links");
}

/** Comparação em tempo constante, para não vazar a senha por diferença de tempo de resposta. */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function checkBasicAuth(header: string | null, user: string, password: string): boolean {
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return false;
  // Avalia as duas comparações sempre (sem curto-circuito).
  const okUser = safeEqual(decoded.slice(0, sep), user);
  const okPass = safeEqual(decoded.slice(sep + 1), password);
  return okUser && okPass;
}

export function proxy(req: NextRequest) {
  if (!isProtectedPath(req.nextUrl.pathname)) return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("Painel desativado: defina ADMIN_PASSWORD nas variáveis de ambiente.", { status: 503 });
  }

  if (checkBasicAuth(req.headers.get("authorization"), process.env.ADMIN_USER || "admin", password)) {
    return NextResponse.next();
  }

  return new NextResponse("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="LinkPulse", charset="UTF-8"' },
  });
}

export const config = {
  // Não roda em arquivos estáticos; o filtro fino de rotas fica em isProtectedPath.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
