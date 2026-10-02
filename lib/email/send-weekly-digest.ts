import { render } from "@react-email/render";
import { Resend } from "resend";
import { emailFrom, resendApiKey } from "@/lib/supabase/env";
import WeeklyDigestEmail, { type WeeklyDigestEmailProps } from "@/emails/weekly-digest";

export interface SendWeeklyDigestInput extends WeeklyDigestEmailProps {
  to: string;
}

export async function sendWeeklyDigestEmail(input: SendWeeklyDigestInput) {
  const { to, ...templateProps } = input;
  const html = await render(WeeklyDigestEmail(templateProps));

  const resend = new Resend(resendApiKey());
  await resend.emails.send({
    from: emailFrom(),
    to,
    subject: `Resumen semanal — ${templateProps.organizationName}`,
    html,
  });
}
