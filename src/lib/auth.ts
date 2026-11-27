import { API_BASE } from './config';
import { clearAllDrafts } from './drafts';
import { isValidEmail } from './email';
import { apiFetch, dataOf } from './http';
import { fieldsStore, interestsStore, subscriptionStore } from './preferences';
import { readStored } from './storage';
import { createStore } from './store';

export interface Account {
  id: string;
  email: string;
  displayName: string;
}

export interface Session {
  at: number;
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  account?: Account;
}

interface IssuedSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  account: Account;
}

const SESSION_KEY = 'membrs.user';

export const sessionStore = createStore<Session | null>(SESSION_KEY, null);

// A session saved without its account predates email-only sessions and cannot
// be refreshed into one, so the reader counts as unknown.
if (sessionStore.get() && !sessionStore.get()?.account) sessionStore.set(null);

/**
 * Whether a feature that needs to know the reader can go ahead without asking
 * for their email. Without an API there is nothing to send, so it never asks.
 */
export function readerKnown(session: Session | null): boolean {
  return !API_BASE || Boolean(session?.accessToken);
}

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export class EmailNotAcceptedError extends Error {
  constructor(message = 'We could not use that email. Please try again.') {
    super(message);
    this.name = 'EmailNotAcceptedError';
  }
}

/**
 * Starts the reader's session from the email a feature asked for. The API
 * signs an existing address back into its account and creates one for a new
 * address; there is nothing to verify.
 */
export async function startReaderSession(value: string): Promise<Session> {
  const email = normaliseEmail(value);
  if (!isValidEmail(email))
    throw new EmailNotAcceptedError('Enter a valid email address.');
  if (!API_BASE) {
    const session = {
      at: Date.now(),
      account: { id: email, email, displayName: email.split('@')[0]! },
    };
    sessionStore.set(session);
    return session;
  }
  const res = await postEmailWithRetries(email);
  const issued = await dataOf<IssuedSession>(
    res,
    new EmailNotAcceptedError().message,
  );
  const session = { at: Date.now(), ...issued };
  sessionStore.set(session);
  return session;
}

const EMAIL_ATTEMPTS = 3;
const EMAIL_RETRY_DELAY_MS = 600;

async function postEmailWithRetries(email: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await apiFetch('/v1/auth/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const failedOnOurSide = !res || res.status >= 500;
    if (!failedOnOurSide || attempt === EMAIL_ATTEMPTS) {
      if (!res) throw new EmailNotAcceptedError();
      return res;
    }
    await new Promise((done) =>
      setTimeout(done, EMAIL_RETRY_DELAY_MS * attempt),
    );
  }
}

export class SignedOutError extends Error {
  constructor() {
    super('Enter your email to continue.');
    this.name = 'SignedOutError';
  }
}

export async function authorizedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = sessionStore.get()?.accessToken;
  if (!API_BASE || !token) throw new SignedOutError();
  const res = await withToken(path, init, token);
  if (res.status !== 401) return res;
  const renewed = await renewAccessToken();
  if (!renewed) throw new SignedOutError();
  return withToken(path, init, renewed);
}

function withToken(path: string, init: RequestInit, token: string) {
  const headers = new Headers(init.headers);
  headers.set('X-Auth-Token', token);
  return apiFetch(path, { ...init, headers });
}

let refreshing: Promise<string | null> | null = null;

function renewAccessToken(): Promise<string | null> {
  refreshing ??= refreshSession().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function refreshSession(): Promise<string | null> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks) return refreshUnderLock();
  return await locks.request('membrs.refresh', refreshUnderLock);
}

async function refreshUnderLock(): Promise<string | null> {
  const held = sessionStore.get();
  const stored = readStored<Session | null>(SESSION_KEY, null);
  if (!held?.refreshToken || !stored?.refreshToken) return null;
  if (stored.refreshToken !== held.refreshToken && stored.accessToken) {
    sessionStore.set(stored);
    return stored.accessToken;
  }
  const res = await apiFetch('/v1/auth/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: stored.refreshToken }),
  }).catch(() => null);
  if (!res?.ok) {
    if (res?.status === 400 || res?.status === 401) sessionStore.set(null);
    return null;
  }
  const issued = ((await res.json()) as { data: IssuedSession }).data;
  const current = sessionStore.get();
  if (!current) return null;
  sessionStore.set({ ...current, ...issued });
  return issued.accessToken;
}

const signOutHooks = new Set<() => void>();

export function onSignOut(hook: () => void): () => void {
  signOutHooks.add(hook);
  return () => signOutHooks.delete(hook);
}

function forgetReader(): void {
  subscriptionStore.set(null);
  interestsStore.reset();
  fieldsStore.reset();
  clearAllDrafts();
  signOutHooks.forEach((hook) => hook());
}

export function forgetEmail(): void {
  const refreshToken = sessionStore.get()?.refreshToken;
  sessionStore.set(null);
  forgetReader();
  if (!API_BASE || !refreshToken) return;
  void apiFetch('/v1/auth/logout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    keepalive: true,
  }).catch(() => undefined);
}
