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
  test('not configured never calls the network', async () => {
    let called = false;
    const r = await sendContactEmail(data, {}, (async () => { called = true; return new Response(); }) as any);
    expect(r).toEqual({ ok: false, reason: 'not-configured' });
    expect(called).toBe(false);
  });
  test('posts to Resend with reply_to and split recipients', async () => {
    let body: any;
    const r = await sendContactEmail(data, { apiKey: 'k', to: 'a@x.com, b@x.com' }, (async (_u: any, init: any) => {
      body = JSON.parse(init.body);
      return new Response('{}', { status: 200 });
    }) as any);
    expect(r.ok).toBe(true);
    expect(body.to).toEqual(['a@x.com', 'b@x.com']);
    expect(body.reply_to).toBe('jane@x.org');
  });
  test('surfaces Resend errors', async () => {
    const r = await sendContactEmail(data, { apiKey: 'k', to: 'a@x.com' }, (async () => new Response('', { status: 403 })) as any);
    expect(r).toEqual({ ok: false, reason: 'resend-403' });
  });
});
