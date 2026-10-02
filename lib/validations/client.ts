import { z } from "zod";

export const DELIVERY_FORMATS = [
  "Reel",
  "TikTok",
  "YouTube",
  "Comercial",
  "Podcast",
  "Foto",
] as const;

export const CREATE_CLIENT_SCHEMA = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio."),
  brandName: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  contactEmail: z.string().trim().email("Correo inválido.").optional().or(z.literal("")),
  contactPhone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
  tiktok: z.string().trim().optional(),
  youtube: z.string().trim().optional(),
  brandDescription: z.string().trim().optional(),
  targetAudience: z.string().trim().optional(),
  toneOfVoice: z.string().trim().optional(),
  objectives: z.string().trim().optional(),
  doNotDo: z.string().trim().optional(),
  deliveryFormats: z.array(z.enum(DELIVERY_FORMATS)).optional(),
  monthlyGoal: z.coerce.number().int().min(0, "La meta no puede ser negativa."),
  strategist: z.string().trim().optional(),
  assetsUrl: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
export type CreateClientInput = z.infer<typeof CREATE_CLIENT_SCHEMA>;
