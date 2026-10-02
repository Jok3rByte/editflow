import { render } from "@react-email/render";
import { Resend } from "resend";
import { emailFrom, resendApiKey } from "@/lib/supabase/env";
import MonthCloseReminderEmail, {
  type MonthCloseReminderEmailProps,
} from "@/emails/month-close-reminder";

export interface SendMonthCloseReminderInput extends MonthCloseReminderEmailProps {
  to: string;
}

export async function sendMonthCloseReminderEmail(input: SendMonthCloseReminderInput) {
  const { to, ...templateProps } = input;
  const html = await render(MonthCloseReminderEmail(templateProps));

  const resend = new Resend(resendApiKey());
  await resend.emails.send({
    from: emailFrom(),
    to,
    subject: `${templateProps.periodLabel} cierra en ${templateProps.diasRestantes} días`,
    html,
  });
}
