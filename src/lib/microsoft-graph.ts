// Microsoft Graph API — send email via M365
// Uses OAuth2 client credentials flow (app-only, no user sign-in)

interface GraphTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const tenantId = process.env.MS_TENANT_ID!;
  const clientId = process.env.MS_CLIENT_ID!;
  const clientSecret = process.env.MS_CLIENT_SECRET!;

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to get Microsoft Graph token: ${error}`);
  }

  const data: GraphTokenResponse = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  /** If true, send as HTML. Default is plain text. */
  html?: boolean;
}

export async function sendEmail({ to, subject, body, html = false }: SendEmailOptions) {
  const token = await getAccessToken();
  const senderEmail = process.env.MS_SENDER_EMAIL!;

  const url = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;

  const message = {
    message: {
      subject,
      body: {
        contentType: html ? "HTML" : "Text",
        content: body,
      },
      toRecipients: [
        {
          emailAddress: { address: to },
        },
      ],
    },
    saveToSentItems: true,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Microsoft Graph sendMail failed: ${res.status} — ${error}`);
  }

  // 202 Accepted = success (no response body)
  return { success: true };
}
