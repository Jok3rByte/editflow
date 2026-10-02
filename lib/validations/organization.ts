import { z } from "zod";

export const ACCOUNT_STEP_SCHEMA = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre completo."),
  email: z.string().trim().email("Escribe un correo válido."),
});
export type AccountStepInput = z.infer<typeof ACCOUNT_STEP_SCHEMA>;

export const WORKSPACE_TYPES = ["agencia", "productora", "creador"] as const;

export const CREATE_ORGANIZATION_SCHEMA = z.object({
  name: z.string().trim().min(2, "El nombre del espacio es obligatorio."),
  type: z.enum(WORKSPACE_TYPES),
  timezone: z.string().trim().min(1).default("America/Bogota"),
});
export type CreateOrganizationInput = z.infer<typeof CREATE_ORGANIZATION_SCHEMA>;
