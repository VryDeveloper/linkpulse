import { z } from "zod";
import { isValidCustomSlug } from "./slug";

export const createLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .url("Informe uma URL válida")
    .refine((u) => /^https?:\/\//i.test(u), "Somente URLs http(s) são permitidas"),
  slug: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s ? s : undefined))
    .refine((s) => s === undefined || isValidCustomSlug(s), "Alias inválido: use 3–32 letras, números, - ou _"),
  title: z.string().trim().max(120).optional(),
  preciseGeo: z.boolean().optional().default(false),
});

export const preciseLocationSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("granted"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().min(0).max(1_000_000),
  }),
  z.object({ status: z.enum(["denied", "unavailable", "timeout"]) }),
]);
