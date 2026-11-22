import {
  authorizedFetch,
  onSignOut,
  sessionStore,
  SignedOutError,
} from './auth';
import { API_BASE } from './config';
import { apiError, dataOf, MembrsApiError, newIdempotencyKey } from './http';
import { createStore } from './store';
import { plural } from './text';

export type Role = 'user' | 'assistant';

export type StepKind = 'thinking' | 'search' | 'open';

export type StepStatus = 'running' | 'done' | 'failed';

export interface AssistantStep {
  id: string;
  kind: StepKind;
  status: StepStatus;
  query?: string;
  listingKind?: 'event' | 'opportunity';
  city?: string;
  resultCount?: number;
  listingId?: string;
  title?: string;
  text?: string;
}

export interface AssistantMessage {
  id: string;
  role: Role;
  content: string;
  listingIds: string[];
  steps?: AssistantStep[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  createdAt: string;
  messages: AssistantMessage[];
}

export interface AssistantLimits {
  conversationsPerDay: number;
  messagesPerConversation: number;
}

export interface Allowance {
  conversationsLeftToday: number;
  messagesLeft: number | null;
}

export interface AssistantSnapshot extends Allowance {
  conversation: Conversation | null;
  limits: AssistantLimits;
}

export interface Started extends Allowance {
  conversation: Conversation;
}

export interface Reply {
  message: AssistantMessage;
  messagesLeft: number;
  conversationsLeftToday: number;
}

export interface SseEvent {
  event: string;
  data: string;
}

export const MAX_MESSAGE_LENGTH = 2000;

export const RETRY_DELAYS_MS = [1000, 3000];

const PATH = '/v1/me/assistant';

export const ASSISTANT_UNAVAILABLE = 'Ask membrs is unavailable right now.';
const FAILED = 'That did not go through. Try again.';
const NO_CHATS = 'No chats left today';
const NO_MESSAGES = 'No messages left in this chat';

export class InterruptedError extends Error {
  constructor() {
    super('The answer was cut off.');
    this.name = 'InterruptedError';
  }
}

function dispatch(event: string, data: string[]): SseEvent {
  return { event: event || 'message', data: data.join('\n') };
}

export async function* readSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event = '';
  let data: string[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = done ? '' : (lines.pop() ?? '');
      for (const raw of lines) {
        const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
        if (line === '') {
          if (data.length) yield dispatch(event, data);
          event = '';
          data = [];
          continue;
        }
        if (line.startsWith(':')) continue;
        const colon = line.indexOf(':');
        const field = colon < 0 ? line : line.slice(0, colon);
        let value = colon < 0 ? '' : line.slice(colon + 1);
        if (value.startsWith(' ')) value = value.slice(1);
        if (field === 'event') event = value;
        else if (field === 'data') data.push(value);
      }
      if (done) break;
    }
    if (data.length) yield dispatch(event, data);
  } finally {
    reader.releaseLock();
  }
}

function networkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    error instanceof InterruptedError ||
    (error instanceof DOMException && error.name === 'TimeoutError')
  );
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

export async function fetchAssistant(): Promise<AssistantSnapshot> {
  return dataOf<AssistantSnapshot>(await authorizedFetch(PATH), FAILED);
}

let conversationKey: string | null = null;

export async function startConversation(): Promise<Started> {
  conversationKey ??= newIdempotencyKey();
  const key = conversationKey;
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await authorizedFetch(`${PATH}/conversations`, {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
      });
    } catch (error) {
      if (!networkFailure(error) || attempt >= RETRY_DELAYS_MS.length)
        throw error;
      await wait(RETRY_DELAYS_MS[attempt]!);
      continue;
    }
    if (res.status < 500) conversationKey = null;
    return dataOf<Started>(res, FAILED);
  }
}

export interface StreamHandlers {
  onText(text: string): void;
  onListings(ids: string[]): void;
  onSteps(steps: AssistantStep[]): void;
}

export function withStep(
  steps: AssistantStep[],
  step: AssistantStep,
): AssistantStep[] {
  const index = steps.findIndex((s) => s.id === step.id);
  if (index < 0) return [...steps, step];
  return steps.map((s, i) => (i === index ? { ...s, ...step } : s));
}

export function withThinking(
  steps: AssistantStep[],
  stepId: string,
  text: string,
): AssistantStep[] {
  const current = steps.find((s) => s.id === stepId);
  return withStep(steps, {
    id: stepId,
    kind: current?.kind ?? 'thinking',
    status: current?.status ?? 'running',
    text: (current?.text ?? '') + text,
  });
}

export function settled(steps: AssistantStep[]): AssistantStep[] {
  return steps.flatMap((step) => {
    if (step.status !== 'running') return [step];
    return step.kind === 'thinking' ? [{ ...step, status: 'done' }] : [];
  });
}

const LISTING_KINDS = { event: 'events', opportunity: 'opportunities' };

export function stepTitle(step: AssistantStep): string {
  const running = step.status === 'running';
  if (step.kind === 'thinking') return running ? 'Thinking' : 'Thought';
  if (step.kind === 'open') {
    if (step.status === 'failed') return 'Could not open';
    return running ? 'Opening' : 'Opened';
  }
  if (step.status === 'failed') return 'Search failed';
  const title = [
    running ? 'Searching' : 'Searched',
    step.listingKind && LISTING_KINDS[step.listingKind],
    step.query && `for ${step.query}`,
    step.city && `in ${step.city}`,
  ]
    .filter(Boolean)
    .join(' ');
  return running || step.resultCount === undefined
    ? title
    : `${title} · ${plural(step.resultCount, 'result')}`;
}

async function streamOnce(
  conversationId: string,
  body: string,
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<Reply> {
  const res = await authorizedFetch(
    `${PATH}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body,
      signal,
    },
  );
  if (!res.ok) throw await apiError(res, FAILED);
  if (res.headers.get('content-type')?.includes('application/json')) {
    const reply = ((await res.json()) as { data: Reply }).data;
    handlers.onText(reply.message.content);
    handlers.onListings(reply.message.listingIds);
    handlers.onSteps(reply.message.steps ?? []);
    return reply;
  }
  if (!res.body) throw new InterruptedError();
  let text = '';
  let steps: AssistantStep[] = [];
  handlers.onText(text);
  handlers.onListings([]);
  handlers.onSteps(steps);
  for await (const { event, data } of readSse(res.body)) {
    const payload = JSON.parse(data) as Record<string, unknown>;
    if (event === 'delta') {
      text += String(payload.text ?? '');
      handlers.onText(text);
    } else if (event === 'step') {
      steps = withStep(steps, payload as unknown as AssistantStep);
      handlers.onSteps(steps);
    } else if (event === 'thinking') {
      steps = withThinking(
        steps,
        String(payload.stepId ?? ''),
        String(payload.text ?? ''),
      );
      handlers.onSteps(steps);
    } else if (event === 'listings') {
      handlers.onListings((payload.ids as string[] | undefined) ?? []);
    } else if (event === 'done') {
      return payload as unknown as Reply;
    } else if (event === 'error') {
      throw new MembrsApiError(
        502,
        String(payload.message ?? FAILED),
        payload.code as string | undefined,
      );
    }
  }
  throw new InterruptedError();
}

export async function sendMessage(
  conversationId: string,
  message: { clientMessageId: string; content: string },
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<Reply> {
  const body = JSON.stringify(message);
  for (let attempt = 0; ; attempt++) {
    try {
      return await streamOnce(conversationId, body, handlers, signal);
    } catch (error) {
      const retry =
        networkFailure(error) ||
        (error instanceof MembrsApiError && error.status === 409);
      if (signal.aborted || !retry || attempt >= RETRY_DELAYS_MS.length)
        throw error;
      await wait(RETRY_DELAYS_MS[attempt]!, signal);
    }
  }
}

export function canSend(
  state: Allowance & { conversation: Conversation | null },
): boolean {
  if (state.conversation) return (state.messagesLeft ?? 1) > 0;
  return state.conversationsLeftToday > 0;
}

export function chatsLeftLine(left: number): string {
  return left > 0 ? `${plural(left, 'chat')} left today` : NO_CHATS;
}

export function messagesLeftLine(left: number | null): string {
  if (left === null) return '';
  return left > 0 ? `${plural(left, 'message')} left` : NO_MESSAGES;
}

export type AssistantStatus =
  'idle' | 'loading' | 'ready' | 'failed' | 'unavailable';

export interface Draft {
  text: string;
  listingIds: string[];
  steps: AssistantStep[];
}

export interface AssistantState extends AssistantSnapshot {
  status: AssistantStatus;
  streaming: Draft | null;
  starting: boolean;
  error: string | null;
}

const INITIAL: AssistantState = {
  status: API_BASE ? 'idle' : 'unavailable',
  conversation: null,
  conversationsLeftToday: 0,
  messagesLeft: null,
  limits: { conversationsPerDay: 3, messagesPerConversation: 3 },
  streaming: null,
  starting: false,
  error: null,
};

export const assistantStore = createStore<AssistantState>(null, INITIAL);

function patch(next: Partial<AssistantState>): void {
  assistantStore.set((prev) => ({ ...prev, ...next }));
}

function failure(error: unknown): Partial<AssistantState> {
  if (error instanceof SignedOutError) return { ...INITIAL };
  if (error instanceof MembrsApiError && error.status === 503)
    return { status: 'unavailable', error: null };
  return {
    error: error instanceof MembrsApiError ? error.message : FAILED,
  };
}

export async function loadAssistant(): Promise<void> {
  const state = assistantStore.get();
  if (!API_BASE) return patch({ status: 'unavailable' });
  if (!sessionStore.get()?.accessToken || state.streaming || state.starting)
    return;
  if (state.status !== 'ready') patch({ status: 'loading', error: null });
  try {
    const snapshot = await fetchAssistant();
    if (assistantStore.get().streaming) return;
    patch({ ...snapshot, status: 'ready', error: null });
  } catch (error) {
    const next = failure(error);
    patch(
      'status' in next || assistantStore.get().status === 'ready'
        ? next
        : { ...next, status: 'failed' },
    );
  }
}

async function syncAllowance(withConversation: boolean): Promise<void> {
  try {
    const snapshot = await fetchAssistant();
    if (assistantStore.get().streaming) return;
    patch(
      withConversation
        ? snapshot
        : {
            conversationsLeftToday: snapshot.conversationsLeftToday,
            messagesLeft: snapshot.messagesLeft,
          },
    );
  } catch {
    return;
  }
}

export async function newChat(): Promise<Conversation | null> {
  const state = assistantStore.get();
  if (state.streaming || state.starting) return null;
  patch({ starting: true, error: null });
  try {
    const started = await startConversation();
    patch({ ...started, starting: false });
    return started.conversation;
  } catch (error) {
    if (error instanceof MembrsApiError && error.status === 429) {
      patch({ starting: false, conversationsLeftToday: 0, error: null });
    } else {
      patch({ ...failure(error), starting: false });
    }
    return null;
  }
}

let controller: AbortController | null = null;

function withMessage(message: AssistantMessage): Partial<AssistantState> {
  const conversation = assistantStore.get().conversation;
  if (!conversation) return {};
  return {
    conversation: {
      ...conversation,
      messages: [...conversation.messages, message],
    },
  };
}

function withoutMessage(id: string): Partial<AssistantState> {
  const conversation = assistantStore.get().conversation;
  if (!conversation) return {};
  return {
    conversation: {
      ...conversation,
      messages: conversation.messages.filter((m) => m.id !== id),
    },
  };
}

function updateDraft(next: Partial<Draft>): void {
  assistantStore.set((prev) =>
    prev.streaming
      ? { ...prev, streaming: { ...prev.streaming, ...next } }
      : prev,
  );
}

export async function ask(input: string): Promise<boolean> {
  const content = input.trim().slice(0, MAX_MESSAGE_LENGTH);
  const state = assistantStore.get();
  if (!content || state.streaming || state.starting || !canSend(state))
    return false;
  const conversation = state.conversation ?? (await newChat());
  if (!conversation) return false;
  const clientMessageId = newIdempotencyKey();
  const own = new AbortController();
  controller = own;
  let received = false;
  patch({
    ...withMessage({
      id: clientMessageId,
      role: 'user',
      content,
      listingIds: [],
      createdAt: new Date().toISOString(),
    }),
    streaming: { text: '', listingIds: [], steps: [] },
    error: null,
  });
  try {
    const reply = await sendMessage(
      conversation.id,
      { clientMessageId, content },
      {
        onText: (text) => {
          if (text) received = true;
          updateDraft({ text });
        },
        onListings: (listingIds) => updateDraft({ listingIds }),
        onSteps: (steps) => updateDraft({ steps }),
      },
      own.signal,
    );
    const draft = assistantStore.get().streaming;
    const message = {
      ...reply.message,
      listingIds: reply.message.listingIds ?? [],
      steps: reply.message.steps ?? settled(draft?.steps ?? []),
    };
    patch({
      ...withMessage(message),
      streaming: null,
      messagesLeft: reply.messagesLeft,
      conversationsLeftToday: reply.conversationsLeftToday,
    });
    return true;
  } catch (error) {
    const draft = assistantStore.get().streaming;
    if (own.signal.aborted) {
      patch({
        ...(draft?.text
          ? withMessage({
              id: `${clientMessageId}:stopped`,
              role: 'assistant',
              content: draft.text,
              listingIds: draft.listingIds,
              steps: settled(draft.steps),
              createdAt: new Date().toISOString(),
            })
          : {}),
        streaming: null,
      });
      void syncAllowance(false);
      return true;
    }
    if (error instanceof MembrsApiError && error.status === 404) {
      patch({
        conversation: null,
        messagesLeft: null,
        streaming: null,
        error: 'This chat has ended. Start a new chat.',
      });
      void syncAllowance(false);
      return false;
    }
    if (error instanceof MembrsApiError && error.status === 429) {
      patch({
        ...withoutMessage(clientMessageId),
        streaming: null,
        messagesLeft: 0,
      });
      return false;
    }
    patch({
      ...(received ? {} : withoutMessage(clientMessageId)),
      ...failure(error),
      streaming: null,
    });
    if (!(error instanceof SignedOutError)) void syncAllowance(true);
    return received;
  } finally {
    if (controller === own) controller = null;
  }
}

export function stop(): void {
  controller?.abort();
}

onSignOut(() => {
  controller?.abort();
  controller = null;
  conversationKey = null;
  assistantStore.reset();
});
