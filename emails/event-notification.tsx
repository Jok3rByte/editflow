import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const LOGO_URL = "https://editflow-gules.vercel.app/logo-mark.png";

export interface EventNotificationEmailProps {
  eventTitle: string;
  eventTypeLabel: string;
  dateLabel: string;
  timeLabel: string;
  organizationName: string;
  ownerName: string;
  recipientIsOwner: boolean;
  assignedToName?: string;
  googleCalendarLink?: string;
}

export default function EventNotificationEmail({
  eventTitle,
  eventTypeLabel,
  dateLabel,
  timeLabel,
  organizationName,
  ownerName,
  recipientIsOwner,
  assignedToName,
  googleCalendarLink,
}: EventNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {eventTitle} — {dateLabel} a las {timeLabel}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} width="32" height="32" alt="EditFlow" style={{ marginBottom: "12px" }} />
          <Text style={brand}>
            Edit<span style={{ color: "#8B5CF6" }}>Flow</span>
          </Text>
          <Heading style={h1}>{eventTitle}</Heading>
          <Text style={subtitle}>
            {eventTypeLabel} · {organizationName}
          </Text>

          <Section style={card}>
            <Text style={row}>
              <strong>Fecha:</strong> {dateLabel}
            </Text>
            <Text style={row}>
              <strong>Hora:</strong> {timeLabel}
            </Text>
            {!recipientIsOwner && assignedToName && (
              <Text style={row}>
                <strong>Asignado a:</strong> {assignedToName}
              </Text>
            )}
          </Section>

          <Text style={paragraph}>
            {recipientIsOwner
              ? `Como propietario de ${organizationName}, recibes todos los eventos del calendario del equipo.`
              : `${ownerName} te asignó este evento en ${organizationName}.`}
            {" "}
            Ya quedó agendado en Google Calendar
            {googleCalendarLink ? (
              <>
                {" — "}
                <Link href={googleCalendarLink} style={link}>
                  verlo en Google Calendar
                </Link>
              </>
            ) : (
              "."
            )}
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Enviado por EditFlow en nombre de {ownerName}. Responde a este correo y le llega
            directo a {ownerName}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#0b0a12",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  padding: "32px 0",
};

const container = {
  backgroundColor: "#15131f",
  borderRadius: "16px",
  margin: "0 auto",
  padding: "32px",
  maxWidth: "480px",
  border: "1px solid rgba(255,255,255,0.08)",
};

const brand = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  margin: "0 0 24px",
};

const h1 = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 700,
  margin: "0 0 4px",
};

const subtitle = {
  color: "#9d97b3",
  fontSize: "13px",
  margin: "0 0 20px",
};

const card = {
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "16px 20px",
  margin: "0 0 20px",
};

const row = {
  color: "#e5e2f0",
  fontSize: "14px",
  margin: "4px 0",
};

const paragraph = {
  color: "#c7c2d9",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 20px",
};

const link = {
  color: "#8B5CF6",
  textDecoration: "underline",
};

const hr = {
  borderColor: "rgba(255,255,255,0.08)",
  margin: "20px 0",
};

const footer = {
  color: "#6b6580",
  fontSize: "12px",
  margin: 0,
};
