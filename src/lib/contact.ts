// Contact form: validation and email delivery (Resend REST API, no SDK).
// Env: RESEND_API_KEY, CONTACT_TO_EMAIL (comma separated), optional CONTACT_FROM_EMAIL.

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

export async function sendContactEmail(
  d: ContactInput,
  env: { apiKey?: string; to?: string; from?: string },
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: boolean; reason?: string }> {
  if (!env.apiKey || !env.to) return { ok: false, reason: 'not-configured' };
  const mail = buildEmail(d);
  const res = await fetchFn('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.from || 'interpretingWorks Website <onboarding@resend.dev>',
      to: env.to.split(',').map((s) => s.trim()).filter(Boolean),
      reply_to: d.email,
      ...mail,
    }),
  });
  return res.ok ? { ok: true } : { ok: false, reason: `resend-${res.status}` };
}
