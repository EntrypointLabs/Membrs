import { useSyncExternalStore } from 'react';
import { readStored, writeStored } from './storage';

/**
 * A tiny persisted store: one value, saved to localStorage under `key`, that
 * any component can read with useStore and change with set(). Enough for the
 * handful of preferences membrs keeps on the device, without a state library.
 */
export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<T>(key: string | null, initial: T): Store<T> {
  let value = key ? readStored(key, initial) : initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      value =
        typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
      if (key) writeStored(key, value);
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
