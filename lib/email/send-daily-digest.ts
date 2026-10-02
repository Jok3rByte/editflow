import { render } from "@react-email/render";
import { Resend } from "resend";
import { emailFrom, resendApiKey } from "@/lib/supabase/env";
import DailyDigestEmail, { type DailyDigestEmailProps } from "@/emails/daily-digest";

export interface SendDailyDigestInput extends DailyDigestEmailProps {
  to: string;
}

export async function sendDailyDigestEmail(input: SendDailyDigestInput) {
  const { to, ...templateProps } = input;
  const html = await render(DailyDigestEmail(templateProps));

  const resend = new Resend(resendApiKey());
  await resend.emails.send({
    from: emailFrom(),
    to,
    subject: `Resumen diario — ${templateProps.organizationName}`,
    html,
  });
}
