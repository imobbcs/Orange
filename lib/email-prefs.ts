// Email preferences: which emails a reader gets (weekly digest, alerts, or both), and the
// small page behind the "Manage emails or unsubscribe" link in every email footer.
//
// Why a page and not a one-click GET: mail scanners and some email apps open every link in
// advance, which used to unsubscribe real readers silently. The inbox's own one-click button
// (RFC 8058, a POST with "List-Unsubscribe=One-Click") still unsubscribes instantly.
import type { Pool } from 'pg';

export type Lang = 'en' | 'de';
export type Choice = 'both' | 'digest' | 'alerts' | 'none';

export interface Prefs { wantsDigest: boolean; wantsAlerts: boolean }
export interface PrefRow { email: string; lang: Lang; status: 'pending' | 'confirmed' | 'unsubscribed'; wants_digest: boolean; wants_alerts: boolean; confirmed_at: Date | null }

// ── Schema ──────────────────────────────────────────────────────────────────
// Idempotent and run once per process, before any query that reads the columns.
// Existing readers default to both emails, so nothing changes for them.
let ready: Promise<void> | null = null;
export function ensurePrefColumns(pool: Pool): Promise<void> {
  if (!ready) {
    ready = pool.query(`
      ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS wants_digest BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS wants_alerts BOOLEAN NOT NULL DEFAULT TRUE;
    `).then(() => undefined).catch((e) => { ready = null; throw e; });
  }
  return ready;
}
/** Tests only. */
export function _resetSchemaFlag() { ready = null; }

export function prefsFor(choice: Choice): Prefs {
  return { wantsDigest: choice === 'both' || choice === 'digest', wantsAlerts: choice === 'both' || choice === 'alerts' };
}
export function choiceOf(p: Prefs): Choice {
  return p.wantsDigest && p.wantsAlerts ? 'both' : p.wantsDigest ? 'digest' : p.wantsAlerts ? 'alerts' : 'none';
}
export function parseChoice(v: unknown): Choice | null {
  return v === 'both' || v === 'digest' || v === 'alerts' || v === 'none' ? v : null;
}

/** RFC 8058: the inbox's one-click button POSTs exactly this body. */
export function isOneClick(body: unknown): boolean {
  if (typeof body === 'string') return /(^|&)List-Unsubscribe=One-Click(&|$)/.test(body);
  return !!body && typeof body === 'object' && (body as Record<string, unknown>)['List-Unsubscribe'] === 'One-Click';
}

export async function loadByToken(pool: Pool, token: string): Promise<PrefRow | null> {
  const r = await pool.query<PrefRow>(
    `SELECT email, lang, status, wants_digest, wants_alerts, confirmed_at FROM subscribers WHERE unsubscribe_token = $1`,
    [token]
  );
  return r.rows[0] ?? null;
}

/**
 * Applies a choice. 'none' unsubscribes. Any other choice also turns emails back on for a reader
 * who unsubscribed earlier, but only if they had confirmed once: the token in the link proves they
 * own the address. A reader who never confirmed stays pending.
 */
export async function applyChoice(pool: Pool, token: string, choice: Choice): Promise<PrefRow | null> {
  if (choice === 'none') {
    const r = await pool.query<PrefRow>(
      `UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = NOW()
       WHERE unsubscribe_token = $1
       RETURNING email, lang, status, wants_digest, wants_alerts, confirmed_at`,
      [token]
    );
    return r.rows[0] ?? null;
  }
  const p = prefsFor(choice);
  const r = await pool.query<PrefRow>(
    `UPDATE subscribers
     SET wants_digest = $2, wants_alerts = $3,
         status = CASE WHEN status = 'unsubscribed' AND confirmed_at IS NOT NULL THEN 'confirmed' ELSE status END
     WHERE unsubscribe_token = $1
     RETURNING email, lang, status, wants_digest, wants_alerts, confirmed_at`,
    [token, p.wantsDigest, p.wantsAlerts]
  );
  return r.rows[0] ?? null;
}

// ── Page ────────────────────────────────────────────────────────────────────

/** "imo@example.com" → "i••@example.com": enough to recognise, not enough to leak. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '';
  return user.slice(0, 1) + '•'.repeat(Math.min(Math.max(user.length - 1, 2), 6)) + '@' + domain;
}

const COPY = {
  en: {
    title: 'Your emails', for: 'For', save: 'Save', stopLabel: 'Or stop everything', stop: 'Unsubscribe from all emails',
    options: {
      both:   ['Both', 'The Sunday weather report, plus a short note when Bitcoin moves more than 3% in a day.'],
      digest: ['Sundays only', 'The weekly report. No alerts.'],
      alerts: ['Big moves only', 'Just the short note when Bitcoin moves more than 3% in a day.'],
    },
    saved: { both: 'Saved. You&#39;ll get both emails.', digest: 'Saved. You&#39;ll get the Sunday report only.', alerts: 'Saved. You&#39;ll only hear from me on big moves.' },
    resumed: 'Welcome back. Your emails are on again.',
    outTitle: 'You&#39;re unsubscribed.',
    outBody: 'No more emails from me. Thanks for reading, and good luck stacking.',
    outBack: 'Changed your mind? Pick what you&#39;d like and your emails start again.',
    outBackPending: 'Changed your mind? Sign up again on the site any time.',
    turnOn: 'Turn emails back on',
    pendingNote: 'You haven&#39;t confirmed your address yet, so nothing is sent until you tap the link in the confirmation email.',
    badTitle: 'This link doesn&#39;t work anymore.',
    badBody: 'It may be from an old email. Every newer email has a working link at the bottom.',
    home: 'Go to whentobuybtc.xyz',
    errTitle: 'Something went wrong.', errBody: 'Nothing was changed. Please try again in a minute.',
  },
  de: {
    title: 'Deine E-Mails', for: 'Für', save: 'Speichern', stopLabel: 'Oder alles stoppen', stop: 'Von allen E-Mails abmelden',
    options: {
      both:   ['Beides', 'Der Wetterbericht am Sonntag, plus ein kurzer Hinweis, wenn Bitcoin sich an einem Tag um mehr als 3&nbsp;% bewegt.'],
      digest: ['Nur sonntags', 'Der Wochenbericht. Keine Hinweise.'],
      alerts: ['Nur große Bewegungen', 'Nur der kurze Hinweis, wenn Bitcoin sich an einem Tag um mehr als 3&nbsp;% bewegt.'],
    },
    saved: { both: 'Gespeichert. Du bekommst beide E-Mails.', digest: 'Gespeichert. Du bekommst nur noch den Sonntagsbericht.', alerts: 'Gespeichert. Du hörst nur noch bei großen Bewegungen von mir.' },
    resumed: 'Schön, dass du wieder da bist. Deine E-Mails sind wieder an.',
    outTitle: 'Du bist abgemeldet.',
    outBody: 'Keine E-Mails mehr von mir. Danke fürs Lesen, und viel Erfolg beim Stapeln.',
    outBack: 'Doch anders entschieden? Wähle aus, was du möchtest, und deine E-Mails kommen wieder.',
    outBackPending: 'Doch anders entschieden? Du kannst dich jederzeit auf der Website neu anmelden.',
    turnOn: 'E-Mails wieder einschalten',
    pendingNote: 'Du hast deine Adresse noch nicht bestätigt. Bis du auf den Link in der Bestätigungsmail tippst, wird nichts verschickt.',
    badTitle: 'Dieser Link funktioniert nicht mehr.',
    badBody: 'Er stammt vielleicht aus einer älteren E-Mail. Jede neuere E-Mail hat unten einen funktionierenden Link.',
    home: 'Zu whentobuybtc.xyz',
    errTitle: 'Da ist etwas schiefgelaufen.', errBody: 'Es wurde nichts geändert. Bitte versuch es in einer Minute noch einmal.',
  },
} as const;

export type PageState =
  | { kind: 'manage'; row: PrefRow; token: string; notice?: 'saved' | 'resumed' }
  | { kind: 'invalid' }
  | { kind: 'error' };

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

export function preferencesPage(state: PageState, lang: Lang, action = '/api/unsubscribe'): string {
  const t = COPY[lang];
  const home = lang === 'de' ? 'https://whentobuybtc.xyz/?lang=de' : 'https://whentobuybtc.xyz/';
  let main: string;

  if (state.kind !== 'manage') {
    const [h, p] = state.kind === 'invalid' ? [t.badTitle, t.badBody] : [t.errTitle, t.errBody];
    main = `<h1>${h}</h1><p class="lead">${p}</p><p><a class="home" href="${home}">${t.home} &rarr;</a></p>`;
  } else {
    const { row, token, notice } = state;
    const out = row.status === 'unsubscribed';
    const current: Choice = out ? 'both' : choiceOf({ wantsDigest: row.wants_digest, wantsAlerts: row.wants_alerts });
    const canResume = !out || row.confirmed_at !== null;
    const radios = (['both', 'digest', 'alerts'] as const).map((c) => `
      <label class="opt">
        <input type="radio" name="choice" value="${c}"${c === current ? ' checked' : ''}>
        <span class="box"><b>${t.options[c][0]}</b><span>${t.options[c][1]}</span></span>
      </label>`).join('');
    const tokenField = `<input type="hidden" name="token" value="${esc(token)}">`;
    const choose = `
      <form method="post" action="${action}" class="choose">
        ${tokenField}
        ${radios}
        <button type="submit" class="primary">${out ? t.turnOn : t.save}</button>
      </form>`;

    if (out) {
      main = `
        <h1>${t.outTitle}</h1>
        <p class="lead">${t.outBody}</p>
        <p class="who">${t.for} ${esc(maskEmail(row.email))}</p>
        ${canResume ? `<p class="sub">${t.outBack}</p>${choose}` : `<p class="sub">${t.outBackPending}</p><p><a class="home" href="${home}">${t.home} &rarr;</a></p>`}`;
    } else {
      const msg = notice === 'resumed' ? t.resumed : notice === 'saved' ? t.saved[current === 'none' ? 'both' : current] : '';
      main = `
        <h1>${t.title}</h1>
        <p class="who">${t.for} ${esc(maskEmail(row.email))}</p>
        ${msg ? `<p class="notice" role="status">${msg}</p>` : ''}
        ${row.status === 'pending' ? `<p class="sub">${t.pendingNote}</p>` : ''}
        ${choose}
        <div class="stop">
          <p class="label">${t.stopLabel}</p>
          <form method="post" action="${action}">
            ${tokenField}
            <input type="hidden" name="choice" value="none">
            <button type="submit" class="ghost">${t.stop}</button>
          </form>
        </div>`;
    }
  }

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${t.title} · When to Buy BTC</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{--bg:#09080A;--ink:#EDE8DE;--soft:rgba(237,232,222,.78);--muted:rgba(237,232,222,.6);--line:rgba(237,232,222,.12);--or:#F7931A;
    --title:'Bebas Neue',Impact,sans-serif;--display:'Cormorant Garamond',Georgia,serif;--mono:'DM Mono',ui-monospace,monospace}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--display);-webkit-font-smoothing:antialiased}
  .wrap{max-width:480px;margin:0 auto;padding:28px 16px 56px}
  .brand{display:inline-block;font-family:var(--title);font-size:22px;letter-spacing:.06em;color:var(--ink);text-decoration:none;margin-bottom:40px}
  .brand span{color:var(--or)}
  h1{font-weight:400;font-size:38px;line-height:1.1;margin:0 0 10px}
  .lead{font-size:19px;line-height:1.55;color:var(--soft);margin:0 0 18px}
  .who{font-family:var(--mono);font-size:12px;letter-spacing:.06em;color:var(--muted);margin:0 0 24px}
  .sub{font-size:17px;line-height:1.55;color:var(--soft);margin:0 0 16px}
  .notice{font-family:var(--mono);font-size:13px;line-height:1.6;color:var(--ink);border-left:2px solid var(--or);padding:8px 0 8px 14px;margin:0 0 24px}
  .opt{display:block;margin:0 0 10px;cursor:pointer}
  .opt input{position:absolute;opacity:0;pointer-events:none}
  .box{display:block;border:1px solid var(--line);padding:16px 18px 16px 48px;position:relative;transition:border-color .15s}
  .box:before{content:'';position:absolute;left:18px;top:19px;width:16px;height:16px;border:1px solid var(--muted);border-radius:50%}
  .opt input:checked + .box{border-color:var(--or)}
  .opt input:checked + .box:before{border-color:var(--or);background:radial-gradient(circle,var(--or) 0 4px,transparent 5px)}
  .opt input:focus-visible + .box{outline:2px solid var(--or);outline-offset:2px}
  .box b{display:block;font-family:var(--mono);font-weight:500;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
  .box span{display:block;font-size:17px;line-height:1.5;color:var(--soft)}
  button{font:inherit;cursor:pointer}
  .primary{display:block;width:100%;margin-top:18px;padding:15px;border:0;background:var(--or);color:#09080A;font-family:var(--mono);font-weight:500;font-size:13px;letter-spacing:.1em;text-transform:uppercase}
  .stop{margin-top:44px;padding-top:22px;border-top:1px solid var(--line)}
  .label{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
  .ghost{background:none;border:1px solid var(--line);color:var(--ink);padding:12px 16px;font-family:var(--mono);font-size:12px;letter-spacing:.06em}
  .ghost:hover{border-color:var(--muted)}
  .home{font-family:var(--mono);font-size:13px;letter-spacing:.06em;color:var(--or);text-decoration:none}
</style>
</head>
<body>
<main class="wrap">
  <a class="brand" href="${home}"><span>₿</span> When to Buy BTC</a>
  ${main}
</main>
</body>
</html>`;
}
