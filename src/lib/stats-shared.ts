/** Constantes e tipos de estatística usados no servidor e no navegador (sem Prisma). */

export const TIMEZONE = process.env.APP_TIMEZONE ?? "America/Sao_Paulo";

export const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;

export type RangeKey = keyof typeof RANGES;

export interface Breakdown {
  label: string;
  count: number;
  /** Quando presente, a UI mostra a bandeira do país ao lado do rótulo. */
  countryCode?: string | null;
}

export interface MapPoint {
  lat: number;
  lng: number;
  count: number;
  label: string;
  precise: boolean;
  accuracy: number | null;
}

export function deviceLabel(device: string | null): string {
  const labels: Record<string, string> = {
    desktop: "Desktop",
    mobile: "Celular",
    tablet: "Tablet",
    smarttv: "Smart TV",
    console: "Console",
    wearable: "Wearable",
  };
  return device ? (labels[device] ?? device) : "Desconhecido";
}
