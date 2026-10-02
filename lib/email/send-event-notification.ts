import { render } from "@react-email/render";
import { Resend } from "resend";
import { emailFrom, resendApiKey } from "@/lib/supabase/env";
import { sendGmailMessage } from "@/lib/google/gmail";
import EventNotificationEmail, {
  type EventNotificationEmailProps,
} from "@/emails/event-notification";

// Respaldo si Gmail no está disponible (cuenta conectada sin el scope
// gmail.send, o el envío por la API de Gmail falla): ningún proveedor deja
// falsificar un remitente sin verificar su dominio, así que acá se manda
// desde el dominio verificado de EditFlow mostrando el nombre del
// propietario, con reply-to a su correo real.
function buildFromHeader(ownerName: string): string {
  const match = emailFrom().match(/<(.+)>/);
  const address = match?.[1] ?? "notificaciones@editflow.app";
  return `${ownerName} vía EditFlow <${address}>`;
}

export interface SendEventNotificationInput extends EventNotificationEmailProps {
  to: string;
  ownerEmail: string;
  organizationId: string;
  /** true si la conexión de Google Calendar de esta organización también
   *  autorizó el scope gmail.send (ver GoogleCalendarConnection). */
  gmailSendAvailable: boolean;
}

/**
 * Manda la notificación del evento. Si el propietario conectó Gmail con el
 * scope de envío, sale literalmente de su bandeja de envío — si no, cae a
 * Resend para no perder el aviso.
 */
export async function sendEventNotificationEmail(input: SendEventNotificationInput) {
  const { to, ownerEmail, organizationId, gmailSendAvailable, eventTitle, ...templateProps } = input;
  const subject = `${eventTitle} — EditFlow`;
  const html = await render(EventNotificationEmail({ eventTitle, ...templateProps }));

  if (gmailSendAvailable) {
    const sent = await sendGmailMessage(organizationId, {
      fromName: templateProps.ownerName,
      fromEmail: ownerEmail,
      to,
      subject,
      html,
    });
    if (sent) return { transport: "gmail" as const };
  }

  const resend = new Resend(resendApiKey());
  await resend.emails.send({
    from: buildFromHeader(templateProps.ownerName),
    to,
    replyTo: ownerEmail,
    subject,
    html,
  });
  return { transport: "resend" as const };
}
