// Contact form: validation and email delivery through FormSubmit.

export type ContactInput = {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  message: string;
};

export type ParseResult =
  | { ok: true; data: ContactInput }
  | { ok: false; spam?: true; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { name: 100, email: 200, organization: 200, message: 5000 };

const clean = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');

export function parseContact(form: FormData): ParseResult {
  // Honeypot: real people never see or fill this field
  if (clean(form.get('bot-field'))) return { ok: false, spam: true, error: 'spam' };

  const data: ContactInput = {
    firstName: clean(form.get('first-name')),
    lastName: clean(form.get('last-name')),
    email: clean(form.get('email')),
    organization: clean(form.get('organization')),
    message: clean(form.get('message')),
  };

  if (!data.firstName || !data.lastName || !data.email || !data.message)
    return { ok: false, error: 'Please fill in all required fields.' };
  if (!EMAIL_RE.test(data.email) || data.email.length > LIMITS.email)
    return { ok: false, error: 'Please enter a valid email address.' };
  if (data.firstName.length > LIMITS.name || data.lastName.length > LIMITS.name ||
      data.organization.length > LIMITS.organization || data.message.length > LIMITS.message)
    return { ok: false, error: 'One of the fields is too long.' };

  return { ok: true, data };
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function buildEmail(d: ContactInput) {
  const name = `${d.firstName} ${d.lastName}`;
  const rows: [string, string][] = [
    ['Name', name],
    ['Email', d.email],
    ['Organization', d.organization || '(not provided)'],
  ];
  return {
    subject: `New website message from ${name}${d.organization ? ` (${d.organization})` : ''}`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\n${d.message}`,
    html:
      rows.map(([k, v]) => `<p><strong>${k}:</strong> ${esc(v)}</p>`).join('') +
      `<p style="white-space:pre-wrap">${esc(d.message)}</p>`,
  };
}

// Recipients: messages go to support, Nico gets a copy. Override with CONTACT_TO_EMAIL / CONTACT_CC_EMAIL.
export const DEFAULT_TO = 'support@interpreting.works';
export const DEFAULT_CC = 'nicolas@arabusinessintelligence.com';
export const SITE_URL = 'https://interpreting-works-beta.vercel.app/contact/';

// FormSubmit (formsubmit.co): no account or API key. The first message sends an
// activation email to the TO address; once someone clicks "Activate", it delivers.
export async function sendContactEmail(
  d: ContactInput,
  env: { to?: string; cc?: string; site?: string } = {},
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: boolean; reason?: string }> {
  const to = (env.to || DEFAULT_TO).trim();
  const cc = (env.cc ?? DEFAULT_CC).trim();
  const site = env.site || SITE_URL;
  const mail = buildEmail(d);
  let res: Response;
  try {
    res = await fetchFn(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
      method: 'POST',
      // FormSubmit ties a form to the page it is sent from, so send a stable referer
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Referer: site, Origin: new URL(site).origin },
      body: JSON.stringify({
        _subject: mail.subject,
        _replyto: d.email,
        _template: 'table',
        _captcha: 'false',
        ...(cc ? { _cc: cc } : {}),
        Name: `${d.firstName} ${d.lastName}`,
        Email: d.email,
        Organization: d.organization || '(not provided)',
        Message: d.message,
      }),
    });
  } catch {
    return { ok: false, reason: 'network' };
  }
  const body: any = await res.json().catch(() => ({}));
  if (res.ok && String(body.success) === 'true') return { ok: true };
  const msg = String(body.message || '');
  return { ok: false, reason: /activat/i.test(msg) ? 'needs-activation' : `formsubmit-${res.status}` };
}
