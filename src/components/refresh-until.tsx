"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Recarrega os dados do servidor algumas vezes enquanto `pending` for true (ex: geo ainda processando). */
export function RefreshUntil({ pending, intervalMs = 1500, maxTries = 8 }: { pending: boolean; intervalMs?: number; maxTries?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!pending) return;
    let tries = 0;
    const id = setInterval(() => {
      if (++tries > maxTries) return clearInterval(id);
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [pending, intervalMs, maxTries, router]);
  return null;
}
