import { API_BASE, API_TIMEOUT_MS } from './config';
import { clearAllDrafts } from './drafts';
import { apiFetch } from './http';
import { paths } from './router';
import { fieldsStore, interestsStore, subscriptionStore } from './preferences';
import { readStored, removeStored, writeStored } from './storage';
import { createStore } from './store';

export type Provider = 'google' | 'apple';

export interface Account {
  id: string;
  email: string;
  displayName: string;
}

export interface Session {
  provider: Provider;
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

export type SignInOutcome =
  { status: 'signedIn'; provider: Provider } | { status: 'failed' };

const SESSION_KEY = 'membrs.user';
const PENDING_PROVIDER_KEY = 'membrs.pendingProvider';
const RETURN_TO_KEY = 'membrs.returnTo';
export const CALLBACK_PATH = '/auth/callback';

export const sessionStore = createStore<Session | null>(SESSION_KEY, null);

export function oauthStartUrl(provider: Provider): string {
  return `${API_BASE}/v1/auth/oauth/${provider}/start`;
}

async function providerAvailable(provider: Provider): Promise<boolean> {
  try {
    const res = await fetch(oauthStartUrl(provider), {
      redirect: 'manual',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    return (
      res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)
    );
  } catch {
    return false;
  }
}

async function demoSignIn(provider: Provider): Promise<Session> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const session = { provider, at: Date.now() };
  sessionStore.set(session);
  return session;
}

export class SignInUnavailableError extends Error {
  constructor(provider: Provider) {
    super(`${PROVIDER_NAME[provider]} sign-in is not available right now.`);
    this.name = 'SignInUnavailableError';
  }
}

function currentPath(): string {
  return window.location.pathname + window.location.search;
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string') return paths.home();
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return paths.home();
  if (value.split('?')[0] === CALLBACK_PATH) return paths.home();
  return value;
}

export async function signIn(provider: Provider): Promise<Session> {
  if (!API_BASE) return demoSignIn(provider);
  if (!(await providerAvailable(provider)))
    throw new SignInUnavailableError(provider);
  writeStored(PENDING_PROVIDER_KEY, provider);
  writeStored(RETURN_TO_KEY, currentPath());
  window.location.assign(oauthStartUrl(provider));
  return new Promise<Session>(() => {});
}

export async function completeSignIn(): Promise<SignInOutcome | null> {
  if (window.location.pathname !== CALLBACK_PATH) return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const provider = readStored<Provider>(PENDING_PROVIDER_KEY, 'google');
  const returnTo = safeReturnPath(readStored<unknown>(RETURN_TO_KEY, null));
  removeStored(PENDING_PROVIDER_KEY);
  removeStored(RETURN_TO_KEY);
  window.history.replaceState(null, '', returnTo);
  if (!API_BASE || !code) return { status: 'failed' };
  try {
    const res = await apiFetch('/v1/auth/oauth/exchange', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) return { status: 'failed' };
    const issued = ((await res.json()) as { data: IssuedSession }).data;
    sessionStore.set({ provider, at: Date.now(), ...issued });
    return { status: 'signedIn', provider };
  } catch {
    return { status: 'failed' };
  }
}

export class SignedOutError extends Error {
  constructor() {
    super('Sign in to continue.');
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

export function signOut(): void {
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

export const PROVIDER_NAME: Record<Provider, string> = {
  google: 'Google',
  apple: 'Apple',
};
