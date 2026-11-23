import { API_BASE, API_TIMEOUT_MS } from './config';

export class MembrsApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'MembrsApiError';
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

export async function apiError(
  res: Response,
  fallback: string,
): Promise<MembrsApiError> {
  const body = (await res.json().catch(() => null)) as ErrorBody | null;
  return new MembrsApiError(
    res.status,
    body?.error?.message ?? fallback,
    body?.error?.code,
  );
}

export async function dataOf<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) throw await apiError(res, fallback);
  return ((await res.json()) as { data: T }).data;
}

export function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('accept')) headers.set('accept', 'application/json');
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(API_TIMEOUT_MS),
  });
}

export async function getJson<T>(
  path: string,
  timeoutMs = API_TIMEOUT_MS,
): Promise<T> {
  const res = await apiFetch(path, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw await apiError(res, `GET ${path} failed`);
  return (await res.json()) as T;
}

export async function getData<T>(path: string): Promise<T> {
  return (await getJson<{ data: T }>(path)).data;
}

export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
