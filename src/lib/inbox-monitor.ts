// Microsoft Graph API — monitor inbox for replies
// Uses the existing M365 credentials (read-only now, sending moved to Resend)

interface GraphTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
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

export interface InboxMessage {
  id: string;
  from: string;
  subject: string;
  bodyPreview: string;
  receivedAt: string;
}

/**
 * Fetch recent emails from the inbox, filtered by sender addresses
 * @param senderEmails - list of email addresses to check replies from
 * @param sinceDays - how many days back to check (default: 2)
 */
export async function checkReplies(
  senderEmails: string[],
  sinceDays: number = 2
): Promise<InboxMessage[]> {
  if (!process.env.MS_TENANT_ID || !process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET) {
    throw new Error("Microsoft Graph credentials not configured. Set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET.");
  }

  const token = await getAccessToken();
  const mailbox = process.env.MS_REPLY_TO_EMAIL || "admin@theprimepetfood.com";

  const sinceDate = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  // Build filter: received after sinceDate AND from any of the sender emails
  const fromFilters = senderEmails
    .map((email) => `from/emailAddress/address eq '${email}'`)
    .join(" or ");

  const filter = `receivedDateTime ge ${sinceDate} and (${fromFilters})`;

  const url = `https://graph.microsoft.com/v1.0/users/${mailbox}/messages?$filter=${encodeURIComponent(filter)}&$select=id,from,subject,bodyPreview,receivedDateTime&$top=50&$orderby=receivedDateTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Graph inbox read failed: ${res.status} — ${error}`);
  }

  const data = await res.json();

  return (data.value || []).map((msg: {
    id: string;
    from: { emailAddress: { address: string } };
    subject: string;
    bodyPreview: string;
    receivedDateTime: string;
  }) => ({
    id: msg.id,
    from: msg.from.emailAddress.address.toLowerCase(),
    subject: msg.subject,
    bodyPreview: msg.bodyPreview,
    receivedAt: msg.receivedDateTime,
  }));
}
