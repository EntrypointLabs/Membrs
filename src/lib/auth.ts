import { createStore } from './store';

/**
 * Sign-in is Google or Apple only. membrs never sees or stores a password:
 * the provider authenticates the reader and hands back a signed ID token,
 * which the backend verifies. Until the backend exists the session is kept
 * on the device so the flow can be tried end to end.
 */
export type Provider = 'google' | 'apple';

export interface Session {
  provider: Provider;
  at: number;
}

export const sessionStore = createStore<Session | null>('membrs.user', null);

/** Hand off to the provider. Swap the body for Google Identity Services and Sign in with Apple JS. */
export async function signIn(provider: Provider): Promise<Session> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const session = { provider, at: Date.now() };
  sessionStore.set(session);
  return session;
}

export function signOut(): void {
  sessionStore.set(null);
}

export const PROVIDER_NAME: Record<Provider, string> = {
  google: 'Google',
  apple: 'Apple',
};
