// Email sending via Resend
// Replies go to admin@theprimepetfood.com
// Unsubscribe footer included automatically

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_NAME = "Dipak — Prime Pet Food";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "outreach@theprimepetfood.com";
const REPLY_TO = "admin@theprimepetfood.com";

interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  /** If true, send as HTML. Default is plain text. */
  html?: boolean;
}

// Unsubscribe footer appended to every outreach email
function addUnsubscribeFooter(body: string, recipientEmail: string): string {
  const unsubLine = `\n\n---\nIf you don't want to receive these emails, reply with "unsubscribe" or email ${REPLY_TO} with subject "Unsubscribe".`;
  return body + unsubLine;
}

function textToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
}

export async function sendEmail({ to, subject, body, html = false }: SendEmailOptions) {
  const bodyWithFooter = addUnsubscribeFooter(body, to);

  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: [to],
    replyTo: REPLY_TO,
    subject,
    ...(html
      ? { html: bodyWithFooter }
      : {
          text: bodyWithFooter,
          html: textToHtml(bodyWithFooter),
        }),
  });

  if (error) {
    throw new Error(`Resend sendEmail failed: ${error.message}`);
  }

  return { success: true, id: data?.id };
}
