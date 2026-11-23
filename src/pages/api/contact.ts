export const prerender = false;

import type { APIRoute } from 'astro';
import { parseContact, sendContactEmail } from '../../lib/contact';

// Works with JS (fetch, JSON reply) and without JS (plain POST, redirect back).
export const POST: APIRoute = async ({ request, redirect }) => {
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  const reply = (status: number, error?: string) =>
    wantsJson
      ? new Response(JSON.stringify(error ? { ok: false, error } : { ok: true }), {
          status,
          headers: { 'Content-Type': 'application/json' },
        })
      : redirect(error ? '/contact/?error=1#contact-form' : '/contact/?sent=1#contact-form', 303);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, 'Invalid form submission.');
  }

  const parsed = parseContact(form);
  if (!parsed.ok) {
    if (parsed.spam) return reply(200); // pretend success, drop silently
    return reply(400, parsed.error);
  }

  const result = await sendContactEmail(parsed.data, {
    to: process.env.CONTACT_TO_EMAIL,
    cc: process.env.CONTACT_CC_EMAIL,
  });

  // Trace line for Vercel logs: one per submission, no personal data
  console.log(`[contact] ${result.ok ? 'sent' : `failed:${result.reason}`}`);

  return result.ok
    ? reply(200)
    : reply(502, 'We could not send your message right now. Please email us or call instead.');
};
