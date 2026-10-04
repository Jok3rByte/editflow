import { render } from "@react-email/render";
import { Resend } from "resend";
import { emailFrom } from "@/lib/supabase/env";
import { sendGmailMessage } from "@/lib/google/gmail";
import InvitationEmail, { type InvitationEmailProps } from "@/emails/invitation";

// El remitente sale siempre como "EditFlow" (nunca con el nombre de quien
// invita) — reply-to sigue yendo a su correo real para que las respuestas
// le lleguen.
function buildFromHeader(): string {
  return emailFrom();
}

export interface SendInvitationInput extends InvitationEmailProps {
  to: string;
  /** Membership de quien invita — su token de Gmail es el que se usa. */
  senderMembershipId: string;
  inviterEmail: string;
  /** true si quien invita conectó Google con el scope gmail.send. */
  gmailSendAvailable: boolean;
}

export type SendInvitationResult =
  | { sent: true; transport: "gmail" | "resend" }
  | { sent: false; reason: "no-transport" };

/**
 * Manda el correo de invitación. Prefiere salir desde la bandeja de Gmail
 * del propietario (máxima entregabilidad, rara vez cae en spam porque es un
 * remitente real) y cae a Resend si no hay Gmail conectado. Si no hay ningún
 * transporte configurado, devuelve sent:false para que quien invita comparta
 * el enlace a mano.
 */
export async function sendInvitationEmail(input: SendInvitationInput): Promise<SendInvitationResult> {
  const { to, senderMembershipId, inviterEmail, gmailSendAvailable, ...templateProps } = input;
  const subject = `${templateProps.organizationName} te invita a colaborar`;
  const html = await render(InvitationEmail(templateProps));

  if (gmailSendAvailable) {
    const sent = await sendGmailMessage(senderMembershipId, {
      fromName: "EditFlow",
      fromEmail: inviterEmail,
      to,
      subject,
      html,
    });
    if (sent) return { sent: true, transport: "gmail" };
  }

  if (!process.env.RESEND_API_KEY) {
    return { sent: false, reason: "no-transport" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: buildFromHeader(),
    to,
    replyTo: inviterEmail,
    subject,
    html,
  });
  return { sent: true, transport: "resend" };
}
