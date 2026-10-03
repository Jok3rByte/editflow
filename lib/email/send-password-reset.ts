import { render } from "@react-email/render";
import { Resend } from "resend";
import { emailFrom } from "@/lib/supabase/env";
import { sendGmailMessage } from "@/lib/google/gmail";
import PasswordResetEmail from "@/emails/password-reset";

function buildFromHeader(): string {
  const match = emailFrom().match(/<(.+)>/);
  const address = match?.[1] ?? "notificaciones@editflow.app";
  return `EditFlow <${address}>`;
}

export interface SendPasswordResetInput {
  to: string;
  resetUrl: string;
  /** Membership del owner cuyo Gmail se usa para enviar (si conectó gmail.send). */
  senderMembershipId: string | null;
  senderEmail: string | null;
  gmailSendAvailable: boolean;
}

export type SendPasswordResetResult =
  | { sent: true; transport: "gmail" | "resend" }
  | { sent: false; reason: "no-transport" };

/**
 * Manda el correo de "restablecer contraseña" con la marca EditFlow (asunto,
 * logo y botón controlados por la app). Prefiere el Gmail del owner de la
 * organización del usuario; cae a Resend. Si no hay transporte, no envía.
 */
export async function sendPasswordResetEmail(input: SendPasswordResetInput): Promise<SendPasswordResetResult> {
  const subject = "EditFlow · Restablecer contraseña";
  const html = await render(PasswordResetEmail({ resetUrl: input.resetUrl }));

  if (input.gmailSendAvailable && input.senderMembershipId && input.senderEmail) {
    const sent = await sendGmailMessage(input.senderMembershipId, {
      fromName: "EditFlow",
      fromEmail: input.senderEmail,
      to: input.to,
      subject,
      html,
    });
    if (sent) return { sent: true, transport: "gmail" };
  }

  if (!process.env.RESEND_API_KEY) {
    return { sent: false, reason: "no-transport" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({ from: buildFromHeader(), to: input.to, subject, html });
  return { sent: true, transport: "resend" };
}
