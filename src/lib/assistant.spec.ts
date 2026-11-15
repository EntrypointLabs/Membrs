import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import taxonomyFixture from '../fixtures/taxonomy.json';

const BASE = 'http://api.test/api';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function sse(chunks: string[]): Response {
  return new Response(streamOf(chunks), {
    headers: { 'content-type': 'text/event-stream' },
  });
}

const reply = {
  message: {
    id: 'a1',
    role: 'assistant',
    content: 'Hi there',
    listingIds: ['e1'],
    createdAt: '2026-11-14T10:00:00Z',
  },
  messagesLeft: 8,
  conversationsLeftToday: 2,
};

const answer = [
  'event: delta\ndata: {"text":"Hi"}\n\n',
  'event: listings\ndata: {"ids":["e1"]}\n\n',
  'event: delta\ndata: {"text":" there"}\n\n',
  `event: done\ndata: ${JSON.stringify(reply)}\n\n`,
];

const conversation = {
  id: 'c1',
  createdAt: '2026-11-14T10:00:00Z',
  messages: [],
};

async function live() {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE', BASE);
  const assistant = await import('./assistant');
  const auth = await import('./auth');
  auth.sessionStore.set({ provider: 'google', at: 0, accessToken: 'token' });
  return { assistant, auth };
}

type Call = { url: string; init: RequestInit };

function recordFetch(...responses: (() => Promise<Response>)[]) {
  const calls: Call[] = [];
  const fetch = vi.fn((url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift();
    return next ? next() : Promise.reject(new Error('unexpected call'));
  });
  vi.stubGlobal('fetch', fetch);
  return calls;
}

const header = (call: Call, name: string) =>
  new Headers(call.init.headers).get(name);

const noop = { onText: () => {}, onListings: () => {}, onSteps: () => {} };

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('readSse', () => {
  async function collect(chunks: string[]) {
    const { readSse } = await import('./assistant');
    const events = [];
    for await (const event of readSse(streamOf(chunks))) events.push(event);
    return events;
  }

  it('joins events split across chunk boundaries', async () => {
    const whole = answer.join('');
    const chunks = [3, 9, 17, 40, 41, 90].reduce<string[]>(
      (parts, at, i, cuts) => [...parts, whole.slice(cuts[i - 1] ?? 0, at)],
      [],
    );
    chunks.push(whole.slice(90));
    expect(await collect(chunks)).toEqual([
      { event: 'delta', data: '{"text":"Hi"}' },
      { event: 'listings', data: '{"ids":["e1"]}' },
      { event: 'delta', data: '{"text":" there"}' },
      { event: 'done', data: JSON.stringify(reply) },
    ]);
  });

  it('keeps a multi-byte character split between chunks', async () => {
    const bytes = new TextEncoder().encode('data: {"text":"₦5"}\n\n');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 16));
        controller.enqueue(bytes.slice(16));
        controller.close();
      },
    });
    const { readSse } = await import('./assistant');
    const events = [];
    for await (const event of readSse(stream)) events.push(event);
    expect(events).toEqual([{ event: 'message', data: '{"text":"₦5"}' }]);
  });

  it('handles CRLF, comments and multi-line data', async () => {
    expect(
      await collect([
        ': ping\r\n',
        'event: delta\r\ndata: a\r',
        '\ndata: b\r\n\r\n',
      ]),
    ).toEqual([{ event: 'delta', data: 'a\nb' }]);
  });
});

describe('sendMessage', () => {
  it('streams text and listings, then returns the done payload', async () => {
    const { assistant } = await live();
    recordFetch(() => Promise.resolve(sse(answer)));
    const texts: string[] = [];
    const listings: string[][] = [];
    const done = await assistant.sendMessage(
      'c1',
      { clientMessageId: 'm1', content: 'Hello' },
      {
        ...noop,
        onText: (t) => texts.push(t),
        onListings: (ids) => listings.push(ids),
      },
      new AbortController().signal,
    );
    expect(done).toEqual(reply);
    expect(texts.at(-1)).toBe('Hi there');
    expect(listings.at(-1)).toEqual(['e1']);
  });

  it('updates steps by id and appends thinking deltas', async () => {
    const { assistant } = await live();
    recordFetch(() =>
      Promise.resolve(
        sse([
          'event: step\ndata: {"id":"s1","kind":"thinking","status":"running"}\n\n',
          'event: thinking\ndata: {"stepId":"s1","text":"Looking for"}\n\n',
          'event: thinking\ndata: {"stepId":"s1","text":" scholarships"}\n\n',
          'event: step\ndata: {"id":"s1","kind":"thinking","status":"done"}\n\n',
          'event: step\ndata: {"id":"s2","kind":"search","status":"running","query":"scholarships","listingKind":"opportunity","city":"Lagos"}\n\n',
          'event: step\ndata: {"id":"s2","kind":"search","status":"done","resultCount":8}\n\n',
          ...answer,
        ]),
      ),
    );
    const seen: unknown[] = [];
    await assistant.sendMessage(
      'c1',
      { clientMessageId: 'm1', content: 'Hello' },
      { ...noop, onSteps: (steps) => seen.push(steps) },
      new AbortController().signal,
    );
    expect(seen.at(-1)).toEqual([
      {
        id: 's1',
        kind: 'thinking',
        status: 'done',
        text: 'Looking for scholarships',
      },
      {
        id: 's2',
        kind: 'search',
        status: 'done',
        query: 'scholarships',
        listingKind: 'opportunity',
        city: 'Lagos',
        resultCount: 8,
      },
    ]);
  });

  it('resends the same clientMessageId after a network failure', async () => {
    const { assistant } = await live();
    vi.useFakeTimers();
    const calls = recordFetch(
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.resolve(sse(answer.slice(0, 2))),
      () => Promise.resolve(sse(answer)),
    );
    const sent = assistant.sendMessage(
      'c1',
      { clientMessageId: 'm1', content: 'Hello' },
      noop,
      new AbortController().signal,
    );
    await vi.runAllTimersAsync();
    expect(await sent).toEqual(reply);
    expect(calls).toHaveLength(3);
    const ids = calls.map(
      (c) =>
        (JSON.parse(String(c.init.body)) as { clientMessageId: string })
          .clientMessageId,
    );
    expect(new Set(ids)).toEqual(new Set(['m1']));
    expect(calls[0]!.url).toBe(
      `${BASE}/v1/me/assistant/conversations/c1/messages`,
    );
    expect(header(calls[0]!, 'X-Auth-Token')).toBe('token');
    expect(header(calls[0]!, 'accept')).toBe('text/event-stream');
  });

  it('waits out a 409 while the same message is still in flight', async () => {
    const { assistant } = await live();
    vi.useFakeTimers();
    recordFetch(
      () => Promise.resolve(json({ error: { code: 'in_flight' } }, 409)),
      () => Promise.resolve(sse(answer)),
    );
    const sent = assistant.sendMessage(
      'c1',
      { clientMessageId: 'm1', content: 'Hello' },
      noop,
      new AbortController().signal,
    );
    await vi.runAllTimersAsync();
    expect(await sent).toEqual(reply);
  });

  it('does not retry a rejected message', async () => {
    const { assistant } = await live();
    const calls = recordFetch(() =>
      Promise.resolve(json({ error: { message: 'Too long' } }, 422)),
    );
    await expect(
      assistant.sendMessage(
        'c1',
        { clientMessageId: 'm1', content: 'Hello' },
        noop,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ status: 422, message: 'Too long' });
    expect(calls).toHaveLength(1);
  });

  it('raises a stream error event', async () => {
    const { assistant } = await live();
    recordFetch(() =>
      Promise.resolve(
        sse([
          'event: error\ndata: {"code":"upstream","message":"Try later"}\n\n',
        ]),
      ),
    );
    await expect(
      assistant.sendMessage(
        'c1',
        { clientMessageId: 'm1', content: 'Hello' },
        noop,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'upstream', message: 'Try later' });
  });
});

describe('startConversation', () => {
  it('reuses the idempotency key on retry and mints a new one after', async () => {
    const { assistant } = await live();
    vi.useFakeTimers();
    const started = {
      conversation,
      conversationsLeftToday: 2,
      messagesLeft: 10,
    };
    const calls = recordFetch(
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.resolve(json({ error: {} }, 502)),
      () => Promise.resolve(json({ data: started })),
      () => Promise.resolve(json({ data: started })),
    );
    const first = assistant.startConversation().catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    expect(await first).toMatchObject({ status: 502 });
    expect(await assistant.startConversation()).toEqual(started);
    expect(await assistant.startConversation()).toEqual(started);
    const keys = calls.map((c) => header(c, 'Idempotency-Key'));
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).toBe(keys[0]);
    expect(keys[3]).not.toBe(keys[0]);
  });
});

describe('limits', () => {
  it('describes what is left', async () => {
    const { chatsLeftLine, messagesLeftLine } = await import('./assistant');
    expect(chatsLeftLine(2)).toBe('2 chats left today');
    expect(chatsLeftLine(1)).toBe('1 chat left today');
    expect(chatsLeftLine(0)).toBe('No chats left today');
    expect(messagesLeftLine(7)).toBe('7 messages left');
    expect(messagesLeftLine(0)).toBe('No messages left in this chat');
    expect(messagesLeftLine(null)).toBe('');
  });

  it('allows sending only with room left', async () => {
    const { canSend } = await import('./assistant');
    expect(
      canSend({
        conversation: null,
        conversationsLeftToday: 1,
        messagesLeft: null,
      }),
    ).toBe(true);
    expect(
      canSend({
        conversation: null,
        conversationsLeftToday: 0,
        messagesLeft: null,
      }),
    ).toBe(false);
    expect(
      canSend({ conversation, conversationsLeftToday: 0, messagesLeft: 3 }),
    ).toBe(true);
    expect(
      canSend({ conversation, conversationsLeftToday: 3, messagesLeft: 0 }),
    ).toBe(false);
  });

  it('creates a conversation before the first message, then streams', async () => {
    const { assistant } = await live();
    const calls = recordFetch(
      () =>
        Promise.resolve(
          json({
            data: { conversation, conversationsLeftToday: 2, messagesLeft: 10 },
          }),
        ),
      () => Promise.resolve(sse(answer)),
    );
    assistant.assistantStore.set((s) => ({
      ...s,
      status: 'ready',
      conversationsLeftToday: 3,
    }));
    expect(await assistant.ask('Hello')).toBe(true);
    expect(calls.map((c) => c.url)).toEqual([
      `${BASE}/v1/me/assistant/conversations`,
      `${BASE}/v1/me/assistant/conversations/c1/messages`,
    ]);
    const state = assistant.assistantStore.get();
    expect(state.conversation?.messages.map((m) => m.role)).toEqual([
      'user',
      'assistant',
    ]);
    expect(state.messagesLeft).toBe(8);
    expect(state.streaming).toBeNull();
  });

  it('marks the chat used up on a 429 and keeps the message unsent', async () => {
    const { assistant } = await live();
    recordFetch(() => Promise.resolve(json({ error: { code: 'limit' } }, 429)));
    assistant.assistantStore.set((s) => ({
      ...s,
      status: 'ready',
      conversation,
      messagesLeft: 1,
      conversationsLeftToday: 2,
    }));
    expect(await assistant.ask('Hello')).toBe(false);
    const state = assistant.assistantStore.get();
    expect(state.messagesLeft).toBe(0);
    expect(state.conversation?.messages).toEqual([]);
    expect(assistant.canSend(state)).toBe(false);
  });

  it('shows no chats left when starting one is refused', async () => {
    const { assistant } = await live();
    recordFetch(() => Promise.resolve(json({ error: {} }, 429)));
    assistant.assistantStore.set((s) => ({
      ...s,
      status: 'ready',
      conversationsLeftToday: 1,
    }));
    expect(await assistant.ask('Hello')).toBe(false);
    expect(assistant.assistantStore.get().conversationsLeftToday).toBe(0);
  });
});

describe('steps', () => {
  it('keeps the stored steps from done and tolerates messages without them', async () => {
    const { assistant } = await live();
    const stored = [
      { id: 's1', kind: 'thinking', status: 'done', text: 'Stored' },
    ];
    recordFetch(
      () =>
        Promise.resolve(
          sse([
            'event: step\ndata: {"id":"s1","kind":"thinking","status":"running"}\n\n',
            `event: done\ndata: ${JSON.stringify({
              ...reply,
              message: { ...reply.message, steps: stored },
            })}\n\n`,
          ]),
        ),
      () =>
        Promise.resolve(
          sse([
            'event: step\ndata: {"id":"s9","kind":"search","status":"running"}\n\n',
            'event: step\ndata: {"id":"s8","kind":"thinking","status":"running"}\n\n',
            `event: done\ndata: ${JSON.stringify(reply)}\n\n`,
          ]),
        ),
    );
    assistant.assistantStore.set((s) => ({
      ...s,
      status: 'ready',
      conversation,
      messagesLeft: 5,
    }));
    await assistant.ask('First');
    await assistant.ask('Second');
    const messages = assistant.assistantStore.get().conversation?.messages;
    expect(messages?.[1]?.steps).toEqual(stored);
    expect(messages?.[3]?.steps).toEqual([
      { id: 's8', kind: 'thinking', status: 'done' },
    ]);
  });

  it('titles each step', async () => {
    const { stepTitle } = await import('./assistant');
    const search = {
      id: 's',
      kind: 'search',
      query: 'scholarships',
      listingKind: 'opportunity',
      city: 'Lagos',
    } as const;
    expect(stepTitle({ ...search, status: 'running' })).toBe(
      'Searching opportunities for scholarships in Lagos',
    );
    expect(stepTitle({ ...search, status: 'done', resultCount: 8 })).toBe(
      'Searched opportunities for scholarships in Lagos · 8 results',
    );
    expect(
      stepTitle({ id: 's', kind: 'search', status: 'done', resultCount: 1 }),
    ).toBe('Searched · 1 result');
    expect(
      stepTitle({ id: 's', kind: 'search', status: 'done', city: 'Abuja' }),
    ).toBe('Searched in Abuja');
    expect(stepTitle({ ...search, status: 'failed' })).toBe('Search failed');
    expect(stepTitle({ id: 't', kind: 'thinking', status: 'running' })).toBe(
      'Thinking',
    );
    expect(stepTitle({ id: 't', kind: 'thinking', status: 'done' })).toBe(
      'Thought',
    );
    expect(stepTitle({ id: 'o', kind: 'open', status: 'running' })).toBe(
      'Opening',
    );
    expect(stepTitle({ id: 'o', kind: 'open', status: 'done' })).toBe('Opened');
  });
});

describe('suggestions', () => {
  it('builds chips from interests and city', async () => {
    const { suggestions } = await import('./assistant');
    expect(
      suggestions(
        ['Tech', 'Scholarships'],
        'Lagos',
        taxonomyFixture.onboardingInterests,
      ),
    ).toEqual([
      'Tech events in Lagos this week',
      'Scholarships closing this month',
      "What's on in Lagos this weekend",
      'Free events in Lagos this week',
    ]);
  });

  it('never repeats a chip', async () => {
    const { suggestions } = await import('./assistant');
    const chips = suggestions(
      ['Scholarships'],
      'Accra',
      taxonomyFixture.onboardingInterests,
    );
    expect(chips).toHaveLength(4);
    expect(new Set(chips).size).toBe(4);
  });
});
