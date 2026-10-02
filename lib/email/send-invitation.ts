import { render } from "@react-email/render";
import { Resend } from "resend";
import { emailFrom } from "@/lib/supabase/env";
import { sendGmailMessage } from "@/lib/google/gmail";
import InvitationEmail, { type InvitationEmailProps } from "@/emails/invitation";

// Mismo criterio que buildFromHeader en send-event-notification: ningún
// proveedor deja falsificar un remitente sin verificar su dominio, así que
// por Resend se manda desde el dominio verificado de EditFlow mostrando el
// nombre de quien invita, con reply-to a su correo real.
function buildFromHeader(inviterName: string): string {
  const match = emailFrom().match(/<(.+)>/);
  const address = match?.[1] ?? "notificaciones@editflow.app";
  return `${inviterName} vía EditFlow <${address}>`;
}

export interface SendInvitationInput extends InvitationEmailProps {
  to: string;
  organizationId: string;
  inviterEmail: string;
  /** true si la organización conectó Google con el scope gmail.send. */
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
  const { to, organizationId, inviterEmail, gmailSendAvailable, ...templateProps } = input;
  const subject = `EditFlow · ${templateProps.inviterName} te invita a ${templateProps.organizationName}`;
  const html = await render(InvitationEmail(templateProps));

  if (gmailSendAvailable) {
    const sent = await sendGmailMessage(organizationId, {
      fromName: templateProps.inviterName,
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
    from: buildFromHeader(templateProps.inviterName),
    to,
    replyTo: inviterEmail,
    subject,
    html,
  });
  return { sent: true, transport: "resend" };
}
