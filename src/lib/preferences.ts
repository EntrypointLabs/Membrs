import { createStore } from './store';

/**
 * What membrs remembers on this device. Nothing here leaves the browser; the
 * digest signup is the only thing sent anywhere, through api.subscribe.
 */

export type Theme = 'dark' | 'light';

/** Dark is the default, matching the brand. */
export const themeStore = createStore<Theme>('membrs.theme', 'dark');

/** The city every feed is filtered to. Lagos until the reader picks. */
export const cityStore = createStore<string>('membrs.city', 'Lagos');

export interface Subscription {
  email: string;
  city: string;
}

export const subscriptionStore = createStore<Subscription | null>(
  'membrs.joined',
  null,
);

/** Interests picked for the digest. Three sensible defaults to start. */
export const interestsStore = createStore<string[]>('membrs.interests', [
  'Music',
  'Tech',
  'Grants',
]);

/**
 * Whether the onboarding tour has run. The lite rollout shows it on every
 * visit while the flow is being tested, so this only gates within a session.
 */
export const tourSeenStore = createStore<boolean>(null, false);

export function toggleInterest(name: string): void {
  interestsStore.set((prev) =>
    prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name],
  );
}
