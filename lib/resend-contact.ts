// lib/resend-contact.ts
// Keeps a Resend Contact in sync with our subscriber state so subscribers
// are visible in the Resend dashboard and available for Broadcasts.
//
// Contacts in Resend are global (no audience id). The installed SDK (v4) can only
// address contacts through an audience, so this calls the REST API directly:
// POST /contacts to create, PATCH /contacts/{email} if the contact already exists.
//
// This function never throws. Postgres `subscribers` remains the source
// of truth: a Resend outage or API error never breaks the
// subscribe / confirm / unsubscribe flow for the user.

const API = 'https://api.resend.com';

export async function syncResendContact(email: string, unsubscribed: boolean): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  try {
    const created = await fetch(`${API}/contacts`, {
      method: 'POST', headers, body: JSON.stringify({ email, unsubscribed }), signal: AbortSignal.timeout(8000),
    });
    if (created.ok) return;
    const updated = await fetch(`${API}/contacts/${encodeURIComponent(email)}`, {
      method: 'PATCH', headers, body: JSON.stringify({ unsubscribed }), signal: AbortSignal.timeout(8000),
    });
    if (!updated.ok) console.error('resend contact sync error:', created.status, updated.status, await updated.text().catch(() => ''));
  } catch (err: any) {
    console.error('resend contact sync error:', err?.message || err);
  }
}
