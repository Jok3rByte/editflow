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

// Codifica un header (nombre, asunto) si tiene caracteres no-ASCII (RFC 2047).
function encodeHeaderWord(s: string): string {
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, "utf-8").toString("base64")}?=`;
}

// base64 estándar envuelto a 76 columnas (RFC 2045) para los cuerpos MIME.
function base64Wrapped(s: string): string {
  const b64 = Buffer.from(s, "utf-8").toString("base64");
  return b64.match(/.{1,76}/g)?.join("\r\n") ?? b64;
}

// Versión texto plano a partir del HTML — tener parte de texto (multipart) es
// clave para que los correos no caigan en spam.
function htmlATexto(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

interface SendGmailInput {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Manda el correo con la API de Gmail usando el token del miembro remitente
 * (normalmente el owner/admin): sale de SU bandeja de envío, con su correo
 * real como remitente. Se arma como multipart/alternative (texto + HTML) con
 * headers Date y Reply-To para máxima entregabilidad (menos probabilidad de
 * spam). Requiere el scope gmail.send; si no, quien llama cae a un respaldo.
 */
export async function sendGmailMessage(
  senderMembershipId: string,
  input: SendGmailInput,
): Promise<boolean> {
  const accessToken = await getValidAccessToken(senderMembershipId);
  if (!accessToken) return false;

  const boundary = `=_EditFlow_${Date.now().toString(36)}`;
  const texto = htmlATexto(input.html);

  const mime = [
    `From: ${encodeHeaderWord(input.fromName)} <${input.fromEmail}>`,
    `To: ${input.to}`,
    `Reply-To: ${input.fromEmail}`,
    `Subject: ${encodeHeaderWord(input.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Wrapped(texto),
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Wrapped(input.html),
    "",
    `--${boundary}--`,
    "",
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
