import { useEffect, useRef, useSyncExternalStore } from 'react';
import { API_BASE, CATALOGUE_TIMEOUT_MS } from './config';
import { getPreloadedJson, MembrsApiError } from './http';

export type ResourceStatus = 'loading' | 'ready' | 'failed';

interface Resource {
  status: ResourceStatus;
  data?: unknown;
  loadedAt?: number;
  loading?: Promise<void>;
  notFound?: boolean;
}

export const RETRY_DELAYS_MS: readonly number[] = [1000, 3000, 9000];

const KEPT_RESOURCES = 200;

const FRESH_FOR_MS = 5 * 60_000;

const resources = new Map<string, Resource>();
const listeners = new Set<() => void>();
let version = 0;

function changed(): void {
  version++;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function worthRetrying(error: unknown): boolean {
  return !(
    error instanceof MembrsApiError &&
    error.status < 500 &&
    error.status !== 429
  );
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function fetchWithRetries<T>(
  path: string,
  retryDelays: readonly number[],
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return (await getPreloadedJson<{ data: T }>(path, CATALOGUE_TIMEOUT_MS))
        .data;
    } catch (error) {
      const delay = retryDelays[attempt];
      if (delay === undefined || !worthRetrying(error)) throw error;
      await wait(delay);
    }
  }
}

function forgetOldest(): void {
  while (resources.size > KEPT_RESOURCES) {
    const oldest = resources.keys().next().value;
    if (oldest === undefined) return;
    resources.delete(oldest);
  }
}

type Settled = (status: ResourceStatus) => void;

let onSettled: Settled = () => undefined;

export function watchResources(settled: Settled): void {
  onSettled = settled;
}

let prepare: (data: unknown) => unknown = (data) => data;

export function rememberResponses(prepared: (data: unknown) => unknown): void {
  prepare = prepared;
}

export function loadResource<T>(
  path: string,
  retryDelays: readonly number[] = RETRY_DELAYS_MS,
): Promise<T> {
  if (!API_BASE) return Promise.reject(new Error('No API is configured'));
  const known = resources.get(path);
  if (known?.status === 'ready') {
    resources.delete(path);
    resources.set(path, known);
    return Promise.resolve(known.data as T);
  }
  if (known?.loading) return known.loading.then(() => readResource<T>(path));
  const resource: Resource = { status: 'loading' };
  resource.loading = fetchWithRetries<T>(path, retryDelays).then(
    (data) => {
      resources.set(path, {
        status: 'ready',
        data: prepare(data),
        loadedAt: Date.now(),
      });
      onSettled('ready');
      changed();
    },
    (error: unknown) => {
      const notFound = error instanceof MembrsApiError && error.status === 404;
      resources.set(path, { status: 'failed', notFound });
      onSettled(notFound ? 'ready' : 'failed');
      changed();
    },
  );
  resources.set(path, resource);
  forgetOldest();
  changed();
  return resource.loading.then(() => readResource<T>(path));
}

function readResource<T>(path: string): T {
  const settled = resources.get(path);
  if (settled?.status === 'ready') return settled.data as T;
  throw new Error(`Could not load ${path}`);
}

function revalidate(path: string): void {
  const known = resources.get(path);
  if (known?.status !== 'ready' || known.loading) return;
  if (Date.now() - (known.loadedAt ?? 0) < FRESH_FOR_MS) return;
  known.loading = fetchWithRetries(path, []).then(
    (data) => {
      resources.set(path, {
        status: 'ready',
        data: prepare(data),
        loadedAt: Date.now(),
      });
      changed();
    },
    () => {
      known.loading = undefined;
    },
  );
}

export function retryResource(path: string): void {
  resources.delete(path);
  void loadResource(path).catch(() => undefined);
}

export interface Remote<T> {
  status: ResourceStatus;
  data: T | undefined;
  stale: boolean;
  notFound: boolean;
  shownPath: string | null;
  retry: () => void;
}

export function useResource<T>(
  path: string | null,
  keepPrevious = false,
): Remote<T> {
  useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
  const shown = useRef<{ path: string; data: T } | undefined>(undefined);
  const missing = path !== null && !resources.has(path);
  useEffect(() => {
    if (!path || !API_BASE) return;
    revalidate(path);
    void loadResource(path).catch(() => undefined);
  }, [path, missing]);
  const retry = () => path && retryResource(path);
  if (!path || !API_BASE)
    return {
      status: 'ready',
      data: undefined,
      stale: false,
      notFound: false,
      shownPath: null,
      retry,
    };
  const resource = resources.get(path);
  if (resource?.status === 'ready') {
    shown.current = { path, data: resource.data as T };
    return {
      status: 'ready',
      data: resource.data as T,
      stale: false,
      notFound: false,
      shownPath: path,
      retry,
    };
  }
  const status = resource?.status ?? 'loading';
  if (keepPrevious && shown.current !== undefined && status === 'loading')
    return {
      status: 'ready',
      data: shown.current.data,
      stale: true,
      notFound: false,
      shownPath: shown.current.path,
      retry,
    };
  return {
    status,
    data: undefined,
    stale: false,
    notFound: resource?.notFound ?? false,
    shownPath: null,
    retry,
  };
}
