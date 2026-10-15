// Backfill loop for Resend Contacts, kept separate from the API route so it can be tested.
// Confirmed → subscribed; anything else passed in → unsubscribed. One contact at a time, paced.
export type BackfillProgress = { total: number; done: number; subscribed: number; unsubscribed: number };

export async function backfillContacts(
  list: { email: string; status: string }[],
  sync: (email: string, unsubscribed: boolean) => Promise<void>,
  progress: BackfillProgress,
  gapMs = 1100,
): Promise<void> {
  for (const { email, status } of list) {
    const unsubscribed = status !== 'confirmed';
    await sync(email, unsubscribed);
    progress.done++;
    if (unsubscribed) progress.unsubscribed++; else progress.subscribed++;
    if (gapMs) await new Promise((r) => setTimeout(r, gapMs));
  }
}
