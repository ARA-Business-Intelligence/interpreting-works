import { describe, expect, test } from 'bun:test';
import { buildEmail, parseContact, sendContactEmail } from './contact';

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const valid = { 'first-name': 'Jane', 'last-name': 'Doe', email: 'jane@x.org', organization: 'Yale', message: 'Hi' };

describe('parseContact', () => {
  test('accepts a valid submission and trims', () => {
    const r = parseContact(form({ ...valid, 'first-name': '  Jane ' }));
    expect(r.ok && r.data.firstName).toBe('Jane');
  });
  test('organization is optional', () => {
    expect(parseContact(form({ ...valid, organization: '' })).ok).toBe(true);
  });
  test('rejects missing required fields', () => {
    for (const k of ['first-name', 'last-name', 'email', 'message'])
      expect(parseContact(form({ ...valid, [k]: ' ' })).ok).toBe(false);
  });
  test('rejects bad email', () => {
    expect(parseContact(form({ ...valid, email: 'jane@' })).ok).toBe(false);
  });
  test('rejects oversized message', () => {
    expect(parseContact(form({ ...valid, message: 'a'.repeat(5001) })).ok).toBe(false);
  });
  test('flags honeypot as spam', () => {
    const r = parseContact(form({ ...valid, 'bot-field': 'x' }));
    expect(!r.ok && r.spam).toBe(true);
  });
});

describe('buildEmail', () => {
  test('escapes HTML in user input', () => {
    const r = parseContact(form({ ...valid, message: '<script>x</script>' }));
    if (!r.ok) throw new Error('parse');
    expect(buildEmail(r.data).html).not.toContain('<script>');
  });
});

describe('sendContactEmail', () => {
  const data = (parseContact(form(valid)) as any).data;
  const ok = (body: object, status = 200) => new Response(JSON.stringify(body), { status });

  test('posts to support with Nico in CC and reply-to the sender', async () => {
    let url = '', body: any, headers: any;
    const r = await sendContactEmail(data, {}, (async (u: any, init: any) => {
      url = u; body = JSON.parse(init.body); headers = init.headers;
      return ok({ success: 'true' });
    }) as any);
    expect(r.ok).toBe(true);
    expect(url).toBe('https://formsubmit.co/ajax/support%40interpreting.works');
    expect(body._cc).toBe('nicolas@arabusinessintelligence.com');
    expect(body._replyto).toBe('jane@x.org');
    expect(body.Message).toBe('Hi');
    expect(headers.Referer).toContain('/contact/');
  });
  test('env overrides recipients, empty CC drops it', async () => {
    let url = '', body: any;
    await sendContactEmail(data, { to: 'a@x.com', cc: '' }, (async (u: any, init: any) => {
      url = u; body = JSON.parse(init.body); return ok({ success: 'true' });
    }) as any);
    expect(url).toContain('a%40x.com');
    expect(body._cc).toBeUndefined();
  });
  test('pending activation is reported, not treated as sent', async () => {
    const r = await sendContactEmail(data, {}, (async () => ok({ success: 'false', message: 'This form needs Activation. We\'ve sent you an email' })) as any);
    expect(r).toEqual({ ok: false, reason: 'needs-activation' });
  });
  test('HTTP errors and network failures surface', async () => {
    expect(await sendContactEmail(data, {}, (async () => ok({}, 500)) as any)).toEqual({ ok: false, reason: 'formsubmit-500' });
    expect(await sendContactEmail(data, {}, (async () => { throw new Error('down'); }) as any)).toEqual({ ok: false, reason: 'network' });
  });
});
