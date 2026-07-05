// lib/resend-contact.ts
// Keeps a Resend Contact in sync with our subscriber state so subscribers
// are visible in the Resend dashboard and available for Broadcasts.
//
// Contacts in Resend are now global entities (no audience_id needed).
// This tries create() first, and falls back to update() if the contact
// already exists (e.g. someone re-subscribing after unsubscribing).
//
// This function never throws. Postgres `subscribers` remains the source
// of truth — a Resend outage or API error should never break the
// subscribe / confirm / unsubscribe flow for the user.
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function syncResendContact(email: string, unsubscribed: boolean): Promise<void> {
  try {
    const { error: createError } = await resend.contacts.create({ email, unsubscribed });
    if (createError) {
      const { error: updateError } = await resend.contacts.update({ email, unsubscribed });
      if (updateError) {
        console.error('resend contact sync error:', updateError.message);
      }
    }
  } catch (err: any) {
    console.error('resend contact sync error:', err.message);
  }
}
