// Weekly backup of the subscriber list: the whole `subscribers` table as CSV, emailed to the owner.
// The list is the project's main asset; this is a second copy next to Railway's own database backups.
// The repo is public, so the copy goes to the owner's inbox, never to a GitHub artifact.

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;              // spreadsheet apps would run these as formulas
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with a header row; column order follows the first row (the table's own column order). */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  return [cols.map(cell).join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n') + '\r\n';
}

export function backupSummary(rows: { status?: unknown }[]) {
  const by = (s: string) => rows.filter((r) => r.status === s).length;
  return { total: rows.length, confirmed: by('confirmed'), pending: by('pending'), unsubscribed: by('unsubscribed') };
}
