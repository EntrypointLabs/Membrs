import { createStore } from './store';

const VIEWED_LIMIT = 20;

export const viewedStore = createStore<string[]>('membrs.viewed', []);

export function rememberViewed(id: string): void {
  if (!id) return;
  viewedStore.set((prev) =>
    [
      id,
      ...(Array.isArray(prev) ? prev : []).filter((seen) => seen !== id),
    ].slice(0, VIEWED_LIMIT),
  );
}
