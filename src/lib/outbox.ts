import { authorizedFetch, onSignOut, SignedOutError } from './auth';
import { API_BASE } from './config';
import { apiError, MembrsApiError, newIdempotencyKey } from './http';
import { createStore } from './store';
import { toast } from './ui';

export interface PendingWrite {
  key: string;
  slot?: string;
  method: 'POST' | 'PUT';
  path: string;
  body: string;
  attempts?: number;
  retryAt?: number;
}

export const outboxStore = createStore<PendingWrite[]>('membrs.outbox', []);

export const sentSlotsStore = createStore<string[]>(null, []);

export type Delivery = 'sent' | 'queued' | 'signedOut';

type Outcome = Delivery | 'failing' | MembrsApiError;

const RETRYABLE = new Set([401, 408, 425, 429]);

export const MAX_ATTEMPTS = 5;

const BACKOFF_MS = 2000;

const WHAT: Record<string, string> = {
  '/v1/me/contributions': 'your submission',
  '/v1/me/interests': 'your digest picks',
  '/v1/me/newsletter': 'your digest settings',
};

function described(write: PendingWrite): string {
  return WHAT[write.path] ?? 'your change';
}

async function deliver(write: PendingWrite): Promise<Outcome> {
  try {
    const res = await authorizedFetch(write.path, {
      method: write.method,
      headers: {
        'content-type': 'application/json',
        'Idempotency-Key': write.key,
      },
      body: write.body,
    });
    if (res.ok) return 'sent';
    if (res.status >= 500) return 'failing';
    if (RETRYABLE.has(res.status)) return 'queued';
    return await apiError(
      res,
      'That did not go through. Check the details and try again.',
    );
  } catch (error) {
    return error instanceof SignedOutError ? 'signedOut' : 'queued';
  }
}

function slotOf(write: PendingWrite): string {
  return write.slot ?? (write.method === 'PUT' ? write.path : write.key);
}

function settle(write: PendingWrite, outcome: Outcome): void {
  outboxStore.set((prev) => prev.filter((w) => w.key !== write.key));
  if (outcome === 'sent')
    sentSlotsStore.set((prev) => [...new Set([...prev, slotOf(write)])]);
}

export function consumeSent(slot: string): void {
  sentSlotsStore.set((prev) => prev.filter((s) => s !== slot));
}

export function discardSlot(slot: string): void {
  outboxStore.set((prev) => prev.filter((w) => slotOf(w) !== slot));
}

function backOff(write: PendingWrite, now: number): PendingWrite | null {
  const attempts = (write.attempts ?? 0) + 1;
  if (attempts >= MAX_ATTEMPTS) return null;
  const next = {
    ...write,
    attempts,
    retryAt: now + BACKOFF_MS * 2 ** (attempts - 1),
  };
  outboxStore.set((prev) => prev.map((w) => (w.key === write.key ? next : w)));
  return next;
}

function giveUp(write: PendingWrite): void {
  settle(write, 'failing');
  toast(`Could not send ${described(write)}. Try again later.`);
}

function enqueue(
  method: PendingWrite['method'],
  path: string,
  body: string,
  slot: string | undefined,
): PendingWrite {
  const pending = outboxStore.get();
  const replay = pending.find(
    (w) =>
      w.method === method &&
      w.path === path &&
      w.body === body &&
      (slot === undefined || slotOf(w) === slot),
  );
  if (replay) return replay;
  const write: PendingWrite = {
    key: newIdempotencyKey(),
    method,
    path,
    body,
    ...(slot ? { slot } : {}),
  };
  const taken = slot ?? (method === 'PUT' ? path : undefined);
  outboxStore.set([
    ...pending.filter((w) => taken === undefined || slotOf(w) !== taken),
    write,
  ]);
  return write;
}

export async function writeAsReader(
  method: PendingWrite['method'],
  path: string,
  payload: unknown,
  slot?: string,
): Promise<Delivery> {
  if (!API_BASE) return 'sent';
  const write = enqueue(method, path, JSON.stringify(payload), slot);
  const outcome = await deliver(write);
  if (outcome === 'queued' || outcome === 'signedOut') return outcome;
  if (outcome === 'failing') {
    if (backOff(write, Date.now())) {
      scheduleFlush();
      return 'queued';
    }
    settle(write, outcome);
    throw new MembrsApiError(
      503,
      `Could not send ${described(write)}. Try again later.`,
    );
  }
  settle(write, outcome);
  if (outcome !== 'sent') throw outcome;
  return outcome;
}

let flushing: Promise<void> | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

function scheduleFlush(): void {
  const due = outboxStore
    .get()
    .map((w) => w.retryAt ?? 0)
    .filter((at) => at > 0);
  clearTimeout(timer);
  timer = undefined;
  if (!due.length) return;
  const wait = Math.max(0, Math.min(...due) - Date.now());
  timer = setTimeout(() => void flushOutbox(), wait);
}

export function flushOutbox(): Promise<void> {
  return (flushing ??= drain().finally(() => {
    flushing = undefined;
    scheduleFlush();
  }));
}

async function drain(now = Date.now()): Promise<void> {
  if (!API_BASE) return;
  for (const write of outboxStore.get()) {
    if ((write.retryAt ?? 0) > now) continue;
    const outcome = await deliver(write);
    if (outcome === 'queued' || outcome === 'signedOut') return;
    if (outcome === 'failing') {
      if (!backOff(write, now)) giveUp(write);
      continue;
    }
    settle(write, outcome);
    if (outcome instanceof MembrsApiError)
      toast(`Could not send ${described(write)}: ${outcome.message}`);
  }
}

onSignOut(() => {
  clearTimeout(timer);
  timer = undefined;
  outboxStore.set([]);
  sentSlotsStore.set([]);
});
