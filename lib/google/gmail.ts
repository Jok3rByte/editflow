import { getValidAccessToken } from "./calendar";

const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

interface SendGmailInput {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Manda el correo con la API de Gmail usando el token del propietario: sale
 * literalmente de SU bandeja de envío (queda en su carpeta de Enviados, con
 * su nombre y su correo real como remitente) — no de un dominio de
 * terceros. Requiere que la conexión de Google se haya hecho con el scope
 * gmail.send (ver GoogleCalendarConnection); si no, quien llama debe caer
 * a un respaldo (Resend).
 */
export async function sendGmailMessage(
  organizationId: string,
  input: SendGmailInput,
): Promise<boolean> {
  const accessToken = await getValidAccessToken(organizationId);
  if (!accessToken) return false;

  const mime = [
    `From: ${input.fromName} <${input.fromEmail}>`,
    `To: ${input.to}`,
    `Subject: ${encodeSubject(input.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    input.html,
  ].join("\r\n");

  const res = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64UrlEncode(mime) }),
  });

  if (!res.ok) {
    console.error("Gmail send error", res.status, await res.text());
    return false;
  }
  return true;
}
