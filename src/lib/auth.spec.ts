import { afterEach, describe, expect, it, vi } from 'vitest';
import { normaliseEmail } from './auth';

describe('the email a feature asks for', () => {
  it('is trimmed and lowercased before it is sent', () => {
    expect(normaliseEmail('  Ada@Example.COM ')).toBe('ada@example.com');
  });
});

const issued = () =>
  Promise.resolve(
    new Response(
      JSON.stringify({
        data: {
          accessToken: 'token',
          account: { id: 'a', email: 'ada@example.com', displayName: 'ada' },
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ),
  );

const failed = (status: number) => () =>
  Promise.resolve(
    new Response(
      JSON.stringify({ error: { code: 'x', message: 'something went wrong' } }),
      { status, headers: { 'content-type': 'application/json' } },
    ),
  );

async function signInAgainst(...responses: (() => Promise<Response>)[]) {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE', 'https://api.example');
  vi.useFakeTimers();
  let calls = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      calls++;
      const next = responses.shift();
      return next ? next() : Promise.reject(new Error('unexpected call'));
    }),
  );
  const { startReaderSession } = await import('./auth');
  const outcome = startReaderSession('ada@example.com').then(
    (session) => ({ session, error: null }),
    (error: unknown) => ({ session: null, error }),
  );
  await vi.runAllTimersAsync();
  return { ...(await outcome), calls: () => calls };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('starting a reader session', () => {
  it('rides out a server error without the reader seeing it', async () => {
    const run = await signInAgainst(failed(500), failed(503), issued);
    expect(run.error).toBeNull();
    expect(run.session?.accessToken).toBe('token');
    expect(run.calls()).toBe(3);
  });

  it('rides out a dropped connection', async () => {
    const run = await signInAgainst(
      () => Promise.reject(new TypeError('Failed to fetch')),
      issued,
    );
    expect(run.session?.accessToken).toBe('token');
  });

  it('does not retry an email the server refused', async () => {
    const run = await signInAgainst(failed(400), issued);
    expect(run.error).toBeInstanceOf(Error);
    expect(run.calls()).toBe(1);
  });

  it('gives up after three server errors', async () => {
    const run = await signInAgainst(failed(500), failed(500), failed(500));
    expect(run.error).toBeInstanceOf(Error);
    expect(run.calls()).toBe(3);
  });
});
