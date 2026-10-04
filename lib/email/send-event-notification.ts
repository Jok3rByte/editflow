import { render } from "@react-email/render";
import { Resend } from "resend";
import { emailFrom } from "@/lib/supabase/env";
import { sendGmailMessage } from "@/lib/google/gmail";
import EventNotificationEmail, {
  type EventNotificationEmailProps,
} from "@/emails/event-notification";

// Respaldo si Gmail no está disponible (cuenta conectada sin el scope
// gmail.send, o el envío por la API de Gmail falla): el remitente sale
// siempre como "EditFlow", nunca con el nombre de la persona — reply-to
// sigue yendo a su correo real para que las respuestas le lleguen.
function buildFromHeader(): string {
  return emailFrom();
}

export interface SendEventNotificationInput extends EventNotificationEmailProps {
  to: string;
  /** Correo del miembro que envía (quien creó el evento). */
  senderEmail: string;
  /** Membership del remitente — su token de Gmail es el que se usa. */
  senderMembershipId: string;
  /** true si el remitente conectó Google con el scope gmail.send. */
  gmailSendAvailable: boolean;
}

/**
 * Manda la notificación del evento. Si el remitente (quien crea el evento)
 * conectó Gmail con el scope de envío, sale literalmente desde su bandeja de
 * envío — si no, cae a Resend. Si no hay ningún transporte, no envía.
 */
export async function sendEventNotificationEmail(input: SendEventNotificationInput) {
  const { to, senderEmail, senderMembershipId, gmailSendAvailable, eventTitle, ...templateProps } = input;
  const subject = `EditFlow · ${eventTitle}`;
  const html = await render(EventNotificationEmail({ eventTitle, ...templateProps }));

  if (gmailSendAvailable) {
    const sent = await sendGmailMessage(senderMembershipId, {
      fromName: "EditFlow",
      fromEmail: senderEmail,
      to,
      subject,
      html,
    });
    if (sent) return { transport: "gmail" as const };
  }

  if (!process.env.RESEND_API_KEY) {
    return { transport: "none" as const };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: buildFromHeader(),
    to,
    replyTo: senderEmail,
    subject,
    html,
  });
  return { transport: "resend" as const };
}
